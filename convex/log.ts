import { query } from "./_generated/server";

export const get = query({
  handler: async (ctx) => {
    const entries = await ctx.db
      .query("log")
      .withIndex("cursor")
      .order("desc")
      .take(30);
    return entries;
  },
});
