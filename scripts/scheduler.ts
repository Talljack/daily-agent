import cron from "node-cron";
import {
  DAILY_CRON_SCHEDULE,
  DAILY_TIMEZONE,
  OPENROUTER_MODEL,
  hasEmailConfig,
} from "../lib/env";
import { runDailyDispatch } from "../lib/services/dailyDispatch";

let isRunning = false;

cron.schedule(
  DAILY_CRON_SCHEDULE,
  async () => {
    if (isRunning) {
      console.log("⏭️ 上一次日报任务仍在执行，跳过本次触发");
      return;
    }

    isRunning = true;

    try {
      await runDailyDispatch({
        sendEmail: true,
        requireEmail: false,
        logSummary: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      console.error(`❌ 定时日报执行失败: ${message}`);
      if (error instanceof Error && error.stack) {
        console.error(`🔍 错误堆栈: ${error.stack}`);
      }
    } finally {
      isRunning = false;
    }
  },
  {
    timezone: DAILY_TIMEZONE,
  },
);

console.log("🚀 Daily Agent 定时任务已启动");
console.log(`⏰ Cron: ${DAILY_CRON_SCHEDULE}`);
console.log(`🌍 时区: ${DAILY_TIMEZONE}`);
console.log(`🤖 AI模型: ${OPENROUTER_MODEL}`);
console.log(`📧 邮件推送: ${hasEmailConfig() ? "已配置 ✅" : "未配置 ❌"}`);
console.log(`⌚ 当前时间: ${new Date().toLocaleString()}`);
console.log("💡 使用 Ctrl+C 停止任务\n");
