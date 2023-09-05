/** Model management for file and file goal state.
 *
 * These functions abstract the transactional model for how we
 * update and delete file contents as the repository changes, and how
 * we relationally associate goals (and their embeddings) with the
 * file that generated them.
 */
import { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "./_generated/server";
import { writeLog } from "./log";

/** Given a source code file at `path`, check to see if we've
 * already indexed it with sha `fileSha`.
 *
 * If so, we'll return `false` and update the file's `treeSha`
 * to the provided one to mark it still in the current snapshot.
 *
 * If not, we'll return `true`, telling the crawler to re-download
 * and re-index the newer file contents.
 */
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

/** Delete the file with id = `id` and also delete all associated goals and
 * embeddings.
 */
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

/** Add the given file at `path` with summarized `goals` and embeddings
 * in `vectors` to our database. The file was fetched as part of the
 * tree snapshot at `treeSha`, and was inferred to be in programming
 * language `language`.
 */
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

/** Grab a batch of any files in the database at any commit not
 * equal to the given `commit`. Recursively delete them so they're
 * no longer searchable.
 */
export const clearDeadFiles = internalMutation({
  args: {
    commit: v.string(),
  },
  handler: async (ctx, args) => {
    const syncState = await ctx.db.query("sync").unique();
    if (syncState!.commitDone || syncState!.commit !== args.commit) {
      return;
    }

    // A little ugly two pass thing. Convex doesn't have a great way
    // to do "not equals" on an index, so we just fetch records less than
    // and then greater than the specific valid value (the current commit
    // hash.
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
    // If we *still* don't have anything to clean up, we're done
    // and only valid files are left in the search index for the
    // given commit.
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

/** Grab the goal provided by `id` and information about its
 * associated file.
 * 
 * This is used to fetch a search result, where a query has
 * had a match with a particular embedding associated with a goal.
 * */
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
