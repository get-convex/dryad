/** Search API for use by the web app. */
import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateEmbedding } from "./ai";
import { internal } from "./_generated/api";

export type SearchResult = {
  path: string;
  language: string;
  goal: string;
  score: number;
  treeSha: string;
};

/** Conduct a search.
 *
 * Generate an embedding from `query` and then use the vector index
 * on our goals to find source files that are likely to help.
 */
export const search = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args): Promise<SearchResult[]> => {
    const embedding = await generateEmbedding(args.query);
    // We're going to grab 30 goals even though we're only returning
    // up to 10 results.
    // Why?
    // Well, it's possible (even likely!) for the same file to be matched
    // several times for a given query string if the file has similar goals.
    // We'll just return the file once with the "top" goal as the rationale.
    // Second, and more subtly: for performance reasons, vector search is not
    // transactionally consistent with the database's document. So it's possible
    // for background indexing to delete a file right after we get the id
    // in a search result. So not all files will exist when we go fetch them.
    const results = await ctx.vectorSearch("fileGoals", "by_embedding", {
      vector: embedding,
      limit: 30,
    });

    // De-duplicate the same document.
    const seenDocuments = new Set();
    const docs = [];

    for (const r of results) {
      // Skip this document, we're already including it in the result.
      if (seenDocuments.has(r._id)) {
        continue;
      }

      // Go get the file info and goal text, etc, for the given goal id.
      const searchInfo = await ctx.runQuery(internal.files.getGoalAndFile, {
        id: r._id,
      });

      // Timing / race issue between vector search and backing database?
      // The document no longer exists. Oh well, we'll just keep moving.
      if (searchInfo === null) {
        continue;
      }
      // Add the score to the result coming back from our query.
      const fullSearchInfo = Object.assign(searchInfo, {
        score: r._score,
      }) as SearchResult;

      // Add this document to the result set and bail if we have enough.
      seenDocuments.add(r._id);
      docs.push(fullSearchInfo);
      if (seenDocuments.size === 10) {
        break;
      }
    }
    return docs;
  },
});
