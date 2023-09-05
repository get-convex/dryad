/** Project settings. Mostly hand-edited in the dashboard.  */
import { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";

/** Return the project settings to whoever cares (the browser, for example). */
export const get = query({
  handler: async ({ db }): Promise<Doc<"settings"> | null> => {
    return await db.query("settings").first();
  },
});
