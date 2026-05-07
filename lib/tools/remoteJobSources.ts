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
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
        content,
      };
    })
    .filter((item) => item.link && looksLikeRemoteDevJob(item.title, item.content))
    .slice(0, limit);
}

export async function fetchV2exRemoteTopics(limit = 6): Promise<RemoteJobItem[]> {
  const feed = await fetchFeed(V2EX_REMOTE_FEED_URL);

  return (feed.items ?? [])
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
    .slice(0, limit)
    .map((item) => ({
      ...item,
      content: item.content || `来自 V2EX 远程节点的岗位帖子，建议打开原帖确认联系方式与时区要求。节点入口：${V2EX_REMOTE_TAB_LINK}`,
    }));
}
