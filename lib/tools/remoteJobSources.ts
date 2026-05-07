import Parser from "rss-parser";

export type RemoteJobItem = {
  title: string;
  link: string;
  content: string;
};

const parser = new Parser();

const ELEDUCK_FEED_URL = "https://eleduck.com/feed/latest.xml";
const V2EX_REMOTE_FEED_URL = "https://www.v2ex.com/feed/remote.xml";
const V2EX_REMOTE_TAB_LINK = "https://www.v2ex.com/go/remote";

const JOB_TITLE_HINTS = [
  "远程",
  "全职",
  "兼职",
  "工程师",
  "开发",
  "前端",
  "后端",
  "全栈",
  "golang",
  "python",
  "react",
  "flutter",
  "agent",
  "ai",
];

const DEV_ROLE_HINTS = [
  "工程师",
  "开发",
  "前端",
  "后端",
  "全栈",
  "golang",
  "python",
  "react",
  "flutter",
  "fastapi",
  "node",
  "typescript",
  "agent",
  "llm",
  "ai",
  "rust",
];

const NEGATIVE_HINTS = [
  "求职",
  "接单",
  "咨询费",
  "推广",
  "实践机会",
  "合伙人",
  "讨论",
  "请教",
  "分享",
  "收费",
  "已结束",
];

function cleanText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\\n/g, " ")
    .replace(/\\"/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#34;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJsonLdBlocks(html: string) {
  const matches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? [];
  return matches
    .map((block) => block.replace(/^<script type="application\/ld\+json">/, "").replace(/<\/script>$/, "").trim())
    .map((block) => {
      try {
        return JSON.parse(block) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((block): block is Record<string, unknown> => Boolean(block));
}

function extractV2exDetail(html: string) {
  const jsonLdBlocks = parseJsonLdBlocks(html);
  const posting = jsonLdBlocks.find((block) => block["@type"] === "DiscussionForumPosting");

  if (!posting) {
    return "";
  }

  const headline = typeof posting.headline === "string" ? cleanText(posting.headline) : "";
  const body = typeof posting.text === "string" ? cleanText(posting.text) : "";
  const published = typeof posting.datePublished === "string" ? posting.datePublished : "";
  const author =
    posting.author &&
    typeof posting.author === "object" &&
    typeof (posting.author as { name?: string }).name === "string"
      ? (posting.author as { name: string }).name
      : "";

  const segments = [
    headline ? `岗位标题：${headline}` : "",
    author ? `发帖人：${author}` : "",
    published ? `发布时间：${published}` : "",
    body ? `正文：${body}` : "",
  ].filter(Boolean);

  return segments.join(" ");
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Daily-Agent/1.0 (+https://github.com/Talljack/daily-agent)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Unexpected status ${response.status}`);
  }

  return response.text();
}

function looksLikeRemoteDevJob(title: string, content: string) {
  const text = `${title}\n${content}`.toLowerCase();

  if (NEGATIVE_HINTS.some((token) => text.includes(token))) {
    return false;
  }

  if (!text.includes("远程") && !text.includes("remote")) {
    return false;
  }

  const hasJobHint = JOB_TITLE_HINTS.some((token) => text.includes(token));
  const hasDevHint = DEV_ROLE_HINTS.some((token) => text.includes(token));
  return hasJobHint && hasDevHint;
}

async function fetchFeed(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Daily-Agent/1.0 (+https://github.com/Talljack/daily-agent)",
      Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Unexpected status ${response.status}`);
  }

  const xml = await response.text();
  return parser.parseString(xml);
}

export async function fetchEleduckRemoteJobs(limit = 6): Promise<RemoteJobItem[]> {
  const feed = await fetchFeed(ELEDUCK_FEED_URL);

  return (feed.items ?? [])
    .map((item) => {
      const title = item.title ?? "";
      const content = cleanText(item.contentSnippet ?? item.content ?? "");
      return {
        title,
        link: item.link ?? "",
        content: `${content} 电鸭详情页当前可能需要验证，以下信息优先基于 RSS 摘要，联系方式/完整要求需打开原帖确认。`,
      };
    })
    .filter((item) => item.link && looksLikeRemoteDevJob(item.title, item.content))
    .slice(0, limit);
}

export async function fetchV2exRemoteTopics(limit = 6): Promise<RemoteJobItem[]> {
  const feed = await fetchFeed(V2EX_REMOTE_FEED_URL);

  const baseItems = (feed.items ?? [])
    .map((item) => {
      const title = item.title ?? "";
      const content = cleanText(item.contentSnippet ?? item.content ?? "");
      const link = item.link ?? "";
      return {
        title,
        link,
        content,
      };
    })
    .filter((item) => item.link.includes("/t/") && looksLikeRemoteDevJob(item.title, item.content))
    .slice(0, limit);

  const enrichedItems = await Promise.all(
    baseItems.map(async (item) => {
      try {
        const html = await fetchText(sanitizeTopicLink(item.link));
        const detail = extractV2exDetail(html);
        return {
          ...item,
          link: sanitizeTopicLink(item.link),
          content: cleanText(`${item.content} ${detail}`) || `来自 V2EX 远程节点的岗位帖子，建议打开原帖确认联系方式与时区要求。节点入口：${V2EX_REMOTE_TAB_LINK}`,
        };
      } catch {
        return {
          ...item,
          link: sanitizeTopicLink(item.link),
          content: item.content || `来自 V2EX 远程节点的岗位帖子，建议打开原帖确认联系方式与时区要求。节点入口：${V2EX_REMOTE_TAB_LINK}`,
        };
      }
    }),
  );

  return enrichedItems;
}

function sanitizeTopicLink(link: string) {
  return link.replace(/#.*$/, "");
}
