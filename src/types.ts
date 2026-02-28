import { feeds, users } from "./lib/db/schema.js";

export type User = typeof users.$inferSelect;
export type Feed = typeof feeds.$inferSelect;