"use node";
import OpenAI from "openai";

export async function summarize(path: string, body: string): Promise<string> {
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
    model: "gpt-4",
  });
  return completion.choices[0].message.content!;
}

export async function generateEmbeddings(
  fragments: string[]
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

export async function generateEmbedding(fragment: string): Promise<number[]> {
  return (await generateEmbeddings([fragment]))[0];
}
