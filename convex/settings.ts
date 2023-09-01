import { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";

export const get = query({
  handler: async ({ db }): Promise<Doc<"settings"> | null> => {
    return await db.query("settings").first();
  },
});
