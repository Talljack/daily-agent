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
  return invokeOpenRouter({
    system: systemPrompt,
    user: `原始抓取内容如下，请生成日报摘要：\n\n${content}`,
  });
}

async function invokeOpenRouter(options: {
  system: string;
  user: string;
}): Promise<string> {
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
        { role: "system", content: options.system },
        { role: "user", content: options.user },
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

export async function generateRemoteJobsMarkdown(options: {
  date: string;
  content: string;
}): Promise<string> {
  const remoteJobsPrompt = `你是一个每天为候选人整理远程开发岗位的求职助手。请把输入岗位整理成一封中文岗位推荐邮件正文。

严格要求：
1. 只输出正文，不要解释，不要加代码块。
2. 第一行必须是：今天找到 N 个值得投递的岗位。
3. 第二行必须是：说明：......
4. 分组标题必须优先使用：
## 国内高优先级可直接投
## 国内可投但需确认条件
## 海外高匹配补充岗位
5. 每个岗位必须用下面格式：
1. S | 岗位名称 | 公司 | 来源：V2EX
- 远程范围：
- 地点/时区要求：
- 英语要求：
- 技术栈匹配点：
- 为什么适合候选人：
- 主要风险/不确定性：
- 申请链接：
- 建议投递动作：
6. 最后必须有：
## 今日推荐投递顺序
## 建议简历关键词微调
7. 优先展示 V2EX 和电鸭中的国内远程开发岗，其次再放海外远程站。
8. 不要把普通科技资讯写进正文，只写远程岗位推荐。
9. 如果信息不足，要诚实写“未说明，建议投递前确认”，不要编造。
10. 主题不要出现在正文里。邮件主题由外部单独设置为：每日远程岗位推荐 - ${options.date}`;

  return invokeOpenRouter({
    system: remoteJobsPrompt,
    user: `请基于以下远程岗位原始信息生成岗位推荐邮件正文，日期是 ${options.date}：\n\n${options.content}`,
  });
}
