import { buildDailyReport } from '../lib/services/dailyReport.js';

async function testDaily() {
  try {
    console.log('📊 开始测试日报生成...');
    const report = await buildDailyReport();
    console.log('\n✅ 生成成功:');
    console.log('📝 摘要:', report.summary.slice(0, 200) + '...');
    console.log('📊 数据源数量:', report.sources.length);
    console.log('⏰ 生成时间:', new Date(report.generatedAt).toLocaleString());
  } catch (error) {
    console.error('❌ 生成失败:', error.message);
    if (error.stack) {
      console.error('🔍 详细错误:', error.stack);
    }
  }
}

testDaily();