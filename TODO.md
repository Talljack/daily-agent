# TODO - Daily Agent 开发计划

## 🚧 当前开发状态

### ✅ 已完成功能
- [x] 基础项目架构 (Next.js + TypeScript)
- [x] RSS数据源集成 (知乎热榜、36氪、Hacker News)
- [x] AI摘要生成 (LangChain + OpenAI)
- [x] Web界面展示和手动刷新
- [x] API路由 (`/api/daily`)
- [x] 定时任务脚本 (`scripts/cron.ts`)

## 📋 核心功能开发

### 🎯 高优先级 (P0)
- [ ] **邮件推送功能**
  - [ ] 集成邮件服务 (Nodemailer + SMTP)
  - [ ] 设计邮件模板 (HTML + Markdown)
  - [ ] 添加邮件发送API
  - [ ] 在定时任务中集成邮件推送
  - [ ] 邮件发送状态监控

- [ ] **OpenRouter API 集成**
  - [ ] 更新 `lib/agent/dailyAgent.ts` 支持 OpenRouter
  - [ ] 添加多模型支持 (Claude, GPT-4, Llama等)
  - [ ] API密钥配置和切换
  - [ ] 成本优化和错误处理

- [ ] **远程工作数据源**
  - [ ] 添加远程工作RSS源
  - [ ] 集成 RemoteOK, We Work Remotely 等
  - [ ] 职位信息结构化处理
  - [ ] 职位过滤和推荐功能

### 🚀 中等优先级 (P1)
- [ ] **数据持久化** (原TODO第1项)
  - [ ] 集成数据库 (SQLite/PostgreSQL)
  - [ ] 日报历史记录存储
  - [ ] 支持历史查询和展示
  - [ ] 数据备份和恢复

- [ ] **多推送渠道** (原TODO第2项)
  - [ ] 邮件推送
  - [ ] 飞书机器人集成
  - [ ] 企业微信推送
  - [ ] Slack/Discord Webhook

- [ ] **UI/UX 优化**
  - [ ] 集成 21st.dev 组件库
  - [ ] **Markdown 渲染组件** (原TODO第5项)
  - [ ] 响应式设计优化
  - [ ] 深色模式支持

### 💡 低优先级 (P2)
- [ ] **自定义配置** (原TODO第3项)
  - [ ] 后台管理界面
  - [ ] 动态RSS源管理
  - [ ] 环境变量配置界面
  - [ ] 用户订阅管理

- [ ] **监控和日志** (原TODO第4项)
  - [ ] 错误日志记录
  - [ ] RSS抓取状态监控
  - [ ] AI模型调用统计
  - [ ] 性能指标收集

- [ ] **测试覆盖** (原TODO第6项)
  - [ ] 端到端测试
  - [ ] API 聚合测试
  - [ ] 页面渲染测试
  - [ ] 单元测试框架

## 🛠️ 技术改进

### 开发体验
- [ ] TypeScript 严格类型检查
- [ ] ESLint + Prettier 配置
- [ ] pre-commit hooks
- [ ] GitHub Actions CI/CD

### 性能优化
- [ ] RSS源并发抓取优化
- [ ] AI API调用缓存
- [ ] 静态资源优化
- [ ] 数据库查询优化

### 安全性
- [ ] API 速率限制
- [ ] 输入验证和清理
- [ ] 环境变量安全管理
- [ ] HTTPS 强制

## 🌐 部署和运维

### 部署选项
- [ ] Vercel 生产部署
- [ ] Docker 容器化
- [ ] PM2 进程管理
- [ ] 云服务集成 (AWS/Google Cloud)

### 监控
- [ ] 应用性能监控
- [ ] 错误追踪 (Sentry)
- [ ] 日志聚合
- [ ] 健康检查端点

## 📊 数据源扩展

### 技术资讯
- [ ] TechCrunch
- [ ] Product Hunt Daily
- [ ] GitHub Trending
- [ ] Dev.to 热门

### 远程工作专项
- [ ] AngelList Remote
- [ ] FlexJobs
- [ ] Remote.co
- [ ] Toptal Blog

### 行业资讯
- [ ] Y Combinator News
- [ ] Indie Hackers
- [ ] Reddit 技术版块
- [ ] Medium 精选文章

## 🎯 MVP 开发计划

### 第一阶段 (2周)
1. ✅ OpenRouter API 集成
2. ✅ 基础邮件推送
3. ✅ 远程工作数据源
4. ✅ 21st.dev 组件集成

### 第二阶段 (4周)
1. 数据持久化功能
2. 多推送渠道支持
3. 基础监控和日志
4. Docker 部署配置

### 第三阶段 (8周)
1. 后台管理系统
2. 高级配置功能
3. 性能优化
4. 测试覆盖完善

---

## 🚀 快速上手开发

### 立即可做的任务
1. **邮件推送集成** - 添加 `nodemailer` 依赖
2. **OpenRouter配置** - 更新环境变量和API调用
3. **UI组件优化** - 集成21st.dev组件库
4. **数据源扩展** - 添加更多RSS源到 `sources.ts`

### 需要调研的功能
1. 最佳邮件服务提供商选择
2. 数据库方案对比 (SQLite vs PostgreSQL)
3. 部署平台评估 (Vercel vs Railway vs 自建)

---

*最后更新: 2024-12-24*
*项目状态: 活跃开发中 🚧*
