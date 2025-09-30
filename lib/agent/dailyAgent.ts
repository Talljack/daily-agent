import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from '@/lib/env';

// Configure the model with OpenRouter (using Grok)
export const model = new ChatOpenAI({
  apiKey: OPENROUTER_API_KEY,
  model: OPENROUTER_MODEL || 'x-ai/grok-4-fast:free',
  temperature: 0.3,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
});

const template = `你是一个专业的科技资讯分析师，负责从多个信息源中提取关键信息并生成结构化的日报摘要。

原始资讯数据：
{content}

请按照以下格式生成专业的日报摘要（使用 Markdown 格式）：

## 今日概览
用2-3句话总结今日最重要的科技趋势和事件。

## 核心亮点
- 列出3-5个今日最值得关注的要点
- 每个要点简洁明了，突出关键信息

## 分类资讯

### 🚀 技术创新
总结技术相关的突破和进展

### 💼 商业动态
总结商业、融资、市场相关的重要信息

### 🌟 产品发布
总结新产品、新功能的发布信息

### 💻 开发者关注
总结对开发者有价值的工具、资源、趋势

注意事项：
- 保持客观中立的语调
- 突出实用性和价值
- 避免重复内容
- 如果某个分类没有相关内容，可以省略该分类
- 如果原始数据为空或无效，请回复："今日暂无有效科技资讯数据"`;

export const prompt = PromptTemplate.fromTemplate(template);

// 生成摘要的函数
export async function generateSummary(content: string): Promise<string> {
  try {
    const chain = prompt.pipe(model);
    const response = await chain.invoke({ content });
    return response.content as string;
  } catch (error) {
    console.error('AI调用失败:', error);
    throw error;
  }
}

// 流式生成摘要的函数
export async function* generateSummaryStream(content: string): AsyncGenerator<string> {
  try {
    const chain = prompt.pipe(model);
    const stream = await chain.stream({ content });

    for await (const chunk of stream) {
      if (chunk.content) {
        yield chunk.content as string;
      }
    }
  } catch (error) {
    console.error('AI流式调用失败:', error);
    throw error;
  }
}
