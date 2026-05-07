type RemoteSourceItem = {
  title: string;
  link: string;
  summary: string;
};

type RemoteSourceResult = {
  id: string;
  title: string;
  items: RemoteSourceItem[];
};

type RemoteJobGroup = "domestic_direct" | "domestic_confirm" | "overseas";
type RemoteJobPriority = "S" | "A" | "B";

type StructuredRemoteJob = {
  title: string;
  company: string;
  sourceLabel: string;
  sourceId: string;
  link: string;
  contactEmail?: string;
  priority: RemoteJobPriority;
  group: RemoteJobGroup;
  remoteScope: string;
  timezoneRequirement: string;
  englishRequirement: string;
  techMatch: string;
  fitReason: string;
  risks: string;
  suggestedAction: string;
  score: number;
};

const DOMESTIC_SOURCE_IDS = new Set(["v2ex-remote", "eleduck"]);
const SOURCE_PRIORITY: Record<string, number> = {
  "v2ex-remote": 5,
  eleduck: 4,
  remotive: 3,
  weworkremotely: 2,
  remote: 1,
};

const POSITIVE_ROLE_KEYWORDS = [
  "engineer",
  "developer",
  "backend",
  "frontend",
  "full-stack",
  "full stack",
  "devops",
  "sre",
  "architect",
  "qa",
  "golang",
  "python",
  "react",
  "flutter",
  "rust",
  "agent",
  "llm",
  "mcp",
  "开发",
  "工程师",
  "前端",
  "后端",
  "全栈",
  "架构师",
  "测试",
  "运维",
];

const NEGATIVE_ROLE_KEYWORDS = [
  "财务",
  "产品经理",
  "项目经理",
  "运营",
  "商务",
  "销售",
  "市场",
  "seo",
  "增长",
  "讲师",
  "instructor",
  "client services",
  "business development",
  "conversion rate optimization",
  "director of conversion",
  "用户举报",
  "求合作",
  "求带",
  "求职",
  "寻求远程兼职合作",
  "customer support",
  "customer service",
  "support manager",
  "writer",
  "writing",
  "copywriter",
  "marketing",
  "growth marketing",
  "合作",
  "导师",
];

const TECH_KEYWORDS: Array<{ label: string; keywords: string[] }> = [
  { label: "AI/Agent 工程", keywords: ["agent", "ai", "llm", "rag", "mcp", "workflow"] },
  { label: "React/TypeScript", keywords: ["react", "typescript", "javascript", "frontend", "前端", "next.js", "nextjs"] },
  { label: "Python/FastAPI", keywords: ["python", "fastapi"] },
  { label: "Go/Golang", keywords: ["golang", " go ", "go-", "go/", "golang/"] },
  { label: "Node.js/全栈", keywords: ["node", "node.js", "full stack", "full-stack", "全栈"] },
  { label: "Three.js/Web 3D", keywords: ["three.js", "threejs", "r3f", "webgl", "3d"] },
  { label: "平台工程/可观测", keywords: ["sre", "devops", "docker", "k8s", "kubernetes", "observability", "otel", "opentelemetry", "sentry"] },
  { label: "数据/检索", keywords: ["retrieval", "rerank", "vector", "search", "milvus", "embedding", "data platform", "数据"] },
];

function normalize(text: string) {
  return ` ${text.toLowerCase()} `;
}

function keywordExists(text: string, keyword: string) {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  if (/[\u4e00-\u9fa5]/.test(lowerKeyword) || /[.\-\/\s]/.test(lowerKeyword)) {
    return lowerText.includes(lowerKeyword);
  }

  return new RegExp(`(^|[^a-z0-9])${lowerKeyword}([^a-z0-9]|$)`, "i").test(lowerText);
}

function sanitizeLink(link: string) {
  return link.replace(/#.*$/, "");
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function extractEmail(text: string) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0];
}

function pickBestRoleFromSummary(summary: string) {
  const preferredSnippets = [
    "python 全栈开发工程师",
    "go 开发工程师",
    "高级 go 开发工程师",
    "高级前端架构师",
    "flutter 开发工程师",
    "高级 web sdk 开发工程师",
    "c++后端开发工程师",
    "ai 爬虫工程师",
  ];

  const lowerSummary = summary.toLowerCase();
  for (const snippet of preferredSnippets) {
    if (lowerSummary.includes(snippet)) {
      return `${snippet.replace(/\b\w/g, (char) => char.toUpperCase())}（多岗位）`;
    }
  }

  return null;
}

function extractCompany(title: string, summary: string, sourceId: string) {
  const normalizedTitle = title.trim();

  const pipeMatch = normalizedTitle.match(/^(.+?)\s+\|\s+(.+)$/);
  if (pipeMatch) {
    return {
      roleTitle: pipeMatch[1].trim(),
      company: pipeMatch[2].trim(),
    };
  }

  const atMatch = normalizedTitle.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    return {
      roleTitle: atMatch[1].trim(),
      company: atMatch[2].trim(),
    };
  }

  if (sourceId === "v2ex-remote" && /CH 传媒|传媒|科技|Studio|Labs|团队|公司/.test(summary)) {
    const companyMatch = summary.match(/([A-Za-z0-9\u4e00-\u9fa5·&(). -]{2,40}(传媒|科技|Studio|Labs|团队|公司))/);
    if (companyMatch) {
      const betterRole = pickBestRoleFromSummary(summary);
      return {
        roleTitle: betterRole ?? normalizedTitle,
        company: companyMatch[1].trim(),
      };
    }
  }

  return {
    roleTitle: normalizedTitle,
    company: "未公开",
  };
}

function extractRemoteScope(text: string, sourceId: string) {
  if (/全球远程|worldwide|global remote|work from anywhere/i.test(text)) {
    return "全球远程办公（原帖显示）";
  }
  if (/remote（标题明确）|标题明确 remote|标题明确远程/i.test(text)) {
    return "远程办公（标题明确）";
  }
  if (/国内远程|remote cn|中国时区/i.test(text)) {
    return "国内远程 / 中国时区友好（以原帖为准）";
  }
  if (/兼职/.test(text)) {
    return "远程兼职（以原帖为准）";
  }
  if (/remote|远程/.test(text)) {
    return DOMESTIC_SOURCE_IDS.has(sourceId) ? "远程办公（请打开原帖确认）" : "海外远程 / 全球远程（以原帖为准）";
  }
  return "未说明，建议打开原帖确认";
}

function extractTimezone(text: string, sourceId: string) {
  const utcMatch = text.match(/utc\s*([+-]\d+)/i);
  if (utcMatch) {
    return `UTC${utcMatch[1]}（原帖提及）`;
  }
  if (/东四区/.test(text)) {
    return "东四区（UTC+4）偏好";
  }
  if (/中国时区|亚洲时区/.test(text)) {
    return "中国 / 亚洲时区可协作";
  }
  if (/europe|eu only/i.test(text)) {
    return "欧洲时区或本地优先，需确认是否接受中国时区";
  }
  if (/us only|usa only|north america/i.test(text)) {
    return "可能偏美国时区或本地雇佣，需确认";
  }
  return DOMESTIC_SOURCE_IDS.has(sourceId)
    ? "未说明，建议确认是否接受中国时区长期协作"
    : "未说明，建议确认是否接受中国 / 亚洲时区";
}

function extractEnglishRequirement(text: string, sourceId: string) {
  if (/英文沟通|english communication|fluent english|strong english/i.test(text)) {
    return "需要较强英文沟通";
  }
  if (/英语|英文|english/i.test(text)) {
    return "需要基础英文读写";
  }
  if (/全球远程|worldwide|global remote/i.test(text) && !DOMESTIC_SOURCE_IDS.has(sourceId)) {
    return "需要基础英文读写";
  }
  return DOMESTIC_SOURCE_IDS.has(sourceId)
    ? "未说明，建议投递前确认"
    : "需要基础英文读写";
}

function extractTechMatch(text: string) {
  const labels = TECH_KEYWORDS
    .filter((entry) => entry.keywords.some((keyword) => keywordExists(text, keyword)))
    .map((entry) => entry.label);

  return labels.length > 0 ? unique(labels).slice(0, 4).join("、") : "原帖提及远程开发相关职责，建议打开链接确认具体技术栈";
}

function calculateScore(text: string, sourceId: string) {
  let score = DOMESTIC_SOURCE_IDS.has(sourceId) ? 4 : 2;

  if (["agent", "llm", "rag", "mcp", "ai", "智能体"].some((keyword) => keywordExists(text, keyword))) score += 3;
  if (["react", "typescript", "frontend", "前端"].some((keyword) => keywordExists(text, keyword))) score += 2;
  if (["python", "fastapi", "golang", "node", "full stack", "全栈", "后端"].some((keyword) => keywordExists(text, keyword))) score += 2;
  if (["global remote", "worldwide", "全球远程", "remote", "远程"].some((keyword) => keywordExists(text, keyword))) score += 1;
  if (["senior", "高级", "lead", "staff"].some((keyword) => keywordExists(text, keyword))) score += 1;

  if (["兼职", "part-time"].some((keyword) => keywordExists(text, keyword))) score -= 1;
  if (NEGATIVE_ROLE_KEYWORDS.some((keyword) => keywordExists(text, keyword))) score -= 3;
  if (["intern", "实习", "junior", "初级"].some((keyword) => keywordExists(text, keyword))) score -= 1;

  return score;
}

function isTargetJob(title: string, text: string) {
  const positiveHits = POSITIVE_ROLE_KEYWORDS.filter((keyword) => keywordExists(title, keyword) || keywordExists(text, keyword));
  const negativeHits = NEGATIVE_ROLE_KEYWORDS.filter((keyword) => keywordExists(title, keyword) || keywordExists(text, keyword));

  if (negativeHits.length > 0) {
    return false;
  }

  if (positiveHits.length === 0) {
    return false;
  }

  return true;
}

function determineGroup(score: number, sourceId: string, text: string): RemoteJobGroup {
  if (!DOMESTIC_SOURCE_IDS.has(sourceId)) {
    return "overseas";
  }

  const hasClearRemote = /全球远程|远程办公|remote/i.test(text);
  const hasStrongFit = ["agent", "ai", "react", "typescript", "python", "fastapi", "golang", "node", "全栈"].some((keyword) => keywordExists(text, keyword));
  return hasClearRemote && hasStrongFit && score >= 6 ? "domestic_direct" : "domestic_confirm";
}

function determinePriority(score: number, group: RemoteJobGroup): RemoteJobPriority {
  if (group === "domestic_direct" && score >= 8) return "S";
  if (score >= 5) return "A";
  return "B";
}

function buildFitReason(techMatch: string, sourceId: string) {
  if (/AI\/Agent 工程/.test(techMatch)) {
    return "可重点对齐你在 Agent、RAG、语义检索、工具链平台化和评测闭环上的落地经验";
  }
  if (/React\/TypeScript/.test(techMatch)) {
    return "适合突出你在 React/TypeScript 前端工程、平台控制台和复杂交互交付上的经验";
  }
  if (/Python\/FastAPI|Go\/Golang|Node\.js\/全栈/.test(techMatch)) {
    return "可以结合你在 FastAPI、Go、Node.js、数据平台和服务工程化方面的经验来提升匹配度";
  }
  return DOMESTIC_SOURCE_IDS.has(sourceId)
    ? "与远程开发和全栈工程方向相关，建议优先核验后投递"
    : "可作为海外远程补充通道，适合扩展全球岗位投递面";
}

function buildRisks(sourceId: string, company: string, text: string) {
  const risks: string[] = [];

  if (company === "未公开") {
    risks.push("公司信息披露有限");
  }
  if (sourceId === "eleduck") {
    risks.push("电鸭详情页当前可能需验证，以下信息主要基于 RSS 摘要，联系方式和完整要求需打开原帖确认");
  }
  if (!/english|英文|英语/i.test(text) && !DOMESTIC_SOURCE_IDS.has(sourceId)) {
    risks.push("海外岗位默认存在语言与协作门槛");
  }
  if (["兼职", "part-time"].some((keyword) => keywordExists(text, keyword))) {
    risks.push("岗位可能偏兼职或非全职");
  }
  if (/europe|eu only|us only|north america/i.test(text)) {
    risks.push("可能存在地区或雇佣方式限制");
  }
  if (risks.length === 0) {
    risks.push("完整 JD、时区要求和用工形式需进一步核验");
  }

  return risks.join("；");
}

function buildSuggestedAction(sourceId: string, link: string, text: string) {
  const email = extractEmail(text);
  if (email) {
    return `可直接邮件投递到 ${email}；建议先问清远程、合同和时区要求，再发送定制简历`;
  }
  if (sourceId === "v2ex-remote") {
    return "优先打开 V2EX 原帖确认联系方式、远程方式和技术要求，再按匹配技术栈定制简历";
  }
  if (sourceId === "eleduck") {
    return "先打开电鸭原帖确认联系方式与远程细节；若详情页受限，可基于 RSS 摘要做保守跟进";
  }
  if (/remoteok|remotive|we work remotely/i.test(sourceId)) {
    return `先确认岗位是否接受全球远程 / 中国时区，再从原帖或公司官网完成投递：${link}`;
  }
  return "先确认岗位仍开放、是否接受中国时区协作，再决定是否投入定制投递";
}

function sourceLabel(result: RemoteSourceResult) {
  if (result.id === "v2ex-remote") return "V2EX";
  if (result.id === "eleduck") return "电鸭";
  return result.title;
}

function toStructuredJobs(results: RemoteSourceResult[]) {
  const jobs = results
    .flatMap((result) =>
      result.items.map((item) => {
        const link = sanitizeLink(item.link);
        const source = sourceLabel(result);
        const text = `${item.title}\n${item.summary}`;
        const contactEmail = extractEmail(text);
        const { roleTitle, company } = extractCompany(item.title, item.summary, result.id);
        const remoteScope = extractRemoteScope(text, result.id);
        const timezoneRequirement = extractTimezone(text, result.id);
        const englishRequirement = extractEnglishRequirement(text, result.id);
        const techMatch = extractTechMatch(text);
        const score = calculateScore(text, result.id);
        const group = determineGroup(score, result.id, text);
        const priority = determinePriority(score, group);

        return {
          title: roleTitle,
          company,
          sourceLabel: source,
          sourceId: result.id,
          link,
          contactEmail,
          priority,
          group,
          remoteScope,
          timezoneRequirement,
          englishRequirement,
          techMatch,
          fitReason: buildFitReason(techMatch, result.id),
          risks: buildRisks(result.id, company, text),
          suggestedAction: buildSuggestedAction(result.id, link, text),
          score,
        } satisfies StructuredRemoteJob;
      }),
    )
    .filter((job) => isTargetJob(job.title, `${job.title}\n${job.techMatch}\n${job.fitReason}\n${job.risks}`))
    .filter((job, index, jobs) => jobs.findIndex((candidate) => candidate.link === job.link) === index)
    .sort((a, b) => (b.score + (SOURCE_PRIORITY[b.sourceId] ?? 0)) - (a.score + (SOURCE_PRIORITY[a.sourceId] ?? 0)));

  const deduped = jobs.filter((job, index, allJobs) => {
    if (!job.contactEmail || job.company === "未公开") {
      return true;
    }

    const firstIndex = allJobs.findIndex(
      (candidate) =>
        candidate.contactEmail === job.contactEmail &&
        candidate.company === job.company &&
        candidate.sourceId === job.sourceId,
    );

    return firstIndex === index;
  });

  return deduped.filter((job, index, allJobs) => {
    const titleKey = job.title.replace(/（多岗位）/g, "").replace(/\s+/g, "").toLowerCase();
    const firstIndex = allJobs.findIndex(
      (candidate) =>
        candidate.title.replace(/（多岗位）/g, "").replace(/\s+/g, "").toLowerCase() === titleKey &&
        candidate.company === job.company,
    );
    return firstIndex === index;
  });
}

function renderGroup(title: string, jobs: StructuredRemoteJob[]) {
  if (jobs.length === 0) return "";

  const lines = ["", `## ${title}`];
  jobs.forEach((job, index) => {
    lines.push("");
    lines.push(`${index + 1}. ${job.priority} | ${job.title} | ${job.company} | 来源：${job.sourceLabel}`);
    lines.push(`- 远程范围：${job.remoteScope}`);
    lines.push(`- 地点/时区要求：${job.timezoneRequirement}`);
    lines.push(`- 英语要求：${job.englishRequirement}`);
    lines.push(`- 技术栈匹配点：${job.techMatch}`);
    lines.push(`- 为什么适合候选人：${job.fitReason}`);
    lines.push(`- 主要风险/不确定性：${job.risks}`);
    lines.push(`- 申请链接：${job.link}`);
    lines.push(`- 建议投递动作：${job.suggestedAction}`);
  });
  return lines.join("\n");
}

export function buildRemoteJobsEmailContent(results: RemoteSourceResult[], generatedAt: string) {
  const jobs = toStructuredJobs(results);
  const domesticDirect = jobs.filter((job) => job.group === "domestic_direct").slice(0, 6);
  const domesticConfirm = jobs.filter((job) => job.group === "domestic_confirm").slice(0, 6);
  const overseas = jobs.filter((job) => job.group === "overseas").slice(0, 6);
  const displayedJobs = [...domesticDirect, ...domesticConfirm, ...overseas];
  const date = new Date(generatedAt).toLocaleDateString("zh-CN").replace(/\//g, "-");

  const lines: string[] = [];
  lines.push(`今天找到 ${displayedJobs.length} 个值得投递的岗位。`);
  lines.push("说明：已优先保留国内远程开发岗，并将海外远程岗位作为高匹配补充；具体联系方式、时区和用工方式请在投递前逐条核验。");
  lines.push(renderGroup("国内高优先级可直接投", domesticDirect));
  lines.push(renderGroup("国内可投但需确认条件", domesticConfirm));
  lines.push(renderGroup("海外高匹配补充岗位", overseas));
  lines.push("");
  lines.push("## 今日推荐投递顺序");
  displayedJobs.slice(0, 6).forEach((job, index) => {
    lines.push(`${index + 1}. ${job.sourceLabel} - ${job.title}`);
  });
  lines.push("");
  lines.push("## 建议简历关键词微调");
  lines.push("- 增加/强化：Agent Ops, Agentic Workflows, MCP Server, Tool Calling, RAG, Multimodal Retrieval, Rerank, Observability, Data Platform");
  lines.push("- 国内远程岗位优先强调：远程协作、平台工程、AI Agent 工程化落地、复杂业务闭环交付");
  lines.push("- 海外远程岗位优先强调：Senior Full-Stack Engineer, React/TypeScript, Python/FastAPI, Go, Retrieval, Platform Engineering");

  return {
    subject: `每日远程岗位推荐 - ${date}`,
    markdown: lines.filter(Boolean).join("\n"),
  };
}
