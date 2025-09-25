import cron from "node-cron";
import { buildDailyReport } from "../lib/services/dailyReport";
import { EmailService } from "../lib/services/emailService";
import { OPENROUTER_MODEL, hasEmailConfig } from "../lib/env";

cron.schedule("0 8 * * *", async () => {
  try {
    console.log(`\n🤖 [${new Date().toLocaleString()}] 开始生成日报...`);

    const report = await buildDailyReport();

    console.log(`📊 生成完成，共处理 ${report.sources.length} 个数据源`);
    console.log(`📝 摘要长度: ${report.summary.length} 字符`);

    // 尝试发送邮件
    const emailService = EmailService.fromEnv();
    if (emailService) {
      console.log(`📧 检测到邮件配置，准备发送邮件...`);

      const isConnected = await emailService.testConnection();
      if (isConnected) {
        await emailService.sendDailyReport(report);
        console.log(`✅ 日报已成功发送到邮箱`);
      } else {
        console.log(`❌ SMTP连接失败，跳过邮件发送`);
      }
    } else {
      console.log(`ℹ️  未配置邮件服务，跳过邮件发送`);
      console.log(`💡 如需邮件推送，请在 .env.local 中配置以下环境变量：`);
      console.log(`   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_TO`);
    }

    // 控制台输出摘要
    console.log(`\n🤖 Grok AI 日报摘要:`);
    console.log('=' + '='.repeat(50));
    console.log(report.summary);
    console.log('=' + '='.repeat(50));

  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    console.error(`❌ 生成日报失败: ${message}`);
    if (error instanceof Error && error.stack) {
      console.error(`🔍 错误堆栈: ${error.stack}`);
    }
  }
});

console.log(`🚀 Daily Agent 定时任务已启动`);
console.log(`⏰ 执行时间: 每天早上 8:00 (服务器时间)`);
console.log(`📡 数据源: 知乎热榜、36氪快讯、Hacker News、远程工作职位等`);
console.log(`🤖 AI模型: ${OPENROUTER_MODEL}`);
console.log(`📧 邮件推送: ${hasEmailConfig() ? '已配置 ✅' : '未配置 ❌'}`);
console.log(`\n⌚ 当前时间: ${new Date().toLocaleString()}`);
console.log(`💡 按 Ctrl+C 停止任务\n`);
