/** The sync state model is all about keeping track of this cycle:
 *
 *  1. No commit yet
 *  2. Working on first commit.
 *  3. Done with first commit.
 *  Forever:
 *    4. Poll for next commit.
 *    5. Work on next commit.
 *    6. Done with next commit.
 */
import { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { writeLog } from "./log";

/** Return the current sync state. */
export const get = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"sync">> => {
    return (await ctx.db.query("sync").first())!;
  },
});

/** We've discovered a new commit. Let's start working on it.
 *
 * This means commit = <new commit> and commitDone = false.
 */
export const startCommit = internalMutation({
  args: {
    commit: v.string(),
  },
  handler: async (ctx, args) => {
    const id = (await ctx.db.query("sync").first())!._id;
    await ctx.db.patch(id, {
      commit: args.commit,
      commitDone: false,
    });
    await writeLog(ctx, "start", args.commit);
  },
});

/** Reset the sync state back to an "initial sync" one. This is useful
 * to force re-indexing, and it also creates the necessary starting
 * record when you first launch dryad.
 */
export const init = internalMutation({
  handler: async (ctx) => {
    const old = await ctx.db.query("sync").first();
    if (old !== null) {
      await ctx.db.delete(old._id);
    }
    await ctx.db.insert("sync", {
      commit: null,
      commitDone: true,
    });
    const settings = await ctx.db.query("settings").first();
    if (settings === null) {
      await ctx.db.insert("settings", {
        org: "get-convex",
        repo: "convex-helpers",
        branch: "main",
        extensions: [".js", ".html", ".jsx", ".ts", ".tsx", ".css"],
      });
    }
  },
});
