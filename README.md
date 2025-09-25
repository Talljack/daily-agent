# Daily Agent - 自动化日报系统

一个基于 Next.js + TypeScript + LangChain 的自动化日报生成系统，每日自动汇聚多源资讯并生成AI摘要。支持远程工作数据获取和邮件推送功能。

## ✨ 功能特性

- 🤖 **AI驱动**: 使用 OpenAI/OpenRouter 模型生成专业日报摘要
- 📡 **多源汇聚**: 自动拉取知乎热榜、36氪快讯、Hacker News等资讯
- ⏰ **定时任务**: 支持cron定时执行，每日自动生成日报
- 📧 **邮件推送**: 支持将日报通过邮件自动发送
- 💼 **远程工作**: 集成远程工作相关资讯源
- 🎨 **现代UI**: 基于 Next.js + TailwindCSS + 21st.dev 的响应式界面
- 📱 **实时刷新**: 支持手动触发和实时更新

## 🏗️ 技术栈

- **前端**: Next.js 14, React 18, TypeScript
- **UI组件**: 21st.dev, TailwindCSS
- **后端**: Next.js API Routes
- **AI**: LangChain + OpenAI/OpenRouter
- **数据源**: RSS Parser + RSShub
- **定时任务**: node-cron
- **邮件服务**: (待集成)

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
│   └── cron.ts          # 定时任务脚本
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
创建 `.env.local` 文件：
```bash
# OpenAI API配置 (可选)
OPENAI_API_KEY=your_openai_api_key

# OpenRouter API配置 (推荐)
OPENROUTER_API_KEY=your_openrouter_api_key

# 邮件服务配置 (待集成)
# SMTP_HOST=smtp.gmail.com
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_email_password
```

### 3. 启动开发服务器
```bash
pnpm dev
```

访问 http://localhost:3000 查看界面。

### 4. 手动生成日报
```bash
# 执行定时任务脚本
npx tsx scripts/cron.ts

# 或者通过 API 接口
curl http://localhost:3000/api/daily
```

## ⚙️ 定时任务详解

### cron.ts 文件运行方式
`/scripts/cron.ts` 使用 `node-cron` 实现：
- **执行时间**: 每天早上8点 (`"0 8 * * *"`)
- **运行方式**: 需要单独执行进程
- **推荐运行**:
  ```bash
  # 开发环境
  npx tsx scripts/cron.ts

  # 生产环境
  node -r tsx/cjs scripts/cron.ts
  ```

### 部署选项
```bash
# 使用 PM2 管理 (推荐)
pm2 start scripts/cron.ts --name daily-cron --interpreter tsx

# 或添加到系统 crontab
0 8 * * * cd /path/to/daily-agent && npx tsx scripts/cron.ts
```

## 🌐 数据源配置

编辑 `lib/config/sources.ts` 添加更多RSS源：
```typescript
{
  id: "remote_work",
  title: "远程工作资讯",
  url: "https://rsshub.app/remote-work/jobs",
  description: "最新远程工作机会",
  limit: 5
}
```

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
