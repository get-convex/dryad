import { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "./_generated/server";
import { writeLog } from "./log";

export const checkPending = internalMutation({
  args: {
    path: v.string(),
    fileSha: v.string(),
    treeSha: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const fileData = await ctx.db
      .query("files")
      .withIndex("path", (q) => q.eq("path", args.path))
      .first();
    if (fileData === null) {
      return true; // No file yet? go ahead and run it.
    }
    if (args.fileSha !== fileData!.fileSha) {
      return true;
    }
    // Otherwise... same file. If this is a new commit, just mark it current.
    if (args.treeSha !== fileData.treeSha) {
      await ctx.db.patch(fileData._id, {
        treeSha: args.treeSha,
      });
    }

    return false;
  },
});

async function recursiveDeleteFile(ctx: MutationCtx, id: Id<"files">) {
  const oldFile = await ctx.db.get(id);
  await ctx.db.delete(id);
  const goals = await ctx.db
    .query("fileGoals")
    .withIndex("fileId", (q) => q.eq("fileId", id))
    .collect();
  for (const goal of goals) {
    await ctx.db.delete(goal._id);
  }
  await writeLog(ctx, "cleanup", oldFile!.fileSha, oldFile!.path);
}

export const index = internalMutation({
  args: {
    path: v.string(),
    fileSha: v.string(),
    treeSha: v.string(),
    goals: v.array(v.string()),
    vectors: v.array(v.array(v.number())),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Delete existing record if it exists.
    const existing = await ctx.db
      .query("files")
      .withIndex("path", (q) => q.eq("path", args.path))
      .first();
    if (existing !== null) {
      await recursiveDeleteFile(ctx, existing._id);
    }

    // 2. Insert new file record.
    const newFile = await ctx.db.insert("files", {
      path: args.path,
      fileSha: args.fileSha,
      treeSha: args.treeSha,
      language: args.language,
    });
    for (let i = 0; i < args.vectors.length; i++) {
      await ctx.db.insert("fileGoals", {
        fileId: newFile,
        goal: args.goals[i],
        vector: args.vectors[i],
      });
    }

    // 3. Log
    await writeLog(ctx, "add", args.fileSha, args.path);
  },
});

export const clearDeadFiles = internalMutation({
  args: {
    commit: v.string(),
  },
  handler: async (ctx, args) => {
    const syncState = await ctx.db.query("sync").unique();
    if (syncState!.commitDone || syncState!.commit !== args.commit) {
      return;
    }

    let batch = await ctx.db
      .query("files")
      .withIndex("treeSha", (q) => q.lt("treeSha", args.commit))
      .take(10);
    if (batch.length === 0) {
      batch = await ctx.db
        .query("files")
        .withIndex("treeSha", (q) => q.gt("treeSha", args.commit))
        .take(10);
    }
    if (batch.length === 0) {
      // We're done cleaning up other entries!
      await ctx.db.patch(syncState!._id, {
        commitDone: true,
      });
      await writeLog(ctx, "finish", args.commit);
      return false; // no more work to do.
    } else {
      for (const f of batch) {
        await recursiveDeleteFile(ctx, f._id);
      }
      return true; // possibly more work to do.
    }
  },
});

export const getGoalAndFile = internalQuery({
  args: {
    id: v.id("fileGoals"),
  },
  handler: async (ctx, args) => {
    const fg = await ctx.db.get(args.id);
    if (!fg) {
      return null;
    }
    const f = await ctx.db.get(fg!.fileId);
    return {
      path: f!.path,
      language: f!.language,
      goal: fg.goal,
      treeSha: f!.treeSha,
    };
  },
});
