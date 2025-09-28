import { DISCOVERY_SOURCES, DiscoverySourceConfig, getSourcesByCategory } from "@/lib/config/discoverySources";
import { DEFAULT_DISCOVERY_CATEGORIES, DiscoveryCategoryDefinition, getDefaultCategoryById } from "@/lib/config/discoveryCategories";
import { fetchRSS } from "@/lib/tools/rssTool";
import { hasAIConfig, OPENROUTER_API_KEY, OPENROUTER_MODEL, SERPAPI_API_KEY, PRODUCTHUNT_API_TOKEN } from "@/lib/env";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export type DiscoveryItem = {
  title: string;
  summary: string;
  link: string;
  categoryId: string;
  categoryName: string;
  sourceId: string;
  sourceName: string;
  language?: string;
  reason?: string;
};

export type DiscoveryResult = {
  id: string;
  title: string;
  description: string;
  items: DiscoveryItem[];
  retrievedAt: string;
  meta: {
    fetchedSourceCount: number;
    rawItemCount: number;
    usedAI: boolean;
    sourceStatuses: SourceStatus[];
  };
};

type RawSourceItem = {
  title: string;
  link: string;
  summary: string;
  sourceId: string;
  sourceName: string;
  language: "en" | "zh";
  reason?: string;
  usedFallback?: boolean;
};

type SourceFetchOutcome = {
  items: RawSourceItem[];
  usedFallback: boolean;
  fromCache: boolean;
  fetchedAt: number;
  status: "ok" | "fallback" | "error";
  message?: string;
};

export type SourceStatus = {
  id: string;
  title: string;
  status: "ok" | "fallback" | "error";
  usedFallback: boolean;
  fromCache: boolean;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  message?: string;
};

type SourceHealth = {
  lastSuccessAt?: number;
  lastFailureAt?: number;
  lastError?: string;
  consecutiveFailures: number;
};

const sourceHealth = new Map<string, SourceHealth>();
const RSS_FETCH_OPTIONS = { cacheTtlMs: 10 * 60 * 1000, retries: 2, timeoutMs: 12000 } as const;
const RECENT_HISTORY_TTL = 48 * 60 * 60 * 1000; // 48 hours
const recentHistory = new Map<string, number>();
const SEARCH_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const searchCache = new Map<string, { timestamp: number; items: RawSourceItem[] }>();

async function fetchViaJina(targetUrl: string): Promise<string> {
  const proxiedUrl = `https://r.jina.ai/${encodeURI(targetUrl)}`;
  const response = await fetch(proxiedUrl, {
    headers: {
      "User-Agent": "Daily-Agent/1.0 (+https://daily-agent.local)",
      Accept: "text/markdown, text/plain;q=0.9, */*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Jina proxy status ${response.status}`);
  }

  return response.text();
}

function parseJinaMarkdown(markdown: string, source: DiscoverySourceConfig, limit: number): RawSourceItem[] {
  let sourceHost: string | null = null;
  const allowedHosts = new Set<string>();
  try {
    sourceHost = new URL(source.url).host;
    allowedHosts.add(sourceHost);
    if (sourceHost.startsWith("www.")) {
      allowedHosts.add(sourceHost.replace(/^www\./, ""));
    } else {
      allowedHosts.add(`www.${sourceHost}`);
    }
  } catch (error) {
    sourceHost = null;
  }

  const regex = /\[(?!\!)([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/g;
  const items: RawSourceItem[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null && items.length < limit) {
    const rawText = match[1]?.replace(/\s+/g, " ").trim();
    const link = match[2];

    if (!rawText || !link) continue;
    if (seen.has(link)) continue;
    if (link.includes('#')) continue;

    if (sourceHost) {
      try {
        const linkHost = new URL(link).host;
        if (!allowedHosts.has(linkHost)) {
          continue;
        }
      } catch (error) {
        continue;
      }
    }
    let isArticle = true;
    try {
      const pathname = new URL(link).pathname.toLowerCase();
      const looksLikeArticle = /(news|index|blog|research|article|stories|posts|insights|202[0-9]|20[0-9]{2})/.test(pathname);
      const hasSlug = /[-_]/.test(pathname) || /\d{4}/.test(pathname);
      isArticle = looksLikeArticle && hasSlug;
    } catch (error) {
      // ignore parsing errors
    }
    if (!isArticle) continue;

    seen.add(link);

    const cleanedTitle = rawText.replace(/^\#\#\#\s*/g, "").trim();
    if (!cleanedTitle || !cleanedTitle.includes(" ")) continue;

    items.push({
      title: cleanedTitle,
      link,
      summary: cleanedTitle,
      sourceId: source.id,
      sourceName: source.title,
      language: source.language,
    });
  }

  return items;
}

async function fetchGithubTrending(source: DiscoverySourceConfig, limit: number): Promise<RawSourceItem[]> {
  const language = typeof source.options?.language === "string" ? source.options.language : undefined;
  const since = typeof source.options?.since === "string" ? source.options.since : "daily";
  const params = new URLSearchParams();
  params.set("since", since);
  // For GitHub and ProductHunt, use a higher limit to show more results
  const actualLimit = limit > 0 ? Math.min(limit, 100) : 25; // Default to 25, max 100
  params.set("limit", String(actualLimit));
  if (language) {
    params.set("language", language);
  }

  const fetchWithRetry = async (retryCount = 0): Promise<Response> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${source.url}?${params.toString()}`, {
        headers: {
          "User-Agent": "Daily-Agent/1.0 (+https://daily-agent.local)",
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (retryCount < 2) {
        console.warn(`GitHub API retry ${retryCount + 1}/2:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return fetchWithRetry(retryCount + 1);
      }
      throw error;
    }
  };

  const response = await fetchWithRetry();

  if (!response.ok) {
    throw new Error(`GitHub trending API status ${response.status}`);
  }

  const repos = await response.json();
  if (!Array.isArray(repos)) {
    throw new Error("Unexpected GitHub trending payload");
  }

  return repos.slice(0, limit).map((repo: any) => ({
    title: `${repo.author ?? "unknown"}/${repo.name ?? "unknown"}`,
    link: repo.url ?? "#",
    summary: `${repo.description ?? "No description"} ⭐ ${repo.stars ?? repo.currentPeriodStars ?? 0} | ${repo.language ?? "n/a"}`.trim(),
    sourceId: source.id,
    sourceName: source.title,
    language: "en",
  }));
}

async function fetchProductHuntTrending(source: DiscoverySourceConfig, limit: number): Promise<RawSourceItem[]> {
  if (!PRODUCTHUNT_API_TOKEN) {
    throw new Error("PRODUCTHUNT_API_TOKEN not configured");
  }

  const actualLimit = limit > 0 ? Math.min(limit, 100) : 25; // Default to 25, max 100
  const query = `
    query {
      posts(first: ${actualLimit}, order: VOTES) {
        edges {
          node {
            id
            name
            tagline
            description
            url
            votesCount
            commentsCount
            createdAt
            makers {
              name
            }
            topics {
              edges {
                node {
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const fetchWithRetry = async (retryCount = 0): Promise<Response> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for GraphQL

      const response = await fetch(source.url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PRODUCTHUNT_API_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "Daily-Agent/1.0 (+https://daily-agent.local)",
        },
        body: JSON.stringify({
          query
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (retryCount < 2) {
        console.warn(`ProductHunt API retry ${retryCount + 1}/2:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return fetchWithRetry(retryCount + 1);
      }
      throw error;
    }
  };

  const response = await fetchWithRetry();

  if (!response.ok) {
    throw new Error(`ProductHunt API status ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`ProductHunt GraphQL error: ${data.errors.map((e: any) => e.message).join(", ")}`);
  }

  const posts = data.data?.posts?.edges || [];

  return posts.slice(0, limit).map((edge: any) => {
    const post = edge.node;
    const makers = post.makers?.map((m: any) => m.name).join(", ") || "Unknown";
    const topics = post.topics?.edges?.slice(0, 3).map((t: any) => t.node.name).join(", ") || "";

    return {
      title: post.name || "Untitled Product",
      link: post.url || "https://www.producthunt.com",
      summary: `${post.tagline || post.description || "No description"} 🚀 ${post.votesCount || 0} votes | By ${makers}${topics ? ` | ${topics}` : ""}`.trim(),
      sourceId: source.id,
      sourceName: source.title,
      language: "en",
    };
  });
}

async function fetchSearchResults(source: DiscoverySourceConfig, limit: number): Promise<{ items: RawSourceItem[]; fromCache: boolean }> {
  const provider = typeof source.options?.provider === "string" ? source.options.provider : "serpapi";

  switch (provider) {
    case "serpapi":
      return fetchSerpApiResults(source, limit);
    default:
      throw new Error(`Unsupported search provider: ${provider}`);
  }
}

async function fetchSerpApiResults(source: DiscoverySourceConfig, limit: number): Promise<{ items: RawSourceItem[]; fromCache: boolean }> {
  if (!SERPAPI_API_KEY) {
    throw new Error("SERPAPI_API_KEY 未配置");
  }

  const baseUrl = typeof source.url === "string" && source.url.startsWith("https://")
    ? source.url
    : "https://serpapi.com/search.json";

  const query = typeof source.options?.query === "string" && source.options.query.trim()
    ? source.options.query.trim()
    : source.title;

  const engine = typeof source.options?.engine === "string" && source.options.engine.trim()
    ? source.options.engine.trim()
    : "google_news";

  const numOption = Number(source.options?.num ?? limit * 2);
  const num = Math.min(Math.max(Number.isFinite(numOption) ? Math.round(numOption) : limit * 2, 10), 20);

  const params = new URLSearchParams({
    api_key: SERPAPI_API_KEY,
    engine,
    q: query,
    output: "json",
    num: String(num),
  });

  if (typeof source.options?.gl === "string") {
    params.set("gl", source.options.gl);
  }
  if (typeof source.options?.hl === "string") {
    params.set("hl", source.options.hl);
  }

  const cacheKey = JSON.stringify({ id: source.id, query, engine, gl: source.options?.gl, hl: source.options?.hl, num });
  const cached = searchCache.get(cacheKey);
  const now = Date.now();
  const cacheTtl = typeof source.options?.cacheTtlMs === "number" && source.options.cacheTtlMs > 0
    ? Number(source.options.cacheTtlMs)
    : SEARCH_CACHE_TTL;

  if (cached && now - cached.timestamp < cacheTtl) {
    return { items: cached.items.slice(0, limit), fromCache: true };
  }

  const response = await fetch(`${baseUrl}?${params.toString()}`, {
    headers: {
      "User-Agent": "Daily-Agent/1.0 (+https://daily-agent.local)",
    },
  });

  if (!response.ok) {
    throw new Error(`SerpAPI status ${response.status}`);
  }

  const data = await response.json();
  const articles = parseSerpApiPayload(data);

  const mappedArticles = articles.map((article) => ({
    title: article.title,
    link: article.link,
    summary: article.summary,
    sourceId: source.id,
    sourceName: source.title,
    language: source.language,
  }));

  searchCache.set(cacheKey, { timestamp: now, items: mappedArticles });

  return {
    items: mappedArticles.slice(0, limit),
    fromCache: false,
  };
}

type SerpArticle = {
  title: string;
  link: string;
  summary: string;
};

function parseSerpApiPayload(payload: any): SerpArticle[] {
  const results: SerpArticle[] = [];
  const seen = new Set<string>();

  const candidates = [
    ...(Array.isArray(payload?.news_results) ? payload.news_results : []),
    ...(Array.isArray(payload?.organic_results) ? payload.organic_results : []),
    ...(Array.isArray(payload?.articles_results) ? payload.articles_results : []),
  ];

  for (const item of candidates) {
    const title = String(item?.title ?? item?.name ?? "").trim();
    const link = String(item?.link ?? item?.url ?? "").trim();
    const summary = String(item?.snippet ?? item?.description ?? item?.content ?? "").trim();

    if (!title || !link) continue;
    if (seen.has(link)) continue;
    seen.add(link);

    results.push({
      title,
      link,
      summary: summary || title,
    });
  }

  return results;
}

function filterRecentRawItems(items: RawSourceItem[], now: number): RawSourceItem[] {
  return items.filter((item) => {
    const link = item.link;
    if (!link) return true;
    const lastSeen = recentHistory.get(link);
    if (!lastSeen) return true;
    return now - lastSeen > RECENT_HISTORY_TTL;
  });
}

function markItemsAsSeen(items: DiscoveryItem[], now: number) {
  let marks = 0;
  for (const item of items) {
    if (item.link && item.link !== "#") {
      recentHistory.set(item.link, now);
      marks += 1;
    }
  }

  if (marks > 0 && recentHistory.size > 2048) {
    const expired: string[] = [];
    recentHistory.forEach((timestamp, link) => {
      if (now - timestamp > RECENT_HISTORY_TTL) {
        expired.push(link);
      }
    });
    for (const link of expired) {
      recentHistory.delete(link);
    }
  }
}

type FetchCategoryParams = {
  categoryId: string;
  categoryName: string;
  userPrompt: string;
  limit?: number;
};

function clampLimit(value: number | undefined, fallback = 6) {
  if (!Number.isFinite(value) || !value) {
    return fallback;
  }
  return Math.max(3, Math.min(Math.round(value), 16));
}

function sortSourcesByWeight(sources: DiscoverySourceConfig[]) {
  return [...sources].sort((a, b) => (b.weight ?? 0.5) - (a.weight ?? 0.5));
}

function recordSourceSuccess(source: DiscoverySourceConfig) {
  const entry = sourceHealth.get(source.id) ?? { consecutiveFailures: 0 };
  entry.lastSuccessAt = Date.now();
  entry.lastError = undefined;
  entry.consecutiveFailures = 0;
  sourceHealth.set(source.id, entry);
}

function recordSourceFailure(source: DiscoverySourceConfig, error?: string) {
  const entry = sourceHealth.get(source.id) ?? { consecutiveFailures: 0 };
  entry.lastFailureAt = Date.now();
  entry.lastError = error;
  entry.consecutiveFailures += 1;
  sourceHealth.set(source.id, entry);
}

async function fetchSourceItems(source: DiscoverySourceConfig, limit: number): Promise<SourceFetchOutcome> {
  let outcome: SourceFetchOutcome | null = null;
  let lastError: string | undefined;

  try {
    switch (source.strategy) {
      case "rss": {
        const { items, fromCache, fetchedAt } = await fetchRSS(source.url, Math.max(limit, 6), RSS_FETCH_OPTIONS);
        const mapped = items
          .filter((item) => item.title && item.link)
          .map((item) => ({
            title: item.title ?? "",
            link: item.link ?? "",
            summary: item.content ?? "",
            sourceId: source.id,
            sourceName: source.title,
            language: source.language,
          }));

        if (mapped.length > 0) {
          outcome = {
            items: mapped.slice(0, limit * 2),
            usedFallback: false,
            fromCache,
            fetchedAt,
            status: "ok",
          };
        } else {
          lastError = "Feed returned no items";
        }
        break;
      }
      case "jina": {
        const jinaResult = await fetchViaJina(source.url);
        const parsed = parseJinaMarkdown(jinaResult, source, limit * 3);
        if (parsed.length > 0) {
          outcome = {
            items: parsed.slice(0, limit * 2),
            usedFallback: false,
            fromCache: false,
            fetchedAt: Date.now(),
            status: "ok",
          };
        } else {
          lastError = "Jina proxy returned no items";
        }
        break;
      }
      case "github_trending_api": {
        const parsed = await fetchGithubTrending(source, limit * 2);
        if (parsed.length > 0) {
          outcome = {
            items: parsed,
            usedFallback: false,
            fromCache: false,
            fetchedAt: Date.now(),
            status: "ok",
          };
        } else {
          lastError = "GitHub search returned no repositories";
        }
        break;
      }
      case "producthunt_api": {
        const parsed = await fetchProductHuntTrending(source, limit * 2);
        if (parsed.length > 0) {
          outcome = {
            items: parsed,
            usedFallback: false,
            fromCache: false,
            fetchedAt: Date.now(),
            status: "ok",
          };
        } else {
          lastError = "ProductHunt API returned no products";
        }
        break;
      }
      case "search": {
        const searchResult = await fetchSearchResults(source, limit * 2);
        if (searchResult.items.length > 0) {
          outcome = {
            items: searchResult.items,
            usedFallback: false,
            fromCache: searchResult.fromCache,
            fetchedAt: Date.now(),
            status: "ok",
          };
        } else {
          lastError = "Search provider returned no articles";
        }
        break;
      }
      default:
        lastError = `Unsupported strategy ${source.strategy}`;
    }
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    console.warn(`Failed to fetch ${source.id}:`, lastError);
  }

  if (outcome && outcome.items.length > 0) {
    recordSourceSuccess(source);
    return outcome;
  }

  if (source.fallbackItems?.length) {
    const fallbackItems = source.fallbackItems.slice(0, limit).map((item) => ({
      title: item.title,
      link: item.link,
      summary: item.summary,
      sourceId: source.id,
      sourceName: source.title,
      language: source.language,
      reason: `使用预设内容，来源「${source.title}」暂不可用`,
      usedFallback: true,
    }));

    recordSourceFailure(source, lastError);
    return {
      items: fallbackItems,
      usedFallback: true,
      fromCache: false,
      fetchedAt: Date.now(),
      status: "fallback",
      message: lastError,
    };
  }

  recordSourceFailure(source, lastError);
  return {
    items: [],
    usedFallback: false,
    fromCache: false,
    fetchedAt: Date.now(),
    status: "error",
    message: lastError,
  };
}

function dedupeItems(items: RawSourceItem[]) {
  const seen = new Map<string, RawSourceItem>();

  for (const item of items) {
    const key = item.link || item.title;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values());
}

function buildSystemPrompt(category: DiscoveryCategoryDefinition | undefined, categoryName: string) {
  if (category) {
    return category.systemPrompt;
  }

  return `You are a research scout tasked with surfacing timely, high-quality knowledge for the following theme: ${categoryName}. \
Use the supplied source excerpts to identify the most novel, high-signal updates. Return JSON results, keep tone factual, include original links, and avoid speculation.`;
}

function buildUserPrompt(options: {
  categoryName: string;
  userPrompt: string;
  limit: number;
  sourceHints: string[];
  rawFeed: RawSourceItem[];
}) {
  const { categoryName, userPrompt, limit, sourceHints, rawFeed } = options;
  const serializedFeed = rawFeed
    .map((item, index) => {
      const summary = item.summary.replace(/\s+/g, " ").trim();
      return `${index + 1}. Title: ${item.title}\n   Source: ${item.sourceName}\n   Link: ${item.link}\n   Summary: ${summary}`;
    })
    .join("\n\n");

  return `Category: ${categoryName}\nFocus: ${userPrompt}\nSource hints: ${sourceHints.join(", ")}\n\nYou must return ${limit} items as a JSON array. Each object must include: title, summary (max 2 sentences), link, categoryId, categoryName, sourceName, reason.\nUse the original link from the feed whenever possible.\n\nInput feed:\n${serializedFeed}`;
}

function extractContent(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part) return "";
        if (typeof part === "string") return part;
        if (typeof part === "object" && typeof (part as { text?: string }).text === "string") {
          return (part as { text: string }).text;
        }
        if (typeof part === "object" && typeof (part as { content?: string }).content === "string") {
          return (part as { content: string }).content;
        }
        return "";
      })
      .join("");
  }
  if (typeof content === "object" && typeof (content as { text?: string }).text === "string") {
    return (content as { text: string }).text;
  }
  return "";
}

function parseJsonArray(raw: string): Record<string, unknown>[] | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed as Record<string, unknown>[];
    }
    if (parsed && Array.isArray((parsed as { items?: unknown[] }).items)) {
      return (parsed as { items: Record<string, unknown>[] }).items;
    }
  } catch (error) {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start >= 0 && end > start) {
      try {
        const nested = JSON.parse(trimmed.slice(start, end + 1));
        if (Array.isArray(nested)) {
          return nested as Record<string, unknown>[];
        }
      } catch (nestedError) {
        console.error("Nested JSON parse failed", nestedError);
      }
    }
    console.error("JSON parse failed", error);
  }

  return null;
}

function formatText(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function formatLink(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
  }
  return fallback;
}

async function generateHighlightsWithAI(options: {
  category: DiscoveryCategoryDefinition | undefined;
  categoryId: string;
  categoryName: string;
  userPrompt: string;
  limit: number;
  rawItems: RawSourceItem[];
}): Promise<DiscoveryItem[] | null> {
  if (!hasAIConfig() || !OPENROUTER_API_KEY) {
    return null;
  }

  const { category, categoryId, categoryName, userPrompt, limit, rawItems } = options;
  const systemPrompt = buildSystemPrompt(category, categoryName);
  const userMessage = buildUserPrompt({
    categoryName,
    userPrompt,
    limit,
    sourceHints: category?.seedSourceIds ?? [],
    rawFeed: rawItems,
  });

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://daily-agent.local",
        "X-Title": "Daily Agent Discovery",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 2000,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      console.error("OpenRouter API error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const rawContent = extractContent(data?.choices?.[0]?.message?.content);
    const parsed = parseJsonArray(rawContent);

    if (!parsed) {
      console.error("Unable to parse AI response as JSON array");
      return null;
    }

    return parsed
      .slice(0, limit)
      .map((item, index) => {
        const fallback = rawItems[index] ?? rawItems[0];
        return {
          title: formatText(item.title, fallback?.title ?? `Untitled insight ${index + 1}`),
          summary: formatText(item.summary, fallback?.summary ?? ""),
          link: formatLink(item.link, fallback?.link ?? "#"),
          categoryId,
          categoryName,
          sourceId: formatText((item as { sourceId?: string }).sourceId, fallback?.sourceId ?? categoryId),
          sourceName: formatText((item as { sourceName?: string }).sourceName, fallback?.sourceName ?? categoryName),
          language: fallback?.language,
          reason: formatText((item as { reason?: string }).reason, `来自 ${fallback?.sourceName}`),
        } satisfies DiscoveryItem;
      });
  } catch (error) {
    console.error("Error generating AI highlights:", error);
    return null;
  }
}

function buildFallbackHighlights(options: {
  categoryId: string;
  categoryName: string;
  rawItems: RawSourceItem[];
  limit: number;
}): DiscoveryItem[] {
  const { categoryId, categoryName, rawItems, limit } = options;
  return rawItems.slice(0, limit).map((item, index) => ({
    title: item.title || `${categoryName} Insight ${index + 1}`,
    summary: item.summary || `来自 ${item.sourceName} 的最新讨论。`,
    link: item.link || "#",
    categoryId,
    categoryName,
    sourceId: item.sourceId,
    sourceName: item.sourceName,
    language: item.language,
    reason: item.reason || `来自 ${item.sourceName}`,
  }));
}

const STATUS_PRIORITY: Record<SourceStatus["status"], number> = {
  ok: 1,
  fallback: 2,
  error: 3,
};

function mergeSourceStatuses(results: DiscoveryResult[]): SourceStatus[] {
  const merged = new Map<string, SourceStatus>();

  for (const result of results) {
    for (const status of result.meta.sourceStatuses ?? []) {
      const existing = merged.get(status.id);
      if (!existing || STATUS_PRIORITY[status.status] >= STATUS_PRIORITY[existing.status]) {
        merged.set(status.id, status);
      }
    }
  }

  return Array.from(merged.values());
}

function rebalanceBySource(items: RawSourceItem[], sourceOrder: string[], desired: number): RawSourceItem[] {
  if (items.length <= desired) {
    return items;
  }

  const buckets = new Map<string, RawSourceItem[]>();
  for (const item of items) {
    const list = buckets.get(item.sourceId) ?? [];
    list.push(item);
    buckets.set(item.sourceId, list);
  }

  const result: RawSourceItem[] = [];
  let round = 0;

  while (result.length < desired) {
    let addedInRound = false;
    for (const sourceId of sourceOrder) {
      const bucket = buckets.get(sourceId);
      if (!bucket || round >= bucket.length) {
        continue;
      }
      result.push(bucket[round]);
      addedInRound = true;
      if (result.length >= desired) break;
    }
    if (!addedInRound) break;
    round += 1;
  }

  return result;
}

export async function fetchCategoryInsights(params: FetchCategoryParams): Promise<DiscoveryResult> {
  const limit = clampLimit(params.limit, 6);
  const categoryDefinition = getDefaultCategoryById(params.categoryId);
  const candidateSourcesRaw = categoryDefinition
    ? getSourcesByCategory(params.categoryId)
    : sortSourcesByWeight(DISCOVERY_SOURCES).slice(0, 12);

  const candidateSources = candidateSourcesRaw.length > 0 ? candidateSourcesRaw : sortSourcesByWeight(DISCOVERY_SOURCES).slice(0, 12);

  const sortedSources = sortSourcesByWeight(candidateSources).slice(0, 8);
  const perSourceLimit = Math.max(4, limit);

  const outcomes = await Promise.allSettled(
    sortedSources.map(async (source) => fetchSourceItems(source, perSourceLimit))
  );

  const rawItems: RawSourceItem[] = [];
  const sourceStatuses: SourceStatus[] = [];

  outcomes.forEach((result, index) => {
    const source = sortedSources[index];
    if (!source) return;

    if (result.status === "fulfilled") {
      const outcome = result.value;
      rawItems.push(...outcome.items);

      const health = sourceHealth.get(source.id);
      sourceStatuses.push({
        id: source.id,
        title: source.title,
        status: outcome.status,
        usedFallback: outcome.usedFallback,
        fromCache: outcome.fromCache,
        lastSuccessAt: health?.lastSuccessAt ? new Date(health.lastSuccessAt).toISOString() : undefined,
        lastFailureAt: health?.lastFailureAt ? new Date(health.lastFailureAt).toISOString() : undefined,
        message: outcome.message,
      });
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason ?? "Unexpected error");
      recordSourceFailure(source, reason);
      const health = sourceHealth.get(source.id);
      sourceStatuses.push({
        id: source.id,
        title: source.title,
        status: "error",
        usedFallback: false,
        fromCache: false,
        lastSuccessAt: health?.lastSuccessAt ? new Date(health.lastSuccessAt).toISOString() : undefined,
        lastFailureAt: health?.lastFailureAt ? new Date(health.lastFailureAt).toISOString() : undefined,
        message: reason,
      });
    }
  });

  const deduped = dedupeItems(rawItems);
  const now = Date.now();
  const freshCandidates = filterRecentRawItems(deduped, now);
  const candidatePool = freshCandidates.length > 0
    ? freshCandidates
    : deduped.map((item) => ({
        ...item,
        reason: item.reason ? `${item.reason} · 近期内容` : "近期内容",
      }));

  if (candidatePool.length === 0) {
    const fallbackRaw = sortedSources
      .flatMap((source) => source.fallbackItems ?? [])
      .map((item) => ({
        title: item.title,
        summary: item.summary,
        link: item.link,
        sourceId: sortedSources[0]?.id ?? params.categoryId,
        sourceName: sortedSources[0]?.title ?? params.categoryName,
        language: sortedSources[0]?.language ?? "en",
        reason: "使用预设内容（无可用源）",
        usedFallback: true,
      } as RawSourceItem));

    const fallbackItems = buildFallbackHighlights({
      categoryId: params.categoryId,
      categoryName: params.categoryName,
      rawItems: fallbackRaw,
      limit,
    });

    markItemsAsSeen(fallbackItems, now);

    return {
      id: params.categoryId,
      title: params.categoryName,
      description:
        categoryDefinition?.description ?? `AI curated stories for ${params.categoryName}`,
      items: fallbackItems,
      retrievedAt: new Date().toISOString(),
      meta: {
        fetchedSourceCount: sourceStatuses.length,
        rawItemCount: 0,
        usedAI: false,
        sourceStatuses,
      },
    };
  }

  const sliceForAI = rebalanceBySource(candidatePool, sortedSources.map((source) => source.id), limit * 3);

  // Skip AI processing for GitHub and ProductHunt categories for faster responses
  if (params.categoryId === "github" || params.categoryId === "producthunt") {
    const directItems = buildFallbackHighlights({
      categoryId: params.categoryId,
      categoryName: params.categoryName,
      rawItems: sliceForAI,
      limit,
    });

    markItemsAsSeen(directItems, now);

    return {
      id: params.categoryId,
      title: params.categoryName,
      description: categoryDefinition?.description ?? `Direct API results for ${params.categoryName}`,
      items: directItems,
      retrievedAt: new Date().toISOString(),
      meta: {
        fetchedSourceCount: sortedSources.length,
        rawItemCount: candidatePool.length,
        usedAI: false,
        sourceStatuses,
      },
    };
  }

  const aiHighlights = await generateHighlightsWithAI({
    category: categoryDefinition,
    categoryId: params.categoryId,
    categoryName: params.categoryName,
    userPrompt: params.userPrompt,
    limit,
    rawItems: sliceForAI,
  });

  const items = aiHighlights ?? buildFallbackHighlights({
    categoryId: params.categoryId,
    categoryName: params.categoryName,
    rawItems: sliceForAI,
    limit,
  });

  markItemsAsSeen(items, now);

  return {
    id: params.categoryId,
    title: params.categoryName,
    description:
      categoryDefinition?.description ?? `AI curated stories for ${params.categoryName}`,
    items,
    retrievedAt: new Date().toISOString(),
    meta: {
      fetchedSourceCount: sortedSources.length,
      rawItemCount: candidatePool.length,
      usedAI: Boolean(aiHighlights),
      sourceStatuses,
    },
  };
}

export async function fetchAggregatedInsights(categories: Array<{ id: string; name: string; prompt: string }>, limit: number) {
  const resolved = await Promise.all(
    categories.map((category) =>
      fetchCategoryInsights({
        categoryId: category.id,
        categoryName: category.name,
        userPrompt: category.prompt,
        limit,
      })
    )
  );

  const unique = new Map<string, DiscoveryItem>();

  for (const result of resolved) {
    for (const item of result.items) {
      const key = item.link || item.title;
      if (unique.has(key)) continue;

      unique.set(key, {
        title: item.title,
        summary: item.summary,
        link: item.link,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        sourceId: item.sourceId,
        sourceName: item.sourceName,
        language: item.language,
        reason: item.reason ?? `来自 ${item.sourceName}`,
      });
    }
  }

  const combinedItems = Array.from(unique.values());

  const maxItems = Math.max(limit * categories.length, limit * 2);

  return {
    id: "all",
    title: "AI Highlights",
    description: "AI generated picks merged from every category you follow",
    items: combinedItems.slice(0, maxItems),
    retrievedAt: new Date().toISOString(),
    meta: {
      fetchedSourceCount: resolved.reduce((acc, cur) => acc + cur.meta.fetchedSourceCount, 0),
      rawItemCount: combinedItems.length,
      usedAI: resolved.some((result) => result.meta.usedAI),
      sourceStatuses: mergeSourceStatuses(resolved),
    },
  } satisfies DiscoveryResult;
}

export function getDefaultCategoriesSnapshot() {
  return DEFAULT_DISCOVERY_CATEGORIES.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    prompt: category.prompt,
  }));
}
