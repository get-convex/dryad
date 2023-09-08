/** Primary "crawling" logic that keeps the index in sync
 * with the content in a specific GitHub repository.
 *
 * The entry point here, `sync`, is called by a cron job.
 */
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
// If we don't skip files biger than this, we'll get OpenAI API call
// errors about too many tokens.
const DEFAULT_BYTE_LIMIT = 24000;

/**  This is the main "step forward" function which ensures steady progress
 * on converging our stored index toward the current `HEAD` of the target
 * repositories given branch.
 */
export const sync = internalAction({
  args: {},
  handler: async (ctx) => {
    // 0. Grab settings.
    const settings = await ctx.runQuery(api.settings.get);
    if (!settings) {
      console.log(
        "Please establish the 'settings' table. Call syncState:init to get initial working values",
      );
      throw "no settings";
    }
    // 1. Load sync state
    let syncState = await ctx.runQuery(internal.syncState.get);
    // We're not currently in the middle of processing a commit?
    if (syncState.commitDone) {
      // Grab the current HEAD of the target branch.
      const commit = await getHeadCommit(settings);
      // NOOP if origin's HEAD is already our processed commit.
      if (syncState.commit === commit) {
        console.log("No new commits. Skipping pass.");
        return;
      }
      // Otherwise, time to enter into the next commit.
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
      // Why do we do this?
      // Just to keep logs flowing, release resources, etc. Shorter-running
      // actions are easier to keep manageable. So we'll just immediately
      // reschedule ourselves to run again in a new runtime instance.
      console.log("Batch done; ending action and running again momentarily.");
      await ctx.scheduler.runAfter(0, internal.repo.sync);
      return;
    } else {
      // We have now ensured all *existing* files in this new commit tree
      // are accurately indexed. However there are possibly some "dead"
      // files that were deleted. These are no longer in the repo but
      // are still in our search index. Let's keep going.
      console.log("Batch finished. Let's clean up dead files.");
    }

    // 3. All current file contents are marked and indexed.
    // Now, clean up files that are no longer in current tree
    // and mark the commit done.
    await clearOutdatedFiles(ctx, syncState.commit!);
  },
});

/** Grab the sha256 of the HEAD of our target repo and branch, as designated by
 * the settings table.
 */
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

/** Is the given path likely to be code as defined by the project's set
 * of target file extensions?
 *
 * We want to limit what files we send to OpenAI since it's expensive to
 * stream low value, large file contents to ChatGPT just to get confusing
 * messages back.
 */
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

/** Do a pass on indexing a chunk of up to 10 new or changed
 * files in the current commit we're working on.
 */
async function indexCurrentFiles(
  settings: Doc<"settings">,
  ctx: ActionCtx,
  syncState: Doc<"sync">,
): Promise<boolean> {
  // Grab a few things from the settings table.
  const extensions: Set<string> = new Set();
  for (const e of settings.extensions!) {
    extensions.add(e);
  }
  const exclusions: Set<string> = new Set();
  for (const e of settings.exclusions ?? []) {
    exclusions.add(e);
  }
  const byteLimit = settings.byteLimit ?? DEFAULT_BYTE_LIMIT;

  // Create our github client instance.
  const github = createOctokit();

  // Let's grab the whole tree state at the current commit.
  const response = await github.rest.git.getTree({
    owner: settings.org,
    repo: settings.repo,
    tree_sha: syncState.commit!,
    recursive: "true",
  });
  const tree = response.data.tree;
  // Shuffle the tree to process random files.
  // This is useful to minimize collisions if we have multiple jobs
  // that end up running in parallel.
  shuffleArray(tree);

  // We'll increment this whenever we actually encounter a new or changed file
  // to know how many we've processed with OpenAI etc.
  let processedFiles = 0;
  for (const treeItem of tree) {
    // If the file is code, isn't too big, isn't explicitly excluded by our settings,
    // and has newer content than we've indexed (this is what `checkPending` determines)...
    // It's time to download and get to work summarizing and indexing this source code
    // file.
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
      // 1. Get the actual contnents of the source file.
      const contents = await fetchRepoFileContents(
        settings,
        github,
        treeItem.sha!,
      );
      // 2. Get the goals summary from ChatGPT
      const summary = await summarize(settings, treeItem.path!, contents);
      console.log(summary);
      // Note: If this throws an exception, it's likely b/c GPT did something wonky and the
      // JSON wasn't quite formatted correctly. The next pass will almost definitely
      // unblock the job when this file is retried.
      const summaryObject = JSON.parse(summary);
      const goals = summaryObject["goals"] as string[];

      // 3. Have OpenAI generate embeddings for all the goals
      const vectors = await generateEmbeddings(goals);

      // 4. Store the file, goals, and vectors into Convex for search.
      await ctx.runMutation(internal.files.index, {
        fileSha: treeItem.sha!,
        treeSha: syncState.commit!,
        path: treeItem.path!,
        language: summaryObject["programming_language"] as string,
        goals,
        vectors,
      });
      // We'll do up to 10 files in one pass to keep the runtime of an individual
      // action a few minutes or less.
      processedFiles += 1;
      if (processedFiles === 10) {
        return false;
      }
    }
  }
  return true; // All files done.
}

/** Create Octokit instance using our GitHub access token. */
function createOctokit() {
  return new Octokit({
    auth: process.env.GITHUB_ACCESS_TOKEN,
  });
}

/** Grab the contents of a specific file (keyed by a blob's sha256) from
 * the repository on GitHub.
 */
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
  // The file contents are in base64, since the file can contain
  // non-ascii characters.
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

/** Run passes of the clearDeadFiles mutation to get rid of files
 * no longer in the repository's tree.
 */
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
