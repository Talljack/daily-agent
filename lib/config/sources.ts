export type RssSource = {
  id: string;
  title: string;
  url?: string;
  description?: string;
  limit?: number;
  dynamicSites?: string[];
  dynamicPrompt?: string;
};

export const DEFAULT_ITEMS_PER_SOURCE = 5;

export const RSS_SOURCES: RssSource[] = [
  {
    id: "tech",
    title: "Hacker News",
    url: "https://hnrss.org/frontpage",
    description: "全球技术热点",
    limit: 6,
  },
  {
    id: "business",
    title: "36氪快讯",
    url: "https://rsshub.app/36kr/newsflashes",
    description: "科技商业快讯",
    limit: 6,
    dynamicSites: ["36kr.com"],
    dynamicPrompt: "36氪 科技 创业 快讯 最新",
  },
  {
    id: "dev",
    title: "Dev.to 热门",
    url: "https://dev.to/feed",
    description: "开发者社区热门文章",
    limit: 6,
  },
  {
    id: "remote",
    title: "RemoteOK 远程职位",
    url: "https://remoteok.io/remote-jobs.rss",
    description: "最新远程工作机会",
    limit: 6,
  },
  {
    id: "reddit",
    title: "Reddit 编程",
    url: "https://www.reddit.com/r/programming/.rss",
    description: "Reddit 编程讨论热点",
    limit: 6,
  },
  {
    id: "product",
    title: "知乎热榜",
    url: "https://rsshub.app/zhihu/hotlist",
    description: "产品和设计相关热门讨论",
    limit: 6,
    dynamicSites: ["zhihu.com"],
    dynamicPrompt: "知乎 热榜 产品 设计 科技 热点",
  },
];

// 特殊数据源 (需要API调用)
export const SPECIAL_SOURCES = [
  {
    id: "github-trending",
    title: "GitHub Trending",
    type: "api" as const,
    description: "今日GitHub趋势项目",
    limit: 6,
  },
  {
    id: "product-trending",
    title: "Product Hunt",
    type: "api" as const,
    description: "Product Hunt今日热门产品",
    limit: 6,
  },
];
