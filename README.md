# Daily Agent - 自动化日报系统

一个基于 Next.js + TypeScript + LangChain 的自动化日报生成系统，每日自动汇聚多源资讯并生成 AI 摘要，支持远程岗位抓取和邮件推送。

## ✨ 功能特性

- 🤖 **AI驱动**: 使用 OpenAI/OpenRouter 模型生成专业日报摘要
- 📡 **多源汇聚**: 自动拉取知乎热榜、36氪快讯、Hacker News等资讯
- ⏰ **定时任务**: 支持本地或自托管 cron 定时执行
- 📧 **邮件推送**: 支持 SMTP 邮件自动发送
- 💼 **远程工作**: 集成 RemoteOK、Remotive、We Work Remotely 等岗位源
- 🎨 **现代UI**: 基于 Next.js + TailwindCSS + 21st.dev 的响应式界面
- 📱 **实时刷新**: 支持手动触发和实时更新

## 🏗️ 技术栈

- **前端**: Next.js 15, React 19, TypeScript
- **UI组件**: 21st.dev, TailwindCSS
- **后端**: Next.js API Routes
- **AI**: LangChain + OpenAI/OpenRouter
- **数据源**: RSS Parser + RSShub
- **定时任务**: node-cron
- **邮件服务**: Nodemailer + SMTP

## 📦 项目结构

```
daily-agent/
├── app/                    # Next.js 13+ App Router
│   ├── api/daily/         # API路由 - 日报生成接口
│   ├── layout.tsx         # 根布局组件
│   └── page.tsx          # 首页组件
├── lib/                   # 核心业务逻辑
│   ├── agent/            # AI Agent 配置
│   ├── config/           # 配置文件 (RSS源等)
│   ├── services/         # 服务层 (日报生成)
│   └── tools/            # 工具函数 (RSS解析)
├── scripts/              # 脚本文件
│   ├── cron.ts          # 单次执行脚本
│   └── scheduler.ts     # 常驻调度器
└── docs/                # 项目文档
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- pnpm (推荐)

### 1. 安装依赖
```bash
pnpm install
```

### 2. 环境配置
复制环境变量模板并填写真实值：
```bash
cp .env.example .env.local
```

`.env.local` 至少需要：
```bash
# AI 摘要
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key
OPENROUTER_MODEL=x-ai/grok-4-fast:free

# 邮件推送
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=you@example.com
SMTP_PASS=your-app-password
EMAIL_FROM=you@example.com
EMAIL_TO=you@example.com

# 定时配置
DAILY_CRON_SCHEDULE=0 8 * * *
DAILY_TIMEZONE=Asia/Shanghai
```

`EMAIL_TO` 支持多个收件人，使用英文逗号分隔。
`EMAIL_FROM` 当前需要填写纯邮箱地址，以匹配项目内的环境变量校验规则。

### 3. 启动开发服务器
```bash
pnpm dev
```

访问 http://localhost:3000 查看界面。

### 4. 手动生成日报
```bash
# 执行一次“抓取 + AI 摘要 + 邮件发送”
pnpm cron

# 或者通过 API 接口只拉取报告 JSON
curl http://localhost:3000/api/daily
```

## ⚙️ 定时任务详解

### 方式 1：用 Codex App Automations 调度
如果你想“每天自动发一封资讯 + 远程岗位摘要邮件”，优先用 Codex App 的 Automations 触发一次性命令，而不是常驻 `node-cron` 进程。

Automation 命令直接填：
```bash
cd /Users/yugangcao/apps/my-apps/daily-agent && pnpm cron
```

建议配置：
- **频率**: Every day
- **时间**: 08:00
- **时区**: `Asia/Shanghai`
- **结果**: 成功时会抓取多源资讯、聚合远程岗位、生成 AI 摘要，并按 `EMAIL_TO` 发信

### 方式 2：自托管常驻调度器
如果你自己用服务器或本机守护进程，可以运行内置 scheduler：
```bash
pnpm scheduler
```

它会按照 `.env.local` 里的 `DAILY_CRON_SCHEDULE` 和 `DAILY_TIMEZONE` 常驻执行。

### 部署选项
```bash
# 使用 PM2 管理常驻调度器
pm2 start "pnpm scheduler" --name daily-agent-scheduler

# 或添加到系统 crontab 执行一次性任务
0 8 * * * cd /path/to/daily-agent && pnpm cron
```

## 🌐 数据源配置

默认日报已经包含：
- Hacker News
- 36氪快讯
- Dev.to
- Reddit 编程
- 知乎热榜
- RemoteOK / Remotive / We Work Remotely 远程岗位

如需新增或删减信息源，编辑 `lib/config/sources.ts`：
```typescript
{
  id: "custom-remote",
  title: "自定义远程岗位源",
  url: "https://example.com/jobs.rss",
  description: "团队内部关注的招聘源",
  limit: 4
}
```

如果你只想看远程岗位，也可以在前端打开 `Remote Work` 分类，该分类会使用 `lib/config/discoverySources.ts` 中的多个远程工作源进行聚合。

## 🤝 开源目标

这个项目旨在：
- 📚 **学习AI Agent开发**: 实践多步推理 + 信息整合
- 🛠️ **帮助开发者**: 提供自动化日报解决方案
- 🌍 **支持远程工作**: 集成远程工作相关资讯
- 🔄 **持续改进**: 欢迎社区贡献和反馈

## 📋 TODO
详见 [TODO.md](./TODO.md) 了解开发计划和进度。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 仓库
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 创建 Pull Request

## 📄 许可证

MIT License

## 🔗 相关链接

- [21st.dev 组件库](https://21st.dev)
- [Next.js 文档](https://nextjs.org/docs)
- [LangChain 文档](https://js.langchain.com/)
- [OpenRouter API](https://openrouter.ai/docs)
- [RSShub 文档](https://docs.rsshub.app/)
