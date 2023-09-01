import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "poll for new commits",
  { minutes: 1 }, // every minute
  internal.repo.sync
);

export default crons;
