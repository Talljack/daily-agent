export type DiscoveryCategoryDefinition = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  systemPrompt: string;
  seedSourceIds: string[];
};

const BASE_SYSTEM_PROMPT = `You are a research scout whose job is to find fresh, high-authority knowledge for the given category. \
Study the provided source excerpts carefully and decide which insights are truly novel and impactful for practitioners. \
Return concise JSON results and include the original link for each item. If you are unsure about a link, use '#'. \
Keep the tone neutral and informative.`;

export const DEFAULT_DISCOVERY_CATEGORIES: DiscoveryCategoryDefinition[] = [
  {
    id: "ai",
    name: "AI Frontiers",
    description: "Breakthroughs from leading AI labs, research groups, and frontier builders",
    prompt: "latest breakthroughs from AI labs, foundation models, and frontier AI research",
    systemPrompt: `${BASE_SYSTEM_PROMPT}\nFocus specifically on cutting-edge AI research, new model releases, policy updates, and developer tools from major labs and startups. Include both global and Chinese perspectives when available.`,
    seedSourceIds: [
      "openai-blog",
      "anthropic-news",
      "deepmind-blog",
      "google-research",
      "xai-blog",
      "huggingface-blog",
      "channeled-zhihu-ai",
    ],
  },
  {
    id: "tech",
    name: "Tech & Engineering",
    description: "Major shifts across software engineering, infrastructure, and cloud ecosystems",
    prompt: "software engineering, infrastructure, developer tooling, cloud platforms",
    systemPrompt: `${BASE_SYSTEM_PROMPT}\nHighlight meaningful changes in software engineering, infrastructure, cloud services, and developer tooling.`,
    seedSourceIds: [
      "github-trending-ai",
      "hn-frontpage-ai",
      "aws-blog",
      "azure-blog",
      "google-cloud-blog",
      "linuxdo",
    ],
  },
  {
    id: "business",
    name: "Business & Strategy",
    description: "Capital flows, startup strategy, and market moves shaping tech",
    prompt: "startup funding, business strategy, market analysis, tech policy",
    systemPrompt: `${BASE_SYSTEM_PROMPT}\nSurface notable fundraising rounds, strategic moves, macro viewpoints, and policy signals relevant to technology businesses.`,
    seedSourceIds: [
      "sequoia-arc",
      "a16z-blog",
      "36kr-newsflash",
      "wall-street-journal-tech",
      "techcrunch",
      "producthunt-daily",
    ],
  },
  {
    id: "product",
    name: "Product & Design",
    description: "Launches, design explorations, and growth experiments that stand out",
    prompt: "product launches, UX patterns, growth experiments",
    systemPrompt: `${BASE_SYSTEM_PROMPT}\nEmphasize new product launches, design innovations, growth experiments, and lessons from makers.`,
    seedSourceIds: [
      "producthunt-daily",
      "designdrop",
      "notion-blog",
      "figma-blog",
      "byrslf-growth",
    ],
  },
  {
    id: "github",
    name: "GitHub Trending",
    description: "Today's trending repositories and popular open source projects",
    prompt: "trending GitHub repositories and popular open source projects",
    systemPrompt: `${BASE_SYSTEM_PROMPT}\nFocus on GitHub repositories that are trending today, including new releases, popular projects, and developer tools. Highlight what makes each project useful and why developers are interested.`,
    seedSourceIds: [
      "github-trending",
    ],
  },
  {
    id: "producthunt",
    name: "ProductHunt Trending",
    description: "Today's top Product Hunt launches and featured products",
    prompt: "Product Hunt daily launches and trending products",
    systemPrompt: `${BASE_SYSTEM_PROMPT}\nFocus on new Product Hunt launches that are gaining traction today, including innovative tools, apps, and services. Explain what makes each product interesting and its potential impact.`,
    seedSourceIds: [
      "product-trending",
    ],
  },
  {
    id: "developer",
    name: "Developer Tools",
    description: "Frameworks, libraries, and hands-on tutorials developers are buzzing about",
    prompt: "developer tooling, frameworks, open source releases, practical tutorials",
    systemPrompt: `${BASE_SYSTEM_PROMPT}\nFocus on new tools, frameworks, libraries, and highly practical tutorials valued by developers.`,
    seedSourceIds: [
      "github-trending-ai",
      "hn-frontpage-ai",
      "devto",
      "smashingmagazine",
      "v2ex-programming",
    ],
  },
  {
    id: "remote",
    name: "Remote Work",
    description: "Culture shifts, hiring markets, and playbooks for distributed teams",
    prompt: "remote work best practices, distributed teams, global hiring",
    systemPrompt: `${BASE_SYSTEM_PROMPT}\nPrioritize remote work trends, distributed team playbooks, hiring updates, and policy changes.`,
    seedSourceIds: [
      "remotive",
      "weworkremotely",
      "remoteok",
      "nomadlist",
    ],
  },
];

export function getDefaultCategoryById(id: string) {
  return DEFAULT_DISCOVERY_CATEGORIES.find((category) => category.id === id);
}
