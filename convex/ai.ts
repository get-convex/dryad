/**
 * Calls to OpenAI for summarization and embedding.
 */
"use node";
import OpenAI from "openai";
import { Doc } from "./_generated/dataModel";

const DEFAULT_MODEL = "gpt-4";

/** Given a file at `path` and a file contents of `body`, provide a summary of
 * the high-level goals of the source code file.
 */
export async function summarize(
  settings: Doc<"settings">,
  path: string,
  body: string,
): Promise<string> {
  // This prompt could use a lot of iteration. In general, this version of asking
  // for the response in JSON format is pretty reliable.

  // We ask for the "main goals" of the file so that we get thematic extractions
  // that are likely to be semantically adjacent to questions a user might ask about
  // where to find particular code that does X, Y, or Z.
  const prompt = `
Please provide a list of the main goals
of the following computer source code file. This code comes from a file
called '${path}'. 

Without any comment, return your answer in the following ECMA-404 compliant JSON format:
{"programming_language":"Rust","goals":["Authenticate users","Validate JWT payloads","Ensure strong passwords"]}

The body of the file follows the delimeter "---".

---
${body}
`;
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: settings.chatModel ?? DEFAULT_MODEL,
  });
  return completion.choices[0].message.content!;
}

/** Use OpenAI to generate N vector embeddings for the given array of N strings.
 *
 * We'll put these into a vector index so we can quickly calculate cosine similarity
 * with embeddings generated from user-provided prompts.
 */
export async function generateEmbeddings(
  fragments: string[],
): Promise<number[][]> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const embedding = await openai.embeddings.create({
    input: fragments,
    model: "text-embedding-ada-002",
  });
  const vectors = embedding.data.map((e) => e.embedding);
  return vectors;
}

/** Helper function to generate just a single embedding.
 *
 * Wraps the more full featured function `generateEmbeddings`.
 */
export async function generateEmbedding(fragment: string): Promise<number[]> {
  return (await generateEmbeddings([fragment]))[0];
}
