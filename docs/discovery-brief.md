# Discovery Brief: AI Knowledge Scout

## Project Vision
- Personal AI research assistant that hunts high-signal knowledge beyond current feeds, closing discovery gaps.
- Users express interests via high-level categories (e.g. “AI breakthroughs”); the system fetches and summarizes emergent content from authoritative global + community sources.
- Reduce information silos by surfacing insights users didn’t know to subscribe to, while keeping configuration lightweight.

## Target Personas
- Curious builders & researchers tracking AI/tech/business without heavy scouting.
- Operators in fast-moving domains (founders, PMs, growth leads) needing a curated, cross-source daily brief.
- Multilingual learners seeking both English and Chinese community perspectives.

## Guiding Principles
- **Discovery-first**: prioritize diverse, high-signal items across official blogs, media, OSS repos, and forums.
- **Promptable categories**: user-defined categories translate into AI crawl prompts with tuned system instructions.
- **Human-filtered tone**: AI outputs concise, trustworthy summaries, with provenance links and reasons for inclusion.
- **Resilience & transparency**: graceful fallbacks when APIs fail; show data lineage for every item.
- **Privacy & control**: no surprise subscriptions; users can inspect/tweak prompt context; local cache respects preferences.

## System Prompt Template (Draft)
- **System role**: “You are a research agent scouting fresh, high-authority updates for {category}.”
- **Constraints**:
  1. Prioritize last 48h content from official announcements, respected blogs, top communities (provide source hints per category).
  2. Return 5–8 items ranked by novelty and impact; include `title`, `summary` (≤2 sentences), `link`, `source`, `reason` (why relevant).
  3. Blend global and regional sources where available (English + Chinese).
  4. Avoid paywalled-only content unless the summary delivers concrete value.
- **User prompt**: “Compile today’s standout developments in <category>. Highlight why they matter to practitioners.”

## Data Source Strategy
- **Primary feeds**
  - Official AI labs & vendors: OpenAI, Anthropic, Google DeepMind, xAI, Meta AI, Microsoft, etc.
  - Research & standards: arXiv hot topics, prominent newsletters, major conferences (NeurIPS, ICLR).
  - Product & engineering: GitHub Trending (AI tags), Product Hunt AI category, Hugging Face trending models.
- **Community channels**
  - Global: X/Twitter curated lists (“AI labs”, “AI founders”), Reddit (r/MachineLearning, r/LocalLLaMA), Hacker News (AI posts).
  - Chinese: 36氪、少数派、V2EX、linux.do、知乎话题等。
- **Discovery expansion**
  - Use RSS/Atom when available; fallback to scraping with rate-limit safeguards.
  - Allow manual source tagging per category for user overrides.
  - Track metadata (source reliability, recency) to drive ranking heuristics.

## High-Level Architecture
1. **Category config layer**: metadata per category (`id`, `displayName`, `systemPrompt`, optional `seedSources`). Customize per user; default catalog ships with curated prompts.
2. **Aggregator pipeline**:
   - Fetch stage: parallel fetchers (RSS/API/scrape) with caching and error handling.
   - AI enrichment stage: summarization and relevance scoring via LLM (OpenRouter models: Claude, Grok, etc.).
   - De-duplication & ranking: merge items by URL/domain, score by novelty and source weight.
3. **Delivery surfaces**: web dashboard, optional daily digest email/webhook, future external API.
4. **Observability**: log fetch success, latency, AI cost; capture user feedback signals.

## MVP Feature Checklist
- Add/remove categories with auto-generated prompt templates; allow description edits to retune focus.
- Multi-source fetcher library with mock + live modes (RSS, HTTP, community APIs).
- AI summarizer capable of aggregated payloads with mock fallback when API keys are absent.
- Deduped “All” view combining built-in and custom categories.
- Audit trail per result (source, retrieved at, reason).
- Playwright smoke tests for primary API routes.

## Differentiators
- Prompt-configurable categories rather than fixed topic lists.
- Combines institutional news + community chatter across languages.
- Designed to highlight “unknown unknowns” via novelty scoring.
- Transparent AI prompting so power users can iterate on behavior.

## Roadmap
1. Prompt calibration: finalize system template and per-category hints.
2. Source catalog: build config describing default feeds, fetch methods, weights.
3. Ranking heuristics: implement scoring combining recency, trust, and AI “reason” weight.
4. Feedback loop: UI affordance for thumbs-up/down to refine prompts and sources.
5. Localization: support bilingual summaries; label source language.
6. Delivery automation: nightly cron for email/report, including “new sources discovered”.
7. Resilience: caching, rate-limit handling, source health dashboard.

## Open Questions
- Refresh cadence: on-demand vs scheduled runs per category?
- Collaborative usage: shared categories across teams?
- Discovery success metrics: clickthrough, saved items, explicit feedback?
- Personalization vs exploration: should the system adapt to taste or stay intentionally exploratory?
