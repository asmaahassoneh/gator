import type { Feed, User } from "./types";

export function printFeed(feed: Feed, user: User) {
  console.log(`Feed created:`);
  console.log(`- name: ${feed.name}`);
  console.log(`- url: ${feed.url}`);
  console.log(`- user: ${user.name}`);
}