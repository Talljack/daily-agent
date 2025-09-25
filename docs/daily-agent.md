# Daily Agent 说明文档

## 概览
Daily Agent 是一个使用 Next.js、LangChain.js 和 OpenAI 的自动化日报生成器。系统通过聚合多个 RSS 信息源，整理原始资讯后交给 LLM 生成结构化的 Markdown 日报，最终在前端展示并提供定时执行脚本。

## 架构
```
app/api/daily        -> API Route，调用 buildDailyReport 并返回 JSON
lib/services/dailyReport.ts -> 聚合 RSS、调用 LLM、生成摘要
lib/tools/rssTool.ts -> 使用 rss-parser 拉取并解析 RSS
lib/agent/dailyAgent.ts -> 封装 LangChain LLMChain 及 Prompt
scripts/cron.ts      -> node-cron 定时脚本，控制台输出日报
app/page.tsx         -> 前端页面，展示 AI 摘要与分来源资讯
```

## 配置
1. 安装依赖：`pnpm install`
2. 新建 `.env.local`，填写以下变量：
   ```bash
   OPENAI_API_KEY=你的 OpenAI Key
   ```

若未配置 `OPENAI_API_KEY`，系统仍会展示原始资讯，但无法生成 AI 摘要。

## 开发与运行
- 开发模式：`pnpm dev`
- 生产构建：`pnpm build`
- 生产启动：`pnpm start`

## API
- `GET /api/daily`
  - **200**: 返回 `DailyReport`
    ```json
    {
      "generatedAt": "2024-05-01T00:00:00.000Z",
      "summary": "... AI 摘要 ...",
      "rawContent": "聚合原始文本",
      "sources": [
        {
          "id": "zhihu",
          "title": "知乎热榜",
          "description": "今日热点问答与文章",
          "items": [
            { "title": "...", "link": "https://...", "summary": "..." }
          ]
        }
      ]
    }
    ```
  - **非 200**: 返回 `{ "error": "message" }`

## 定时执行
`scripts/cron.ts` 默认每天 08:00（服务器时区）触发，可搭配 `pm2`, `systemd` 或云函数，示例：
```bash
pnpm ts-node scripts/cron.ts
```
需要长期运行时建议使用进程守护或结合第三方推送管道（飞书机器人、企业微信等）。

## 调试建议
- 使用 `pnpm lint` 检查常见问题（默认使用 Next.js ESLint）。
- 可在 `lib/config/sources.ts` 内调整信息源和抓取数量。
- 如需增加新信息源，优先确认目标站点提供 RSS/JSON 接口，继承 `DailySourceResult` 时补全映射逻辑。

## 已知限制
- 依赖 OpenAI 模型，需稳定的 API Key 与配额。
- 当前仅拉取 RSS 信息，缺少邮件/消息推送能力。
- 没有将日报持久化（数据库或对象存储），刷新会实时重新生成。

更多规划请参见根目录 `TODO.md`。
