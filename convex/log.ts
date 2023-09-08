/** Represent the simple history of operation logs.
 *
 * These are used to display sync progress in the app.
 */
import { MutationCtx, query } from "./_generated/server";

/** Get the last 30 log entries. */
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

/** Write a new log entry out. "add" and "cleanup" have an associated path
 * and file checksum. "start" and "finish" are only repo-level, and so the
 *  sha is for the whole tree. */
export const writeLog = async (
  ctx: MutationCtx,
  operator: "add" | "cleanup" | "finish" | "start",
  sha: string,
  path?: string,
) => {
  // Cursor is monotonically increasing, so we need to grab the maximum value
  // and we'll increment by one.
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
