import { desc, eq, sql } from "drizzle-orm";
import { db } from "../index.js";
import { feedFollows, feeds, posts } from "../schema.js";

export async function createPost(input: {
  title: string;
  url: string;
  description?: string | null;
  publishedAt?: Date | null;
  feedId: string;
}) {
  const [row] = await db
    .insert(posts)
    .values({
      title: input.title,
      url: input.url,
      description: input.description ?? null,
      publishedAt: input.publishedAt ?? null,
      feedId: input.feedId,
    })
    .onConflictDoNothing({ target: posts.url })
    .returning();

  return row; 
}

export async function getPostsForUser(userId: string, limit: number) {
  return await db
    .select({
      postId: posts.id,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
      feedName: feeds.name,
      feedUrl: feeds.url,
    })
    .from(posts)
    .innerJoin(feeds, eq(posts.feedId, feeds.id))
    .innerJoin(feedFollows, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.userId, userId))
    .orderBy(sql`${posts.publishedAt} desc nulls last`, desc(posts.createdAt))
    .limit(limit);
}