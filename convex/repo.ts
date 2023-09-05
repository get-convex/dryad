"use node";
import { Octokit } from "@octokit/rest";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { ActionCtx } from "./_generated/server";
import { generateEmbeddings, summarize } from "./ai";

// Don't attempt to process single files larger than this until
// access to gpt-4-32k is commonly available.
// A more precise way to do this would be to use tiktoken and calculate
// the true number of tokens for the specific model, but ¯\_(ツ)_/¯
const DEFAULT_BYTE_LIMIT = 24000;

export const sync = internalAction({
  args: {},
  handler: async (ctx) => {
    // 0. Settings
    const settings = await ctx.runQuery(api.settings.get);
    if (!settings) {
      console.log(
        "Please establish the 'settings' table. Call syncState:init to get initial working values",
      );
      throw "no settings";
    }
    // 1. Load sync state
    let syncState = await ctx.runQuery(internal.syncState.get);
    if (syncState.commitDone) {
      const commit = await getHeadCommit(settings);
      if (syncState.commit === commit) {
        console.log("No new commits. Skipping pass.");
        return;
      }
      await ctx.runMutation(internal.syncState.startCommit, {
        commit,
      });
      syncState = await ctx.runQuery(internal.syncState.get);
    }

    // 2. Let's make progress on current file contents and indexing
    // one batch at a time until we're done.
    console.log("Still work to do in current batch");
    const done = await indexCurrentFiles(settings, ctx, syncState);
    if (!done) {
      console.log("Batch done; ending action and running again momentarily.");
      await ctx.scheduler.runAfter(0, internal.repo.sync);
      return;
    } else {
      console.log("Batch finished");
    }

    // 3. All current file contents are marked and indexed.
    // Now, clean up files that are no longer in current tree
    // and mark the commit done.
    await clearOutdatedFiles(ctx, syncState.commit!);
  },
});

async function getHeadCommit(settings: Doc<"settings">): Promise<string> {
  const github = createOctokit();
  const latestCommit = await github.rest.repos.listCommits({
    repo: settings.repo,
    owner: settings.org,
    per_page: 1,
    sha: settings.branch,
  });
  const commitSha: string = latestCommit.data[0].sha;
  return commitSha;
}

function isPathCode(extensions: Set<string>, path?: string): boolean {
  if (!path) {
    return false;
  }
  const idx = path.lastIndexOf(".");
  if (idx === -1) {
    return false;
  }
  return extensions.has(path.substring(idx));
}

async function indexCurrentFiles(
  settings: Doc<"settings">,
  ctx: ActionCtx,
  syncState: Doc<"sync">,
): Promise<boolean> {
  const extensions: Set<string> = new Set();
  for (const e of settings.extensions!) {
    extensions.add(e);
  }
  const exclusions: Set<string> = new Set();
  for (const e of settings.exclusions ?? []) {
    exclusions.add(e);
  }
  const byteLimit = settings.byteLimit ?? DEFAULT_BYTE_LIMIT;
  const github = createOctokit();

  const response = await github.rest.git.getTree({
    owner: settings.org,
    repo: settings.repo,
    tree_sha: syncState.commit!,
    recursive: "true",
  });
  const tree = response.data.tree;
  // Shuffle the tree to process random files.
  shuffleArray(tree);
  let processedFiles = 0;
  for (const treeItem of tree) {
    if (
      isPathCode(extensions, treeItem.path) &&
      (treeItem.size ?? byteLimit) < byteLimit &&
      !exclusions.has(treeItem.path!) &&
      (await ctx.runMutation(internal.files.checkPending, {
        path: treeItem.path!,
        fileSha: treeItem.sha!,
        treeSha: syncState.commit!,
      }))
    ) {
      console.log(`Processing ${treeItem.path}`);
      const contents = await fetchRepoFileContents(
        settings,
        github,
        treeItem.sha!,
      );
      const summary = await summarize(settings, treeItem.path!, contents);
      console.log(summary);
      // If this throws an exception, it's likely b/c GPT did something wonky and the
      // JSON wasn't quite formatted correctly. The next pass will almost definitely
      // unblock the job when this file is retried.
      const summaryObject = JSON.parse(summary);
      const goals = summaryObject["goals"] as string[];

      const vectors = await generateEmbeddings(goals);
      await ctx.runMutation(internal.files.index, {
        fileSha: treeItem.sha!,
        treeSha: syncState.commit!,
        path: treeItem.path!,
        language: summaryObject["programming_language"] as string,
        goals,
        vectors,
      });
      processedFiles += 1;
      if (processedFiles === 10) {
        return false;
      }
    }
  }
  return true; // All files done.
  //  await fetchAndSummarize(ctx, syncState);
}

function createOctokit() {
  return new Octokit({
    auth: process.env.GITHUB_ACCESS_TOKEN,
  });
}

async function fetchRepoFileContents(
  settings: Doc<"settings">,
  github: Octokit,
  sha: string,
): Promise<string> {
  const response = await github.rest.git.getBlob({
    owner: settings.org,
    repo: settings.repo,
    file_sha: sha,
  });
  function decodeBase64(base64: string) {
    const text = atob(base64);
    const length = text.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = text.charCodeAt(i);
    }
    const decoder = new TextDecoder(); // default is utf-8
    return decoder.decode(bytes);
  }
  const fileContents = decodeBase64(response.data.content);
  return fileContents;
}

async function clearOutdatedFiles(ctx: ActionCtx, commit: string) {
  while (await ctx.runMutation(internal.files.clearDeadFiles, { commit })) {
    // Keep clearing batches of outdated files until they're all gone.
  }
}

/* eslint-disable  @typescript-eslint/no-explicit-any */
function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
