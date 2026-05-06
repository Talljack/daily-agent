import { runDailyDispatch } from "../lib/services/dailyDispatch";

async function main() {
  try {
    await runDailyDispatch({
      sendEmail: true,
      requireEmail: false,
      logSummary: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    console.error(`❌ 生成日报失败: ${message}`);
    if (error instanceof Error && error.stack) {
      console.error(`🔍 错误堆栈: ${error.stack}`);
    }
    process.exitCode = 1;
  }
}

void main();
