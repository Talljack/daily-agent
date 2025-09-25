import { NextResponse } from "next/server";
import { buildDailyReport } from "@/lib/services/dailyReport";

export async function GET() {
  try {
    const report = await buildDailyReport();
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
