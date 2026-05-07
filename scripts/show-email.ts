import { RSS_SOURCES } from "@/lib/config/sources";
import { collectDailySource, type DailySourceResult } from "@/lib/services/dailyReport";
import { buildRemoteJobsEmailContent } from "@/lib/services/remoteJobsEmailFormatter";

const REMOTE_SOURCE_IDS = new Set(["remote", "v2ex-remote", "eleduck", "remotive", "weworkremotely"]);

async function main() {
  const remoteSources = RSS_SOURCES.filter((source) => REMOTE_SOURCE_IDS.has(source.id));

  const results = await Promise.all(
    remoteSources.map(async (source) => {
      try {
        return await collectDailySource(source);
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        return {
          id: source.id,
          title: source.title,
          description: source.description,
          items: [],
          error: message,
        } satisfies DailySourceResult;
      }
    }),
  );

  const filtered = results.filter((result) => result.items.length > 0);
  const email = buildRemoteJobsEmailContent(filtered, new Date().toISOString());
  console.log(email.subject);
  console.log("---EMAIL---");
  console.log(email.markdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
