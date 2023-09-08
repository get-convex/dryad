/** Our Convex schema definitions. */
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Sync state -- what commit are we work on, or are we in sync with?
  sync: defineTable({
    commit: v.union(v.null(), v.string()),
    commitDone: v.boolean(),
  }),
  // All files in the tree.
  files: defineTable({
    path: v.string(),
    language: v.string(),
    fileSha: v.string(),
    treeSha: v.string(),
  })
    .index("path", ["path"])
    .index("treeSha", ["treeSha"]),
  // Goals associated with the files as determined by ChatGPT
  fileGoals: defineTable({
    fileId: v.id("files"),
    vector: v.array(v.float64()),
    goal: v.string(),
  })
    .index("fileId", ["fileId"])
    .vectorIndex("by_embedding", {
      vectorField: "vector",
      dimensions: 1536,
    }),
  // Various project settings you can tweak in the dashboard as we go.
  settings: defineTable({
    org: v.string(),
    repo: v.string(),
    branch: v.string(),
    extensions: v.array(v.string()),
    exclusions: v.optional(v.array(v.string())),
    byteLimit: v.optional(v.number()),
    chatModel: v.optional(v.string()),
  }),
  // Log of all sync and indexing operations.
  log: defineTable({
    cursor: v.number(),
    operator: v.union(
      v.literal("add"),
      v.literal("cleanup"),
      v.literal("start"),
      v.literal("finish"),
    ),
    path: v.optional(v.string()),
    sha: v.string(),
  }).index("cursor", ["cursor"]),
});
