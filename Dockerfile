# 构建阶段
FROM node:18-alpine AS builder

# 安装pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 生产阶段
FROM node:18-alpine AS runner

# 安装pnpm和tsx
RUN npm install -g pnpm tsx

# 设置工作目录
WORKDIR /app

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制package文件
COPY package.json pnpm-lock.yaml ./

# 安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 复制构建后的应用
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/app ./app

# 创建日志目录
RUN mkdir -p logs && chown nextjs:nodejs logs

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV production
ENV PORT 3000

# 启动命令（可通过docker run命令覆盖）
CMD ["pnpm", "start"]