# Daily Agent 说明文档

## 概览
Daily Agent 是一个使用 Next.js、LangChain.js 和 OpenRouter/OpenAI 的自动化日报生成器。系统会聚合多个资讯与远程岗位 RSS 源，整理原始内容后交给 LLM 生成结构化 Markdown 日报，并支持 SMTP 邮件推送。

## 架构
```
app/api/daily        -> API Route，调用 buildDailyReport 并返回 JSON
lib/services/dailyDispatch.ts -> 执行一次“抓取 + 摘要 + 发信”
lib/services/dailyReport.ts -> 聚合 RSS、调用 LLM、生成摘要
lib/tools/rssTool.ts -> 使用 rss-parser 拉取并解析 RSS
lib/agent/dailyAgent.ts -> 封装 LangChain LLMChain 及 Prompt
scripts/cron.ts      -> 单次执行任务，适合 Codex Automations / crontab
scripts/scheduler.ts -> 常驻 node-cron 调度器，适合 PM2 / systemd
app/page.tsx         -> 前端页面，展示 AI 摘要与分来源资讯
```

## 配置
1. 安装依赖：`pnpm install`
2. 复制 `.env.example` 为 `.env.local`
3. 填写以下变量：
   ```bash
   OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key
   OPENROUTER_MODEL=x-ai/grok-4-fast:free
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=you@example.com
   SMTP_PASS=your-app-password
   EMAIL_FROM=you@example.com
   EMAIL_TO=you@example.com
   DAILY_CRON_SCHEDULE=0 8 * * *
   DAILY_TIMEZONE=Asia/Shanghai
   ```

若未配置 `OPENROUTER_API_KEY` 或 `OPENAI_API_KEY`，系统仍会抓取原始资讯，但无法生成 AI 摘要。

## 开发与运行
- 开发模式：`pnpm dev`
- 生产构建：`pnpm build`
- 生产启动：`pnpm start`
- 手动执行一次日报并尝试发邮件：`pnpm cron`
- 运行常驻调度器：`pnpm scheduler`

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
推荐优先使用 Codex App Automations 或系统 crontab 调用一次性脚本：
```bash
cd /Users/yugangcao/apps/my-apps/daily-agent && pnpm cron
```

如果需要常驻进程，再使用 `scripts/scheduler.ts`：
```bash
pnpm scheduler
```

该调度器会读取：
- `DAILY_CRON_SCHEDULE`：默认 `0 8 * * *`
- `DAILY_TIMEZONE`：默认 `Asia/Shanghai`

## 远程岗位数据
主日报默认汇总以下远程岗位来源：
- RemoteOK
- Remotive
- We Work Remotely

前端 `Remote Work` 分类还会额外聚合 `lib/config/discoverySources.ts` 中的远程工作源，适合按主题浏览岗位和分布式团队趋势。

## 调试建议
- 使用 `pnpm lint` 检查常见问题（默认使用 Next.js ESLint）。
- 可在 `lib/config/sources.ts` 内调整信息源和抓取数量。
- 如需增加新信息源，优先确认目标站点提供 RSS/JSON 接口，继承 `DailySourceResult` 时补全映射逻辑。

## 已知限制
- 依赖 OpenRouter/OpenAI 模型，需稳定的 API Key 与配额。
- 邮件依赖外部 SMTP 服务，建议使用专用 app password。
- 没有将日报持久化（数据库或对象存储），刷新会实时重新生成。

更多规划请参见根目录 `TODO.md`。
