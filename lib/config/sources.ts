export type RssSource = {
  id: string;
  title: string;
  url: string;
  description?: string;
  limit?: number;
};

export const DEFAULT_ITEMS_PER_SOURCE = 5;

export const RSS_SOURCES: RssSource[] = [
  {
    id: "zhihu",
    title: "知乎热榜",
    url: "https://rsshub.app/zhihu/hotlist",
    description: "今日热点问答与文章",
    limit: 8,
  },
  {
    id: "36kr",
    title: "36氪快讯",
    url: "https://rsshub.app/36kr/newsflashes",
    description: "科技商业快讯",
  },
  {
    id: "hn",
    title: "Hacker News",
    url: "https://hnrss.org/frontpage",
    description: "全球技术热点",
    limit: 6,
  },
  {
    id: "remote_ok",
    title: "RemoteOK 远程职位",
    url: "https://remoteok.io/remote-jobs.rss",
    description: "最新远程工作机会",
    limit: 5,
  },
  {
    id: "weworkremotely",
    title: "We Work Remotely",
    url: "https://weworkremotely.com/remote-jobs.rss",
    description: "远程工作职位聚合",
    limit: 4,
  },
  {
    id: "producthunt",
    title: "Product Hunt",
    url: "https://rsshub.app/producthunt/today",
    description: "今日产品推荐",
    limit: 5,
  },
  {
    id: "github_trending",
    title: "GitHub Trending",
    url: "https://rsshub.app/github/trending/daily",
    description: "GitHub 今日热门项目",
    limit: 6,
  },
  {
    id: "devto",
    title: "Dev.to 热门",
    url: "https://dev.to/feed",
    description: "开发者社区热门文章",
    limit: 4,
  },
];
