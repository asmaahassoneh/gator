import { readConfig, setUser } from "./config.js";
import { fetchFeed } from "./rss.js";
import { printFeed } from "./print.js";
import { createFeedFollow, getFeedFollowsForUser, deleteFeedFollowByUserAndFeedId } from "./lib/db/queries/feed_follows.js";
import type { User } from "./types.js";
import { createPost, getPostsForUser } from "./lib/db/queries/posts.js";
import {
  createUser,
  deleteAllUsers,
  getUserByName,
  getUsers,
} from "./lib/db/queries/users.js";

import {
  createFeed,
  getFeedsWithUsers,
  getFeedByUrl,
  getNextFeedToFetch, 
  markFeedFetched,
} from "./lib/db/queries/feeds.js";


function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);
  if (!match) throw new Error(`invalid duration: ${durationStr}`);

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === "ms") return value;
  if (unit === "s") return value * 1000;
  if (unit === "m") return value * 60 * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;

  throw new Error(`invalid duration unit: ${unit}`);
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h${minutes}m${seconds}s`;
  if (minutes > 0) return `${minutes}m${seconds}s`;
  return `${seconds}s`;
}

function handleError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(msg);
}

async function scrapeFeeds() {
  const feed = await getNextFeedToFetch();
  if (!feed) {
    console.log("No feeds found to fetch.");
    return;
  }

  console.log(`Fetching: ${feed.name} (${feed.url})`);

  await markFeedFetched(feed.id);

  const rss = await fetchFeed(feed.url);

  let createdCount = 0;

  for (const item of rss.channel.item) {
    const publishedAt = parsePublishedAt(item.pubDate);

    const inserted = await createPost({
      title: item.title,
      url: item.link,
      description: item.description,
      publishedAt,
      feedId: feed.id,
    });

    if (inserted) createdCount++;
  }

  console.log(`Saved ${createdCount} new posts from ${feed.name}`);
}

function parsePublishedAt(raw: string | undefined): Date | null {
  if (!raw) return null;

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;

  return null;
}
export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;
export type CommandsRegistry = Record<string, CommandHandler>;
export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export function middlewareLoggedIn(handler: UserCommandHandler): CommandHandler {
  return async (cmdName: string, ...args: string[]) => {
    const cfg = readConfig();
    const userName = cfg.currentUserName;
    if (!userName) {
      throw new Error("no current user set");
    }

    const user = await getUserByName(userName);
    if (!user) {
      throw new Error(`user "${userName}" does not exist`);
    }

    await handler(cmdName, user, ...args);
  };
}

function registerCommand(registry: CommandsRegistry, cmdName: string, handler: CommandHandler) {
  registry[cmdName] = handler;
}

async function runCommand(registry: CommandsRegistry, cmdName: string, ...args: string[]) {
  const handler = registry[cmdName];
  if (!handler) throw new Error(`Unknown command: ${cmdName}`);
  await handler(cmdName, ...args);
}


async function handlerLogin(cmdName: string, ...args: string[]) {
  if (args.length === 0) throw new Error("login command requires a username");

  const username = args[0];
  const user = await getUserByName(username);
  if (!user) throw new Error(`user "${username}" does not exist`);

  setUser(username);
  console.log(`User set to ${username}`);
}

async function handlerRegister(cmdName: string, ...args: string[]) {
  if (args.length === 0) throw new Error("register command requires a username");

  const username = args[0];
  const existing = await getUserByName(username);
  if (existing) throw new Error(`user "${username}" already exists`);

  const created = await createUser(username);

  setUser(username);
  console.log(`User created: ${username}`);
  console.log(created);
}

async function handlerReset(cmdName: string, ...args: string[]) {
  await deleteAllUsers();
  console.log("Database reset successful");
}

async function handlerUsers(cmdName: string, ...args: string[]) {
  const cfg = readConfig();
  const current = cfg.currentUserName;

  const all = await getUsers();
  for (const u of all) {
    const isCurrent = current && u.name === current;
    console.log(`* ${u.name}${isCurrent ? " (current)" : ""}`);
  }
}

async function handlerAgg(cmdName: string, ...args: string[]) {
  if (args.length < 1) {
    throw new Error("agg command requires a time_between_reqs argument");
  }

  const timeBetweenRequests = parseDuration(args[0]);
  console.log(`Collecting feeds every ${formatDuration(timeBetweenRequests)}`);

  await scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

async function handlerAddFeed(cmdName: string, user: User, ...args: string[]) {
  if (args.length < 2) {
    throw new Error("addfeed command requires a name and a url");
  }

  const [name, url] = args;

  const feed = await createFeed(name, url, user.id);
  printFeed(feed, user);

  const ff = await createFeedFollow(user.id, feed.id);
  console.log(`${ff.userName} is now following ${ff.feedName}`);
}

async function handlerFeeds(cmdName: string, ...args: string[]) {
  const rows = await getFeedsWithUsers();

  for (const r of rows) {
    console.log(`* ${r.feedName}`);
    console.log(`  - url: ${r.feedUrl}`);
    console.log(`  - user: ${r.userName}`);
  }
}
async function handlerFollow(cmdName: string, user: User, ...args: string[]) {
  if (args.length < 1) throw new Error("follow command requires a url");

  const url = args[0];
  const feed = await getFeedByUrl(url);
  if (!feed) throw new Error(`feed not found: ${url}`);

  const ff = await createFeedFollow(user.id, feed.id);
  console.log(`${ff.userName} is now following ${ff.feedName}`);
}

async function handlerFollowing(cmdName: string, user: User, ...args: string[]) {
  const rows = await getFeedFollowsForUser(user.id);
  for (const r of rows) {
    console.log(`* ${r.feedName}`);
  }
}
async function handlerUnfollow(cmdName: string, user: User, ...args: string[]) {
  if (args.length < 1) throw new Error("unfollow command requires a url");

  const url = args[0];

  const feed = await getFeedByUrl(url);
  if (!feed) throw new Error(`feed not found: ${url}`);

  const deleted = await deleteFeedFollowByUserAndFeedId(user.id, feed.id);
  if (!deleted) {
    throw new Error(`user "${user.name}" is not following "${feed.name}"`);
  }

  console.log(`${user.name} unfollowed ${feed.name}`);
}

async function handlerBrowse(cmdName: string, user: User, ...args: string[]) {
  const limit = args.length > 0 ? Number(args[0]) : 2;

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("browse limit must be a positive number");
  }

  const rows = await getPostsForUser(user.id, limit);

  for (const r of rows) {
    const when = r.publishedAt ? r.publishedAt.toISOString() : "unknown date";
    console.log(`* ${r.title}`);
    console.log(`  - ${r.url}`);
    console.log(`  - feed: ${r.feedName}`);
    console.log(`  - published: ${when}`);
  }
}

export async function runCli(argv: string[]) {
  const registry: CommandsRegistry = {};

  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "agg", handlerAgg);
  registerCommand(registry, "feeds", handlerFeeds);
  registerCommand(registry, "addfeed", middlewareLoggedIn(handlerAddFeed));
  registerCommand(registry, "follow", middlewareLoggedIn(handlerFollow));
  registerCommand(registry, "following", middlewareLoggedIn(handlerFollowing));
  registerCommand(registry, "unfollow", middlewareLoggedIn(handlerUnfollow));
  registerCommand(registry, "browse", middlewareLoggedIn(handlerBrowse));
  if (argv.length < 1) {
    console.error("Not enough arguments provided");
    process.exit(1);
  }

  const [cmdName, ...args] = argv;

  try {
    await runCommand(registry, cmdName, ...args);
    process.exit(0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(msg);
    process.exit(1);
  }
}