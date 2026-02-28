import { XMLParser } from "fast-xml-parser";

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const res = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch feed: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
  });

  const parsed = parser.parse(xml) as any;

  const channel = parsed?.rss?.channel ?? parsed?.feed?.channel ?? parsed?.channel;
  if (!channel || typeof channel !== "object") {
    throw new Error("Invalid RSS: missing channel");
  }

  const title = channel.title;
  const link = channel.link;
  const description = channel.description;

  if (!isNonEmptyString(title)) throw new Error("Invalid RSS: missing channel.title");
  if (!isNonEmptyString(link)) throw new Error("Invalid RSS: missing channel.link");
  if (!isNonEmptyString(description))
    throw new Error("Invalid RSS: missing channel.description");

  let rawItems: any[] = [];
  if (channel.item) {
    rawItems = Array.isArray(channel.item) ? channel.item : [channel.item];
  }

  const items: RSSItem[] = [];
  for (const it of rawItems) {
    const itTitle = it?.title;
    const itLink = it?.link;
    const itDesc = it?.description;
    const itPub = it?.pubDate;

    if (
      !isNonEmptyString(itTitle) ||
      !isNonEmptyString(itLink) ||
      !isNonEmptyString(itDesc) ||
      !isNonEmptyString(itPub)
    ) {
      continue; 
    }

    items.push({
      title: itTitle,
      link: itLink,
      description: itDesc,
      pubDate: itPub,
    });
  }

  return {
    channel: {
      title,
      link,
      description,
      item: items,
    },
  };
}