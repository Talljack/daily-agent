import Parser from "rss-parser";

export type RSSItem = {
  title: string;
  link: string;
  content: string;
};

const parser = new Parser();

export async function fetchRSS(url: string, limit?: number): Promise<RSSItem[]> {
  const feed = await parser.parseURL(url);
  const items = feed.items.map(item => ({
    title: item.title ?? "",
    link: item.link ?? "",
    content: item.contentSnippet ?? "",
  }));

  if (typeof limit === "number" && limit > 0) {
    return items.slice(0, limit);
  }

  return items;
}
