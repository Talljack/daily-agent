import Parser from "rss-parser";

export type RSSItem = {
  title: string;
  link: string;
  content: string;
};

export type FetchRSSOptions = {
  timeoutMs?: number;
  cacheTtlMs?: number;
  retries?: number;
};

export type RSSFetchResult = {
  items: RSSItem[];
  fromCache: boolean;
  fetchedAt: number;
};

const parser = new Parser();
const rssCache = new Map<string, { timestamp: number; items: RSSItem[] }>();

export async function fetchRSS(
  url: string,
  limit?: number,
  options: FetchRSSOptions = {}
): Promise<RSSFetchResult> {
  const cacheKey = `${url}|${limit ?? "all"}`;
  const cacheTtl = options.cacheTtlMs ?? 10 * 60 * 1000; // default 10 minutes
  const now = Date.now();

  const cached = rssCache.get(cacheKey);
  if (cached && now - cached.timestamp < cacheTtl) {
    return { items: cached.items, fromCache: true, fetchedAt: cached.timestamp };
  }

  const retries = Math.max(1, options.retries ?? 2);
  let attempt = 0;
  let lastError: unknown;

  while (attempt < retries) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Daily-Agent/1.0 (+https://daily-agent.local)",
          Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      const text = await response.text();
      const feed = await parser.parseString(text);
      const items = (feed.items ?? []).map((item) => ({
        title: item.title ?? "",
        link: item.link ?? "",
        content: item.contentSnippet ?? item.content ?? "",
      }));

      const scopedItems = typeof limit === "number" && limit > 0 ? items.slice(0, limit) : items;
      rssCache.set(cacheKey, { timestamp: Date.now(), items: scopedItems });

      return { items: scopedItems, fromCache: false, fetchedAt: Date.now() };
    } catch (error) {
      lastError = error instanceof Error && error.name === "AbortError"
        ? new Error(`Request timed out after ${options.timeoutMs ?? 15000}ms`)
        : error;

      if (attempt < retries) {
        // Exponential backoff between retries
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        continue;
      }

      throw lastError instanceof Error ? lastError : new Error(String(lastError));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
