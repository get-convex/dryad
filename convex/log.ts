import { MutationCtx, query } from "./_generated/server";

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

export const writeLog = async (
  ctx: MutationCtx,
  operator: "add" | "cleanup" | "finish" | "start",
  sha: string,
  path?: string
) => {
  const lastEntry =
    (await ctx.db.query("log").withIndex("cursor").order("desc").first())
      ?.cursor ?? 0;
  await ctx.db.insert("log", {
    cursor: lastEntry + 1,
    sha: sha,
    operator,
    path,
  });
};
