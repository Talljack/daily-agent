import { NextRequest } from "next/server";
import { generateSummaryStream } from "@/lib/agent/dailyAgent";
import { RSS_SOURCES, DEFAULT_ITEMS_PER_SOURCE } from "@/lib/config/sources";
import { fetchRSS } from "@/lib/tools/rssTool";
import { hasAIConfig } from "@/lib/env";
import type { DailySourceResult, DailySourceItem } from "@/lib/services/dailyReport";

export const runtime = 'nodejs';

async function loadSourceItems(source: { id: string; url: string; limit?: number }) {
  try {
    const { items } = await fetchRSS(source.url, source.limit, { cacheTtlMs: 10 * 60 * 1000, retries: 2 });
    return items.map(item => ({
      title: item.title,
      link: item.link,
      summary: item.content,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    throw new Error(`拉取 ${source.url} 失败: ${message}`);
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // 发送初始状态
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'status',
          message: '开始构建日报...',
          progress: 0
        })}\n\n`));

        // 并行获取所有数据源
        const results = await Promise.allSettled(
          RSS_SOURCES.map(async (source, index) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              message: `正在拉取 ${source.title} 数据...`,
              progress: Math.round(((index + 1) / RSS_SOURCES.length) * 50)
            })}\n\n`));

            try {
              const items = await loadSourceItems({
                id: source.id,
                url: source.url,
                limit: source.limit ?? DEFAULT_ITEMS_PER_SOURCE
              });

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'source_complete',
                source: {
                  id: source.id,
                  title: source.title,
                  description: source.description,
                  items,
                  itemCount: items.length
                }
              })}\n\n`));

              return {
                id: source.id,
                title: source.title,
                description: source.description,
                items,
              } satisfies DailySourceResult;
            } catch (error) {
              const message = error instanceof Error ? error.message : "未知错误";

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'source_error',
                source: {
                  id: source.id,
                  title: source.title,
                  error: message
                }
              })}\n\n`));

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

        const sourceResults = results.map(result =>
          result.status === 'fulfilled' ? result.value : {
            id: 'unknown',
            title: '未知源',
            items: [],
            error: '获取失败'
          }
        );

        // 构建原始内容
        const sections = sourceResults
          .filter(result => result.items.length > 0)
          .map(result => {
            const lines = result.items.map((item, index) =>
              `${index + 1}. ${item.title} - ${item.summary}`
            );
            return `${result.title}\n${lines.join("\n")}`;
          });

        const rawContent = sections.join("\n\n");

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'data_complete',
          sources: sourceResults,
          rawContent,
          progress: 60
        })}\n\n`));

        if (rawContent.trim().length === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'summary',
            content: '暂无可用资讯',
            complete: true
          })}\n\n`));
        } else if (!hasAIConfig()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'summary',
            content: '未配置 AI API 密钥，无法生成智能摘要。\n\n请在 .env.local 中配置 OPENROUTER_API_KEY 或 OPENAI_API_KEY。',
            complete: true
          })}\n\n`));
        } else {
          // 开始流式生成摘要
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: '开始生成AI摘要...',
            progress: 70
          })}\n\n`));

          try {
            let summaryContent = '';
            let chunkCount = 0;

            for await (const chunk of generateSummaryStream(rawContent)) {
              summaryContent += chunk;
              chunkCount++;

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'summary_chunk',
                content: chunk,
                fullContent: summaryContent,
                progress: Math.min(70 + (chunkCount * 2), 95)
              })}\n\n`));
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'summary_complete',
              content: summaryContent,
              progress: 100
            })}\n\n`));

          } catch (error) {
            const message = error instanceof Error ? error.message : "未知错误";
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'summary_error',
              error: `生成摘要失败：${message}\n\n请检查API配置或稍后重试。`
            })}\n\n`));
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          message: '日报生成完成',
          generatedAt: new Date().toISOString()
        })}\n\n`));

      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: message
        })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
