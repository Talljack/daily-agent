import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "@/lib/env";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const systemPrompt = `你是一个专业的远程岗位与科技资讯编辑，负责把多源抓取结果整理成一封高信噪比的中文日报。

输出要求：
1. 使用 Markdown。
2. 先写远程岗位，再写科技趋势。
3. 远程岗位部分优先提炼最值得投递的岗位，说明公司、岗位方向、适合人群或亮点。
4. 科技趋势部分只保留最重要、最实用的信息，不要堆砌。
5. 不要编造不存在的信息；如果数据不足就直接说明。

请尽量按照这个结构输出：

## 今日远程岗位重点
- 3 到 5 条，优先总结最值得关注的远程岗位或招聘趋势

## 今日科技动向
- 3 到 5 条，提炼最值得关注的技术、产品、开发者动态

## 行动建议
- 给出 2 到 3 条简短建议，优先围绕远程岗位投递或信息跟进
`;

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part) return "";
        if (typeof part === "string") return part;
        if (typeof part === "object" && typeof (part as { text?: string }).text === "string") {
          return (part as { text: string }).text;
        }
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

async function requestOpenRouterSummary(content: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("未配置 OPENROUTER_API_KEY");
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/Talljack/daily-agent",
      "X-Title": "daily-agent",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL || "openrouter/auto",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `原始抓取内容如下，请生成日报摘要：\n\n${content}` },
      ],
    }),
  });

  const data = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };

  if (!response.ok) {
    const message = data.error?.message || `OpenRouter 请求失败 (${response.status})`;
    throw new Error(message);
  }

  const output = extractTextContent(data.choices?.[0]?.message?.content);
  if (!output) {
    throw new Error("OpenRouter 返回了空摘要");
  }

  return output;
}

export async function generateSummary(content: string): Promise<string> {
  try {
    return await requestOpenRouterSummary(content);
  } catch (error) {
    console.error("AI调用失败:", error);
    throw error;
  }
}

export async function* generateSummaryStream(content: string): AsyncGenerator<string> {
  try {
    yield await requestOpenRouterSummary(content);
  } catch (error) {
    console.error("AI流式调用失败:", error);
    throw error;
  }
}
