import { generateSummary } from "@/lib/agent/dailyAgent";
import { RSS_SOURCES, DEFAULT_ITEMS_PER_SOURCE } from "@/lib/config/sources";
import { fetchRSS, RSSItem } from "@/lib/tools/rssTool";
import { hasAIConfig } from "@/lib/env";

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
};

export type DailyReport = {
  generatedAt: string;
  summary: string;
  rawContent: string;
  sources: DailySourceResult[];
};

async function loadSourceItems(sourceUrl: string, limit?: number): Promise<RSSItem[]> {
  try {
    const { items } = await fetchRSS(sourceUrl, limit, { cacheTtlMs: 10 * 60 * 1000, retries: 2 });
    return items;
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    throw new Error(`拉取 ${sourceUrl} 失败: ${message}`);
  }
}

export async function buildDailyReport(): Promise<DailyReport> {
  console.log('🚀 开始构建日报...');

  const results = await Promise.all(
    RSS_SOURCES.map(async source => {
      try {
        console.log(`📡 正在拉取 ${source.title} 数据...`);
        const items = await loadSourceItems(source.url, source.limit ?? DEFAULT_ITEMS_PER_SOURCE);
        const mapped: DailySourceItem[] = items.map(item => ({
          title: item.title,
          link: item.link,
          summary: item.content,
        }));
        console.log(`✅ ${source.title}: 获取到 ${mapped.length} 条数据`);
        return {
          id: source.id,
          title: source.title,
          description: source.description,
          items: mapped,
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

  const sections = results
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
      summary = `生成摘要失败：${message}\n\n请检查API配置或稍后重试。`;
    }
  } else if (rawContent.trim().length > 0 && !hasApiConfig) {
    summary = "未配置 AI API 密钥，无法生成智能摘要。\n\n请在 .env.local 中配置 OPENROUTER_API_KEY 或 OPENAI_API_KEY。";
  }

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    rawContent,
    sources: results,
  };

  console.log('📊 日报构建完成');
  return report;
}
