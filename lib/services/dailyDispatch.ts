import { OPENROUTER_MODEL, hasEmailConfig } from "@/lib/env";
import { buildDailyReport, type DailyReport } from "@/lib/services/dailyReport";
import { EmailService } from "@/lib/services/emailService";

export type DailyDispatchOptions = {
  sendEmail?: boolean;
  requireEmail?: boolean;
  logSummary?: boolean;
};

export type DailyDispatchResult = {
  report: DailyReport;
  emailConfigured: boolean;
  emailSent: boolean;
};

export async function runDailyDispatch(
  options: DailyDispatchOptions = {},
): Promise<DailyDispatchResult> {
  const {
    sendEmail = true,
    requireEmail = false,
    logSummary = true,
  } = options;

  console.log(`\n🤖 [${new Date().toLocaleString()}] 开始生成日报...`);
  const report = await buildDailyReport();

  console.log(`📊 生成完成，共处理 ${report.sources.length} 个数据源`);
  console.log(`📝 摘要长度: ${report.summary.length} 字符`);
  console.log(`🤖 AI模型: ${OPENROUTER_MODEL}`);

  const emailConfigured = hasEmailConfig();
  let emailSent = false;

  if (sendEmail) {
    const emailService = EmailService.fromEnv();

    if (emailService) {
      console.log("📧 检测到邮件配置，准备发送邮件...");
      const isConnected = await emailService.testConnection();

      if (!isConnected) {
        if (requireEmail) {
          throw new Error("SMTP 连接失败，无法发送日报邮件");
        }
        console.log("❌ SMTP连接失败，跳过邮件发送");
      } else {
        await emailService.sendDailyReport(report);
        emailSent = true;
        console.log("✅ 日报已成功发送到邮箱");
      }
    } else if (requireEmail) {
      throw new Error("未配置邮件服务，无法发送日报邮件");
    } else {
      console.log("ℹ️  未配置邮件服务，跳过邮件发送");
      console.log("💡 如需邮件推送，请在 .env.local 中配置以下环境变量：");
      console.log("   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_TO");
    }
  }

  if (logSummary) {
    console.log("\n🤖 AI 日报摘要:");
    console.log("=".repeat(52));
    console.log(report.summary);
    console.log("=".repeat(52));
  }

  return {
    report,
    emailConfigured,
    emailSent,
  };
}
