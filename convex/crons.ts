/** Cron jobs our Convex project uses. */
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/** Every minute check the GitHub repo for new commits.
 *
 * In an ideal world, we could use a web hook instead. Exercise left to future
 * developers.
 */
crons.interval(
  "poll for new commits",
  { minutes: 1 }, // every minute
  internal.repo.sync,
);

export default crons;
