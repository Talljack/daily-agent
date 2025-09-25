#!/bin/bash

# Daily Agent 部署脚本

set -e

echo "🚀 开始部署 Daily Agent..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查环境变量文件
if [ ! -f .env.local ]; then
    echo "⚠️  警告: .env.local 文件不存在"
    echo "正在创建示例环境变量文件..."
    cat > .env.local << EOF
# OpenRouter API 配置
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=anthropic/claude-3-5-haiku:beta

# OpenAI API 配置 (可选，作为备选)
# OPENAI_API_KEY=your_openai_api_key_here

# 邮件服务配置 (可选)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_app_password
# EMAIL_FROM=Daily Agent <your_email@gmail.com>
# EMAIL_TO=recipient1@example.com,recipient2@example.com
EOF
    echo "✅ 请编辑 .env.local 文件并配置你的API密钥"
    echo "然后重新运行此脚本"
    exit 1
fi

# 创建日志目录
mkdir -p logs

# 构建和启动服务
echo "🔨 构建Docker镜像..."
docker-compose build

echo "🚀 启动服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 检查服务状态..."
docker-compose ps

# 健康检查
echo "🔍 执行健康检查..."
if curl -f http://localhost:3000/api/daily >/dev/null 2>&1; then
    echo "✅ Web服务运行正常"
else
    echo "❌ Web服务健康检查失败"
    echo "查看日志:"
    docker-compose logs daily-agent-web
fi

echo ""
echo "🎉 部署完成!"
echo "📱 Web界面: http://localhost:3000"
echo "📊 API接口: http://localhost:3000/api/daily"
echo "📝 查看日志: docker-compose logs -f"
echo "🛑 停止服务: docker-compose down"
echo ""
echo "💡 提示:"
echo "- 定时任务每天早上8点自动执行"
echo "- 如需立即测试，运行: docker-compose exec daily-agent-cron tsx -e \"import('./lib/services/dailyReport').then(m => m.buildDailyReport()).then(r => console.log(r.summary))\""