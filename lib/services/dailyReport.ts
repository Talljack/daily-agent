import { generateSummary } from "@/lib/agent/dailyAgent";
import { RSS_SOURCES, DEFAULT_ITEMS_PER_SOURCE, type RssSource } from "@/lib/config/sources";
import { fetchRSS, RSSItem } from "@/lib/tools/rssTool";
import { fetchDynamicCategoryInsights } from "@/lib/services/discoveryAggregator";
import { hasAIConfig } from "@/lib/env";

const REMOTE_SOURCE_IDS = new Set(["remote", "remotive", "weworkremotely"]);

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
};

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

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    rawContent,
    sources: orderedResults,
  };

  console.log('📊 日报构建完成');
  return report;
}
