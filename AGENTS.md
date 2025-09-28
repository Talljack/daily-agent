# Repository Guidelines

## Project Structure & Module Organization
Application logic lives in `app/`, following the Next.js App Router (`app/api/daily` handles streaming, `app/page.tsx` renders the dashboard). Shared UI lives under `components/`, including the `ui` primitives pulled via `@/components/ui/*`. Agent-specific code is grouped in `lib/` (`agent` for orchestration, `config` for feed catalogs, `services` for report assembly, `tools` for fetchers). Automation scripts sit in `scripts/` (`cron.ts` for scheduled runs, `test.mjs` for smoke tests). Reference docs rest in `docs/`, and deploy helpers (`deploy.sh`, `Dockerfile`, `docker-compose.yml`) support production rollouts.

## Build, Test, and Development Commands
- `pnpm dev` — start Next.js with caching disabled for fast feedback.
- `pnpm build` / `pnpm start` — compile and serve the production bundle.
- `pnpm lint` — run the bundled Next.js/ESLint rules; resolve warnings before review.
- `pnpm cron` — run the daily job once through `tsx`, matching server behaviour.
- `pnpm cron:dev` — watch mode for iterating on cron logic.
- `pnpm daily` — call `buildDailyReport()` and print the generated summary.

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation and strict imports. Use PascalCase for React components (`components/ChatSidebar.tsx`), camelCase for utilities, and kebab-case for route folders. Tailwind class lists should stay readable and grouped by layout, spacing, and color. Run `pnpm lint` before committing; prefer fixing lint output over disabling rules. Co-locate new agent helpers in the relevant `lib/*` subfolder and surface shared exports deliberately.

## Testing Guidelines
There is no formal test runner yet; rely on targeted scripts. Execute `node scripts/test.mjs` to validate report generation and attach logs to the PR. Extend this script or add `tsx` probes when integrating new sources, mocking outbound requests to keep runs offline. For cron changes, demonstrate a `pnpm cron` run and describe any required env vars.

## Commit & Pull Request Guidelines
Follow Conventional Commit prefixes (the history currently uses `chore: init`). Keep commits focused, reference issues with `#id`, and avoid mixing formatting-only changes with feature work. Pull requests should include a short problem statement, the solution outline, screenshots or terminal output for UI/cron updates, and the commands used for verification.

## Security & Configuration Tips
Never commit `.env*` files; document required secrets (`OPENROUTER_API_KEY`, `OPENAI_API_KEY`, SMTP credentials) in the PR note instead. Use `.env.local` for development and `.env.production` (or platform secrets) in deployment. When updating `lib/config/sources.ts`, validate new RSS endpoints manually before enabling cron and escape any HTML that enters summaries.
