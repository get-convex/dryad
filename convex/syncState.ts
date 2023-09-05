import { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const get = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"sync">> => {
    return (await ctx.db.query("sync").first())!;
  },
});

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
    const lastEntry = (await ctx.db.query("log").withIndex("cursor").order("desc").first())?.cursor ?? 0;
    await ctx.db.insert("log", {
      cursor: lastEntry + 1,
      sha: args.commit,
      operator: "start",
    });
  },
});

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
