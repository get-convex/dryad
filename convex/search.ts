import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateEmbedding } from "./ai";
import { internal } from "./_generated/api";

export type SearchResult = {
  path: string;
  language: string;
  goal: string;
  score: number;
};

export const search = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args): Promise<SearchResult[]> => {
    const embedding = await generateEmbedding(args.query);
    const results = await ctx.vectorSearch("fileGoals", "by_embedding", {
      vector: embedding,
      limit: 30,
    });

    const seenDocuments = new Set();
    const docs = [];

    for (const r of results) {
      if (seenDocuments.has(r._id)) {
        continue;
      }

      const searchInfo = await ctx.runQuery(internal.files.getGoalAndFile, {
        id: r._id,
      });
      // Timing / race issue between vector search and backing database?
      if (searchInfo === null) {
        continue;
      }
      const fullSearchInfo = Object.assign(searchInfo, {
        score: r._score,
      }) as SearchResult;

      seenDocuments.add(r._id);
      docs.push(fullSearchInfo);
      if (seenDocuments.size === 10) {
        break;
      }
    }
    return docs;
  },
});
