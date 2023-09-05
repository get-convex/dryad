import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sync: defineTable({
    commit: v.union(v.null(), v.string()),
    commitDone: v.boolean(),
  }),
  files: defineTable({
    path: v.string(),
    language: v.string(),
    fileSha: v.string(),
    treeSha: v.string(),
  })
    .index("path", ["path"])
    .index("treeSha", ["treeSha"]),
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
  settings: defineTable({
    org: v.string(),
    repo: v.string(),
    branch: v.string(),
    extensions: v.array(v.string()),
    exclusions: v.optional(v.array(v.string())),
    byteLimit: v.optional(v.number()),
    chatModel: v.optional(v.string()),
  }),
});
