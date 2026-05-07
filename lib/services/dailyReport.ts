import { generateRemoteJobsMarkdown, generateSummary } from "@/lib/agent/dailyAgent";
import { RSS_SOURCES, DEFAULT_ITEMS_PER_SOURCE, type RssSource } from "@/lib/config/sources";
import { fetchRSS, RSSItem } from "@/lib/tools/rssTool";
import { fetchEleduckRemoteJobs, fetchV2exRemoteTopics } from "@/lib/tools/remoteJobSources";
import { fetchDynamicCategoryInsights } from "@/lib/services/discoveryAggregator";
import { hasAIConfig } from "@/lib/env";

const REMOTE_SOURCE_IDS = new Set(["remote", "v2ex-remote", "eleduck", "remotive", "weworkremotely"]);

export type DailySourceItem = {
  title: string;
  link: string;
  summary: string;
};

export type DailySourceResult = {
  id: string;
  title: string;
  description?: string;
  items: DailySourceItem[];
  error?: string;
  mode?: "dynamic" | "rss";
};

export type DailyReport = {
  generatedAt: string;
  summary: string;
  rawContent: string;
  sources: DailySourceResult[];
  emailSubject?: string;
  emailMarkdown?: string;
};

function getRemoteResults(results: DailySourceResult[]) {
  return results.filter((result) => REMOTE_SOURCE_IDS.has(result.id) && result.items.length > 0);
}

function buildRemoteEmailFallback(results: DailySourceResult[], generatedAt: string) {
  const date = new Date(generatedAt).toLocaleDateString("zh-CN");
  const domestic = results.filter((result) => result.id === "v2ex-remote" || result.id === "eleduck");
  const overseas = results.filter((result) => result.id !== "v2ex-remote" && result.id !== "eleduck");
  const allItems = results.flatMap((result) => result.items);
  const lines: string[] = [];

  lines.push(`今天找到 ${allItems.length} 个值得投递的岗位。`);
  lines.push("说明：当前邮件正文为自动降级生成版本，已优先保留国内远程岗位和可直接打开的申请链接。");

  if (domestic.length > 0) {
    lines.push("");
    lines.push("## 国内高优先级可直接投");
    let index = 1;
    for (const source of domestic) {
      for (const item of source.items) {
        lines.push("");
        lines.push(`${index}. A | ${item.title} | 未公开 | 来源：${source.title}`);
        lines.push("- 远程范围：远程（请打开原帖确认）");
        lines.push("- 地点/时区要求：未说明，建议投递前确认");
        lines.push("- 英语要求：未说明，建议投递前确认");
        lines.push(`- 技术栈匹配点：${item.summary || "请打开原帖确认技术要求"}`);
        lines.push("- 为什么适合候选人：与远程开发/全栈/前后端工程方向相关，建议优先核验后投递");
        lines.push("- 主要风险/不确定性：当前为自动抓取结果，完整 JD、联系方式与远程细节需打开原帖确认");
        lines.push(`- 申请链接：${item.link}`);
        lines.push("- 建议投递动作：先确认岗位仍开放、是否接受中国时区协作，再按匹配技术栈定制简历");
        index += 1;
      }
    }
  }

  if (overseas.length > 0) {
    lines.push("");
    lines.push("## 海外高匹配补充岗位");
    let index = 1;
    for (const source of overseas) {
      for (const item of source.items) {
        lines.push("");
        lines.push(`${index}. B | ${item.title} | 未公开 | 来源：${source.title}`);
        lines.push("- 远程范围：海外远程 / 全球远程（以原帖为准）");
        lines.push("- 地点/时区要求：未说明，建议确认是否接受中国/亚洲时区");
        lines.push("- 英语要求：需要基础英文读写或进一步确认");
        lines.push(`- 技术栈匹配点：${item.summary || "请打开原帖确认技术要求"}`);
        lines.push("- 为什么适合候选人：可作为海外补充岗位，适合扩展全球远程投递渠道");
        lines.push("- 主要风险/不确定性：海外岗位常有地域、雇佣方式或语言要求限制，需逐条核验");
        lines.push(`- 申请链接：${item.link}`);
        lines.push("- 建议投递动作：优先确认是否支持全球远程或承包合作，再决定是否投入定制投递");
        index += 1;
      }
    }
  }

  lines.push("");
  lines.push("## 今日推荐投递顺序");
  allItems.slice(0, 6).forEach((item, index) => {
    lines.push(`${index + 1}. ${item.title}`);
  });

  lines.push("");
  lines.push("## 建议简历关键词微调");
  lines.push("- 强化：Agent Ops, Full-Stack, React/TypeScript, Python/FastAPI, Go, RAG, MCP, Observability");
  lines.push("- 国内远程优先强调：远程协作、平台工程、AI Agent 工程化落地");
  lines.push("- 海外远程优先强调：Full-Stack Engineer, AI/LLM Agent, Retrieval, Platform Engineering");

  return {
    subject: `每日远程岗位推荐 - ${date}`,
    markdown: lines.join("\n"),
  };
}

function sortSources(results: DailySourceResult[]) {
  return [...results].sort((a, b) => {
    const aIsRemote = REMOTE_SOURCE_IDS.has(a.id);
    const bIsRemote = REMOTE_SOURCE_IDS.has(b.id);

    if (aIsRemote === bIsRemote) return 0;
    return aIsRemote ? -1 : 1;
  });
}

async function loadRssItems(sourceUrl: string, limit?: number): Promise<RSSItem[]> {
  try {
    const { items } = await fetchRSS(sourceUrl, limit, { cacheTtlMs: 10 * 60 * 1000, retries: 2 });
    return items;
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    throw new Error(`拉取 ${sourceUrl} 失败: ${message}`);
  }
}

async function loadDailySourceItems(source: RssSource, limit: number) {
  if (source.sourceType === "remote-v2ex") {
    const items = (await fetchV2exRemoteTopics(limit)).map((item) => ({
      title: item.title,
      link: item.link,
      summary: item.content,
    }));
    return { items, mode: "rss" as const };
  }

  if (source.sourceType === "remote-eleduck") {
    const items = (await fetchEleduckRemoteJobs(limit)).map((item) => ({
      title: item.title,
      link: item.link,
      summary: item.content,
    }));
    return { items, mode: "rss" as const };
  }

  let lastError: Error | null = null;

  if (source.dynamicSites && source.dynamicSites.length > 0) {
    try {
      const dynamicResult = await fetchDynamicCategoryInsights({
        categoryName: source.title,
        userPrompt: source.dynamicPrompt ?? source.title,
        limit,
        relatedSites: source.dynamicSites,
      });

      const mapped = dynamicResult.items.slice(0, limit).map((item, index) => ({
        title: item.title || `${source.title} 热点 ${index + 1}`,
        link: item.link || "#",
        summary: item.summary || item.reason || item.title || "",
      }));

      if (mapped.length > 0) {
        return { items: mapped, mode: "dynamic" as const };
      }

      lastError = new Error(`${source.title} 动态聚合返回空结果`);
      console.warn(`[DailyReport] ${lastError.message}，尝试回退到 RSS 源`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = new Error(`${source.title} 动态聚合失败: ${message}`);
      console.warn(`[DailyReport] ${lastError.message}，尝试回退到 RSS 源`);
    }
  }

  if (!source.url) {
    if (lastError) throw lastError;
    throw new Error(`${source.title} 未配置 RSS 地址`);
  }

  try {
    const rssItems = await loadRssItems(source.url, limit);
    const mapped = rssItems.map((item) => ({
      title: item.title,
      link: item.link,
      summary: item.content,
    }));
    return { items: mapped, mode: "rss" as const };
  } catch (error) {
    if (lastError) {
      throw new Error(`${lastError.message}; RSS 同样失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  }
}

export async function collectDailySource(source: RssSource): Promise<DailySourceResult> {
  const limit = source.limit ?? DEFAULT_ITEMS_PER_SOURCE;
  const { items, mode } = await loadDailySourceItems(source, limit);
  return {
    id: source.id,
    title: source.title,
    description: source.description,
    items,
    mode,
  } satisfies DailySourceResult;
}

export async function buildDailyReport(): Promise<DailyReport> {
  console.log('🚀 开始构建日报...');

  const results = await Promise.all(
    RSS_SOURCES.map(async source => {
      try {
        console.log(`📡 正在拉取 ${source.title} 数据...`);
        const result = await collectDailySource(source);
        const modeHint = result.mode === "dynamic" ? "（动态聚合）" : "";
        console.log(`✅ ${source.title}: 获取到 ${result.items.length} 条数据${modeHint}`);
        return {
          ...result,
        } satisfies DailySourceResult;
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        console.log(`❌ ${source.title}: ${message}`);
        return {
          id: source.id,
          title: source.title,
          description: source.description,
          items: [],
          error: message,
        } satisfies DailySourceResult;
      }
    })
  );

  const orderedResults = sortSources(results);

  const sections = orderedResults
    .filter(result => result.items.length > 0)
    .map(result => {
      const lines = result.items.map((item, index) => `${index + 1}. ${item.title} - ${item.summary}`);
      return `${result.title}\n${lines.join("\n")}`;
    });

  const rawContent = sections.join("\n\n");

  const hasApiConfig = hasAIConfig();
  let summary = "暂无可用资讯";

  if (rawContent.trim().length > 0 && hasApiConfig) {
    try {
      console.log('🤖 开始生成AI摘要...');
      summary = await generateSummary(rawContent);
      console.log('✅ AI摘要生成成功');
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      console.error('❌ AI摘要生成失败:', error);
      summary = `今日远程岗位与科技摘要暂时生成失败。已保留原始抓取结果，可直接查看下方岗位与资讯明细。\n\n错误信息：${message}`;
    }
  } else if (rawContent.trim().length > 0 && !hasApiConfig) {
    summary = "未配置 AI API 密钥，无法生成摘要。已保留原始抓取结果，可直接查看下方岗位与资讯明细。";
  }

  const report: DailyReport = {
    generatedAt: new Date().toISOString(),
    summary,
    rawContent,
    sources: orderedResults,
  };

  const remoteResults = getRemoteResults(orderedResults);
  if (remoteResults.length > 0) {
    const date = new Date(report.generatedAt).toLocaleDateString("zh-CN").replace(/\//g, "-");
    const remoteContent = remoteResults
      .map((result) => {
        const lines = result.items.map((item, index) => {
          return [
            `${index + 1}. ${item.title}`,
            `来源：${result.title}`,
            `链接：${item.link}`,
            `摘要：${item.summary}`,
          ].join("\n");
        });
        return `# ${result.title}\n${lines.join("\n\n")}`;
      })
      .join("\n\n");

    try {
      report.emailSubject = `每日远程岗位推荐 - ${date}`;
      report.emailMarkdown = await generateRemoteJobsMarkdown({
        date,
        content: remoteContent,
      });
    } catch (error) {
      console.error("❌ 远程岗位邮件正文生成失败:", error);
      const fallback = buildRemoteEmailFallback(remoteResults, report.generatedAt);
      report.emailSubject = fallback.subject;
      report.emailMarkdown = fallback.markdown;
    }
  }

  console.log('📊 日报构建完成');
  return report;
}
