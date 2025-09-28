export type DiscoveryFetchStrategy = "rss" | "jina" | "github_trending_api" | "producthunt_api" | "search";

export type DiscoverySourceConfig = {
  id: string;
  title: string;
  strategy: DiscoveryFetchStrategy;
  url: string;
  language: "en" | "zh";
  categories: string[];
  weight?: number;
  options?: Record<string, unknown>;
  fallbackItems?: Array<{
    title: string;
    summary: string;
    link: string;
  }>;
};

export const DISCOVERY_SOURCES: DiscoverySourceConfig[] = [
  {
    id: "openai-blog",
    title: "OpenAI News",
    strategy: "jina",
    url: "https://openai.com/news/",
    language: "en",
    categories: ["ai"],
    weight: 1.0,
    fallbackItems: [
      {
        title: "OpenAI 发布最新的多模态模型升级",
        summary: "OpenAI 团队分享了对 GPT 系列的多模态能力改进，并强调企业级使用场景。",
        link: "https://openai.com/blog"
      },
      {
        title: "ChatGPT 产品路线更新",
        summary: "官方介绍了 ChatGPT 在协作模式、插件生态和隐私控制方面的新进展。",
        link: "https://openai.com/blog"
      }
    ]
  },
  {
    id: "anthropic-news",
    title: "Anthropic Newsroom",
    strategy: "jina",
    url: "https://www.anthropic.com/news",
    language: "en",
    categories: ["ai"],
    weight: 0.9,
    fallbackItems: [
      {
        title: "Claude 平台引入更细粒度的安全控制",
        summary: "Anthropic 宣布在企业版 Claude 中提供更细致的安全与可审计配置。",
        link: "https://www.anthropic.com/news"
      }
    ]
  },
  {
    id: "deepmind-blog",
    title: "Google DeepMind",
    strategy: "rss",
    url: "https://www.deepmind.com/blog/rss.xml",
    language: "en",
    categories: ["ai", "tech"],
    weight: 0.8,
    fallbackItems: [
      {
        title: "DeepMind 发布最新科学研究协助工具",
        summary: "Google DeepMind 分享了一款用于科研文献阅读与假设生成的 AI 助手。",
        link: "https://www.deepmind.com/blog"
      }
    ]
  },
  {
    id: "google-research",
    title: "Google Research Blog",
    strategy: "rss",
    url: "https://blog.research.google/atom.xml",
    language: "en",
    categories: ["ai", "tech"],
    weight: 0.7,
    fallbackItems: [
      {
        title: "Google 分享多模态搜索的研究进展",
        summary: "Google Research 团队展示了如何结合视觉与文本信号提升搜索体验。",
        link: "https://blog.research.google"
      }
    ]
  },
  {
    id: "huggingface-blog",
    title: "Hugging Face Blog",
    strategy: "rss",
    url: "https://huggingface.co/blog/feed.xml",
    language: "en",
    categories: ["ai", "developer"],
    weight: 0.6,
    fallbackItems: [
      {
        title: "开源模型社区的新协作工具",
        summary: "Hugging Face 推出了一系列改进开源模型协作体验的功能。",
        link: "https://huggingface.co/blog"
      }
    ]
  },
  {
    id: "github-trending-ai",
    title: "GitHub Trending (AI)",
    strategy: "github_trending_api",
    url: "https://github-trending-api.de.a9sapp.eu/repositories",
    language: "en",
    categories: ["ai", "tech", "developer", "launch"],
    weight: 0.6,
    options: {
      language: "typescript",
      since: "daily"
    },
    fallbackItems: [
      {
        title: "开源项目：LLM Engine CLI",
        summary: "一个帮助开发者快速部署和测试大模型推理接口的开源 CLI 工具。",
        link: "https://github.com/trending"
      }
    ]
  },
  {
    id: "ai-news-search",
    title: "AI News Search",
    strategy: "search",
    url: "https://serpapi.com/search.json",
    language: "en",
    categories: ["ai"],
    weight: 0.5,
    options: {
      provider: "serpapi",
      engine: "google_news",
      query: "artificial intelligence breakthroughs OR frontier AI research",
      num: 10
    },
    fallbackItems: [
      {
        title: "AI Weekly: Frontier 模型最新动态",
        summary: "概览全球主要实验室在安全、算力和模型能力方面的发布。",
        link: "https://aiweekly.co"
      }
    ]
  },
  {
    id: "hn-frontpage-ai",
    title: "Hacker News (AI)",
    strategy: "rss",
    url: "https://hnrss.org/newest?q=ai",
    language: "en",
    categories: ["ai", "tech", "developer"],
    weight: 0.5,
    fallbackItems: [
      {
        title: "社区讨论：自托管小模型的最佳实践",
        summary: "Hacker News 上关于如何在本地运行轻量级开源模型的热门讨论。",
        link: "https://news.ycombinator.com"
      }
    ]
  },
  {
    id: "36kr-newsflash",
    title: "36氪快讯",
    strategy: "rss",
    url: "https://36kr.com/feed",
    language: "zh",
    categories: ["business", "ai"],
    weight: 0.6,
    fallbackItems: [
      {
        title: "36氪：多家 AI 初创完成新一轮融资",
        summary: "36氪 报道了国内多家 AI 创业公司的最新融资动态。",
        link: "https://36kr.com"
      }
    ]
  },
  {
    id: "techcrunch",
    title: "TechCrunch",
    strategy: "rss",
    url: "https://techcrunch.com/feed/",
    language: "en",
    categories: ["business", "product", "ai"],
    weight: 0.5,
    fallbackItems: [
      {
        title: "TechCrunch：AI 初创聚焦企业自动化",
        summary: "TechCrunch 报道一批 AI 初创公司如何切入企业自动化领域。",
        link: "https://techcrunch.com"
      }
    ]
  },
  {
    id: "producthunt-daily",
    title: "Product Hunt Daily",
    strategy: "rss",
    url: "https://www.producthunt.com/feed",
    language: "en",
    categories: ["product", "business", "launch"],
    weight: 0.6,
    fallbackItems: [
      {
        title: "Product Hunt 今日热门：AI 驱动的知识助手",
        summary: "一款主打个性化知识探索体验的新产品登上 Product Hunt 热门。",
        link: "https://www.producthunt.com"
      }
    ]
  },
  {
    id: "designdrop",
    title: "DESIGNDROP",
    strategy: "rss",
    url: "https://rsshub.app/designdrop",
    language: "en",
    categories: ["product"],
    fallbackItems: [
      {
        title: "DesignDrop：AI 参与的产品设计流程案例",
        summary: "DesignDrop 分享了一个将生成式 AI 引入设计流程的案例研究。",
        link: "https://designdrop.io"
      }
    ]
  },
  {
    id: "devto",
    title: "Dev.to",
    strategy: "rss",
    url: "https://dev.to/feed",
    language: "en",
    categories: ["developer"],
    weight: 0.5,
    fallbackItems: [
      {
        title: "Dev.to 精选：如何在项目中引入 AI 代码助手",
        summary: "社区文章总结了在团队内推广 AI 代码助手的步骤和注意事项。",
        link: "https://dev.to"
      }
    ]
  },
  {
    id: "smashingmagazine",
    title: "Smashing Magazine",
    strategy: "rss",
    url: "https://www.smashingmagazine.com/feed/",
    language: "en",
    categories: ["developer", "product"],
    fallbackItems: [
      {
        title: "Smashing Magazine：AI 辅助的可访问性设计指南",
        summary: "文章讨论了如何利用 AI 工具提升网页无障碍设计。",
        link: "https://www.smashingmagazine.com"
      }
    ]
  },
  {
    id: "remotive",
    title: "Remotive",
    strategy: "rss",
    url: "https://remotive.com/remote-jobs/feed",
    language: "en",
    categories: ["remote"],
    fallbackItems: [
      {
        title: "Remotive：AI 公司的远程招聘趋势",
        summary: "Remotive 汇总了近期开启远程招聘的 AI 公司与岗位类别。",
        link: "https://remotive.com"
      }
    ]
  },
  {
    id: "weworkremotely",
    title: "We Work Remotely",
    strategy: "rss",
    url: "https://weworkremotely.com/remote-jobs.rss",
    language: "en",
    categories: ["remote"],
    fallbackItems: [
      {
        title: "WWR：分布式团队的工程招聘需求上升",
        summary: "We Work Remotely 介绍了一批针对远程工程师的全职岗位。",
        link: "https://weworkremotely.com"
      }
    ]
  },
  {
    id: "remoteok",
    title: "Remote OK",
    strategy: "rss",
    url: "https://remoteok.com/remote-jobs.rss",
    language: "en",
    categories: ["remote"],
    fallbackItems: [
      {
        title: "RemoteOK：AI 产品团队的全球招聘",
        summary: "RemoteOK 上分享了多家 AI 产品团队的全球远程招聘信息。",
        link: "https://remoteok.com"
      }
    ]
  },
  {
    id: "nomadlist",
    title: "Nomad List",
    strategy: "jina",
    url: "https://nomadlist.com/blog",
    language: "en",
    categories: ["remote"],
    fallbackItems: [
      {
        title: "Nomad List：数字游民分享的远程团队协作经验",
        summary: "Nomad List 整理了近期社区中关于跨时区协作的经验总结。",
        link: "https://nomadlist.com/blog"
      }
    ]
  },
  {
    id: "linuxdo",
    title: "Linux.do 热帖",
    strategy: "jina",
    url: "https://linux.do/latest",
    language: "zh",
    categories: ["tech", "developer"],
    fallbackItems: [
      {
        title: "Linux.do：自建 AI 服务的最佳实践讨论",
        summary: "社区成员分享了在自建 AI 推理服务时的硬件选择与容器化方案。",
        link: "https://linux.do"
      }
    ]
  },
  {
    id: "v2ex-programming",
    title: "V2EX 编程",
    strategy: "rss",
    url: "https://www.v2ex.com/index.xml",
    language: "zh",
    categories: ["developer", "tech"],
    fallbackItems: [
      {
        title: "V2EX：小团队如何引入 AI 开发流程",
        summary: "V2EX 上的讨论聚焦于小团队如何在项目中融入 AI 代码生成。",
        link: "https://www.v2ex.com"
      }
    ]
  },
  {
    id: "a16z-blog",
    title: "a16z Blog",
    strategy: "rss",
    url: "https://a16z.com/feed/",
    language: "en",
    categories: ["business", "ai"],
    fallbackItems: [
      {
        title: "a16z：生成式 AI 创业的新市场机会",
        summary: "Andreessen Horowitz 团队分享了生成式 AI 创业公司的最新赛道观察。",
        link: "https://a16z.com"
      }
    ]
  },
  {
    id: "sequoia-arc",
    title: "Sequoia Arc",
    strategy: "rss",
    url: "https://www.sequoiacap.com/article/feed/",
    language: "en",
    categories: ["business"],
    fallbackItems: [
      {
        title: "红杉：AI 公司走向全球化的策略建议",
        summary: "Sequoia Arc 分享了多家 AI 投资组合的全球化执行经验。",
        link: "https://www.sequoiacap.com"
      }
    ]
  },
  {
    id: "notion-blog",
    title: "Notion Blog",
    strategy: "rss",
    url: "https://www.notion.so/blog/rss.xml",
    language: "en",
    categories: ["product"],
    fallbackItems: [
      {
        title: "Notion：AI 辅助文档的新模板",
        summary: "Notion 团队介绍了结合 AI 的知识管理新模板和自动化能力。",
        link: "https://www.notion.so/blog"
      }
    ]
  },
  {
    id: "figma-blog",
    title: "Figma Blog",
    strategy: "rss",
    url: "https://www.figma.com/blog/feed.xml",
    language: "en",
    categories: ["product", "developer"],
    fallbackItems: [
      {
        title: "Figma：AI 在界面设计交付中的角色",
        summary: "Figma 团队展示了如何借助 AI 功能提升设计交付效率。",
        link: "https://www.figma.com/blog"
      }
    ]
  },
  {
    id: "byrslf-growth",
    title: "Byrslf Growth",
    strategy: "rss",
    url: "https://rsshub.app/byrslf/notes",
    language: "zh",
    categories: ["product", "business"],
    fallbackItems: [
      {
        title: "半佛仙人：增长实验的最新观察",
        summary: "作者分享了关于 C 端产品增长实验的最新心得和踩坑记录。",
        link: "https://weibo.com"
      }
    ]
  },
  {
    id: "github-trending",
    title: "GitHub Trending",
    strategy: "github_trending_api",
    url: "https://github-trending-api.de.a9sapp.eu/repositories",
    language: "en",
    categories: ["github"],
    weight: 1.0,
    options: {
      since: "daily"
    },
    fallbackItems: [
      {
        title: "Trending Repository: AI Code Assistant",
        summary: "A popular AI-powered code completion tool with advanced language support.",
        link: "https://github.com/trending"
      },
      {
        title: "Open Source Framework: Full-Stack TypeScript",
        summary: "Modern full-stack TypeScript framework gaining momentum in the developer community.",
        link: "https://github.com/trending"
      }
    ]
  },
  {
    id: "product-trending",
    title: "ProductHunt Trending",
    strategy: "producthunt_api",
    url: "https://api.producthunt.com/v2/api/graphql",
    language: "en",
    categories: ["producthunt"],
    weight: 1.0,
    fallbackItems: [
      {
        title: "Featured Product: AI-Powered Productivity Suite",
        summary: "A comprehensive productivity suite that integrates AI to streamline workflows.",
        link: "https://www.producthunt.com"
      },
      {
        title: "Trending Launch: Design Collaboration Tool",
        summary: "A new design tool that enables seamless collaboration between designers and developers.",
        link: "https://www.producthunt.com"
      }
    ]
  }
];

export function getSourcesByCategory(categoryId: string) {
  return DISCOVERY_SOURCES.filter((source) => source.categories.includes(categoryId));
}

export function getGlobalFallbackSources() {
  return DISCOVERY_SOURCES.filter((source) => source.categories.length === 0);
}
