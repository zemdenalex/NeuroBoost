# NeuroBoost — Master Handoff & LLM Workflow (v0.3.x → v0.4.x)

**Owner:** Denis (zemdenalex)
**Scope:** Consolidated history, decisions, current state, roadmap, and a practical LLM development playbook.
**Goal:** Make the project coherent, executable, and easy to iterate with LLMs without losing structure.

---

## 1) Executive Summary

NeuroBoost is a calendar‑first personal assistant designed to **push planning, reminders, plan‑vs‑actual logging, and reflection** while remaining **Obsidian‑compatible** and **self‑hostable**. The immediate focus is **stability and polish of v0.3.x** (everything that exists must work) followed by **task intelligence in v0.4.x** (contexts, time windows, dependencies, smarter scheduling).

**MVP pillars**

* Daily planning loop with enforced time‑blocking and fast capture
* Reminders (pre‑block, start‑of‑block, post‑block reflection)
* Plan‑vs‑Actual side‑by‑side with simple analytics
* Obsidian exports with stable IDs (idempotent re‑export)
* Telegram quick capture + reminders; Windows shell wrapper

**Non‑goals (MVP):** Rich third‑party calendar sync, native mobile apps, AI heavy features, complex offline CRDT sync.

---

## 2) Vision Evolution (What changed & why)

**Early concept → Now**

* From a general “productivity + knowledge” tool to a **pushy, calendar‑centered assistant**.
* From equal weight on tasks/notes to **time‑blocking first**, with tasks feeding the schedule.
* From “maybe multi‑user” to **single‑user MVP** while keeping architecture multi‑tenant‑ready.
* From “AI soon” to **collect the right data first** (events, reflections, completion times), then add intelligence.

**Next 6–12 months (directional)**

* Mature the **reminder/reflect loop**, then add **task intelligence** (contexts, windows, dependencies).
* Introduce **simple learning** (no ML infra at first): estimates from history; then progress to smarter suggestions.
* Only after polish: **Android shell** (wrap web), then selective integrations.

---

## 3) Architecture Snapshot (Target for v0.3.x)

* **Frontend:** React + TypeScript + Tailwind (week/month views, drag/move/resize, plan vs actual)
* **Backend:** Node/Express (REST), Prisma ORM, PostgreSQL (single tenant for now)
* **Bot:** Telegram (Telegraf) for capture, reminders, and simple commands
* **Desktop:** Electron shell (Windows) to enable startup‑on‑boot, tray, notifications
* **Export:** Markdown with YAML front‑matter, stable IDs, idempotent
* **Infra:** VPS (Ubuntu), Docker Compose, Nginx + Certbot (HTTPS), health checks

**Key domain objects**

* **Event**: {id, title, startsAt, endsAt, layerId, sourceTaskId?, reflection{focus%, goal%, mood1‑10}}
* **Task**: {id, title, priority, estimatedMinutes?, deadline?, layerId?, contexts\[], timeWindow?, parentTaskId?, dependencies\[]}
* **Layer** (calendar context): Work, Personal, Health, Education, Social, Home Care (toggle visibility; colors)

---

## 4) Current State → Gaps (Truth list for v0.3.0)

### Works

* Week/month rendering; event creation by drag; task creation & priorities; reflection fields; stats; basic bot; DB schema; VPS online (HTTP)

### Broken / Missing (must fix in v0.3.x)

* **Drag task → calendar** fails (payload/validation mismatch)
* **Event resizing** (top/bottom handles, 15‑min grid) not implemented
* **Cross‑day timed events** unsupported (22:00 → 06:00, sleep)
* **Precise manual time input** absent (10:50, 12:25)
* **Recurring events** untested; likely broken
* **Month view**: scroll, ghost previews on weekends; auto‑scroll edges
* **Touch interactions** poor; mobile drag‑create fails
* **Security**: HTTPS missing; no health checks; sparse error reporting; validation gaps
* **Telegram**: keyboard jumps; too few tasks shown; dedupe of notifications; lack of commands

---

## 5) v0.3.x Plan — “Make Everything Actually Work”

### 0.3.1 — Core Fixes (5–7 days)

1. **Drag task → calendar**

* Ensure payload: {taskId, startsAt ISO, endsAt ISO (default 60m if missing), user context}
* On success: set task.status = SCHEDULED; set event.sourceTaskId; show task title on event
* Tests: with/without estimates; all‑day; various times

2. **Event resizing**

* Resize handles (top/bottom 5px); cursors; ghost; snap 15m; min 15m; no day‑cross in 0.3.x

3. **Cross‑day events**

* Allow drag across days; store single event; split rendering across days with continuation badges

4. **Manual time input**

* Click to edit; validate; support "1050" → 10:50; Enter to save; Esc cancel

5. **Month view polishing**

* Continuous scroll; weekend ghost; source‑day ghost; edge auto‑scroll; 3‑month drag

6. **Touch support**

* Pointer events unification; long‑press create; safe thresholds

### 0.3.2 — Telegram Activation (7–10 days)

* **Reminders**: pre‑event (30/5/1 min options), start‑of‑block, post‑block reflection
* **Commands**: `/start`, `/help`, `/task`, `/top`, `/today`, `/plan`, `/reflect`
* **Keyboards**: persistent reply markup; stable pagination; dedupe
* **Event↔Task linking**: optional flag or drag‑linking UI

### 0.3.3 — Auth & HTTPS (4–6 days)

* **HTTPS** via Nginx + Certbot; **/health** endpoints; compose healthchecks
* **Auth**: Telegram‑issued token for web; protect week grid routes; user isolation in DB shape

### 0.3.4 — Documentation & Hardening (3–4 days)

* Module READMEs; API reference (OpenAPI or MD tables)
* Error taxonomy + toasts; input validation; seeds + demo data
* Smoke tests; backup/restore guide; logging & tracing basics

**Definition of Done (v0.3.x)**

* 48 hours of uninterrupted use without a broken flow
* All drags/moves/resizes behave predictably
* Bot delivers reminders reliably with low jitter
* HTTPS+healthchecks green; deployment reproducible from README

---

## 6) v0.4.x Plan — “Task Management Revolution”

### 0.4.1 — Contexts & Time Windows (10–12 days)

* **Contexts**: @home, @office, @computer, @phone, @errands, @anywhere, @energy‑high, @energy‑low; custom contexts with color/icon & availability hours
* **Time windows**: earliest/latest, ideal time, duration estimate, window days (MTWTFSS), frequency (every N days), lastScheduled
* **Filtering**: current context filter; batch views; availability aware suggestions

### 0.4.2 — Calendar Layers & Dependencies (8–10 days)

* **Layers**: Work, Personal, Health, Education, Social, Home Care (toggle, colors, reminder defaults)
* **Dependencies & trees**: parent/child; blocks/informs/related; collapsible tree; progress roll‑up; critical path

### 0.4.3 — Smart Scheduling & Aging (8–10 days)

* **Suggestion engine** (non‑ML initially): priority + windows + contexts + dependencies + deadlines + historical duration
* **Aging/Escalation**: stale tasks surface; re‑estimate; micro‑breakdowns; gentle nudge cadence
* **Reflection‑aware**: mood/focus feed into suggestions

**Definition of Done (v0.4.x)**

* Task list filtered by context/time window makes intuitive sense
* Tree visualizations feel natural; reordering is easy
* Suggestions are “close enough” to be useful and teachable by quick feedback

---

## 7) Telegram Reminder & Auth Flows (MVP)

**Reminders**

* Event reminders: T‑30, T‑5, T‑1; start‑ping; end‑ping with reflection (focus %, goal %, mood 1–10)
* Daily planning nudge at 20:00 if tomorrow not fully blocked; weekly review Sunday 18:00
* Task deadline reminders with importance tiering (default & advanced)

**Auth**

* `/start` → identify Telegram userId → issue one‑time **web token**; open web app with token → set secure session; protect routes
* Limit initial concurrent users to \~5; prepare DB for multi‑user

---

## 8) Data Model (Additions for 0.4.x)

```sql
-- Contexts
ALTER TABLE "Task" ADD COLUMN contexts TEXT[];
ALTER TABLE "Task" ADD COLUMN custom_contexts JSONB;
CREATE TABLE "Context" (
  id UUID PRIMARY KEY,
  user_id UUID,
  name VARCHAR(50),
  color VARCHAR(7),
  icon VARCHAR(50),
  availability_hours JSONB,
  is_system BOOLEAN DEFAULT false
);

-- Time windows
ALTER TABLE "Task" ADD COLUMN time_window_type VARCHAR(20);
ALTER TABLE "Task" ADD COLUMN earliest_time TIME;
ALTER TABLE "Task" ADD COLUMN latest_time TIME;
ALTER TABLE "Task" ADD COLUMN ideal_time TIME;
ALTER TABLE "Task" ADD COLUMN window_days VARCHAR(7); -- 'MTWTFSS'
ALTER TABLE "Task" ADD COLUMN window_frequency INTEGER; -- every N days
ALTER TABLE "Task" ADD COLUMN last_scheduled DATE;

-- Layers
CREATE TABLE "CalendarLayer" (
  id UUID PRIMARY KEY,
  user_id UUID,
  name VARCHAR(100),
  color VARCHAR(7),
  is_visible BOOLEAN DEFAULT true,
  reminder_defaults JSONB,
  created_at TIMESTAMP
);
ALTER TABLE "Event" ADD COLUMN layer_id UUID;
ALTER TABLE "Task"  ADD COLUMN layer_id UUID;

-- Dependencies / progress
ALTER TABLE "Task" ADD COLUMN parent_task_id UUID;
ALTER TABLE "Task" ADD COLUMN dependency_type VARCHAR(20);
ALTER TABLE "Task" ADD COLUMN dependencies UUID[];
ALTER TABLE "Task" ADD COLUMN progress_percentage INTEGER DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN is_milestone BOOLEAN DEFAULT false;
```

---

## 9) LLM Development Playbook (Repeatable, Lossless)

> **Goal:** Avoid re‑explaining; keep structure; request bounded deltas; prevent unwanted rewrites. Copy/paste these templates into any LLM (ChatGPT, Claude, Cursor). Keep the **Source‑of‑Truth** file pinned (see §10).

### 9.1 Source‑of‑Truth (SoT)

Create `/docs/NEUROBOOST_SoT.md` that contains:

* Project elevator pitch & MVP pillars
* Current stack & domain model
* Folder structure (canonical)
* Coding standards
* “Do NOT change” list (filenames, entry points, interfaces)
* Active sprint scope and acceptance criteria
* Known issues & TODOs

**Rule:** Every task starts with “Read SoT → Confirm constraints → Propose a delta”.

### 9.2 Delta‑Only PR Prompt (for code changes)

```
Role: Senior Engineer following strict SoT. Make the smallest safe change.
Inputs: <paste SoT excerpt + file(s) to change + failing scenario>
Constraints:
- Do NOT restructure folders or rename modules unless explicitly asked.
- Touch only listed files. If more are needed, list them and stop.
- Write patch‑style diffs (unified) + brief rationale.
- Update tests/docs if signatures change.
Output:
- Diffs per file
- Run/verify steps
- Rollback notes
```

### 9.3 Spec‑First Prompt (for new feature)

```
Role: Product Engineer. Draft a mini‑spec before code.
Inputs: <SoT excerpt + feature request>
Output (max 1 page):
- User story + acceptance criteria
- Data model deltas (if any)
- UI flow (1–2 bullets)
- API contract changes
- Test plan (happy + edge)
- Risks + fallback
Stop after spec for approval.
```

### 9.4 README/Docs Prompt

```
Role: Tech Writer.
Inputs: <SoT + current repo tree + run scripts>
Output:
- README sections: Overview, Stack, Prereqs, Quickstart, .env, Dev scripts, Tests, Docker, Deploy (VPS), Troubleshooting, FAQ.
- Keep commands copy‑pastable. No fluff.
```

### 9.5 “Context Refresher” Prompt (when a new chat starts)

```
I will paste SoT and the current sprint scope. Acknowledge constraints; ask 0–3 blockers; then proceed. Do not reinvent structure.
```

### 9.6 Guardrails (paste into any session)

* **No framework/stack swaps** unless explicitly requested
* **No folder renames** without an ADR
* **Smallest viable change**; patch diffs preferred
* **Keep types strict**; add tests for core flows
* **Preserve telemetry hooks and IDs**

---

## 10) Canonical Folder Structure (Target)

```
neuroboost/
├─ apps/
│  ├─ web/            # React+TS UI (week/month, drag/move/resize)
│  ├─ api/            # Express + Prisma; REST endpoints
│  └─ bot/            # Telegraf; reminders & capture
├─ packages/
│  ├─ ui/             # shared UI components
│  ├─ core/           # domain logic (types, validators)
│  └─ config/         # eslint, tsconfig, tailwind
├─ prisma/            # schema.prisma, migrations/
├─ docker/            # nginx.conf, certbot scripts, healthchecks
├─ docs/              # SoT, ADRs, API reference, handoff packs
├─ .env.example
├─ docker-compose.yml
├─ README.md
└─ CONTRIBUTING.md
```

---

## 11) README.md (Proposed)

> **Note:** Replace placeholders with actual values during implementation.

### Overview

NeuroBoost is a calendar‑first personal assistant for **time‑blocking, reminders, plan‑vs‑actual, and reflection**, with **Obsidian exports** and a **Telegram bot**. Self‑hostable; Windows shell for startup and notifications.

### Stack

* React + TypeScript + Tailwind (apps/web)
* Node/Express + Prisma + PostgreSQL (apps/api)
* Telegram bot via Telegraf (apps/bot)
* Electron shell (Windows)
* Docker Compose + Nginx + Certbot

### Prerequisites

* Node 20 LTS, pnpm
* Docker & Docker Compose
* PostgreSQL 16 (containerized)
* Telegram bot token
* Domain pointing to VPS (for HTTPS)

### Quickstart (Dev)

```
# 1) Install deps
pnpm install

# 2) Start DB + services
docker compose up -d postgres

# 3) Apply Prisma schema
pnpm --filter @nb/api prisma migrate dev

# 4) Seed demo data
pnpm --filter @nb/api run seed

# 5) Run web + api + bot
pnpm --filter @nb/web  dev
pnpm --filter @nb/api  dev
pnpm --filter @nb/bot  dev
```

### Environment

Create `.env` files for each app; see `.env.example`.

Key variables:

```
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=...
JWT_SECRET=...
WEB_BASE_URL=https://your.domain
```

### Docker (Prod)

```
docker compose up -d --build
# Nginx serves web, proxies api; Certbot issues/renews SSL
```

### Deploy Health

* `/health` endpoints for api/web/bot
* Compose healthchecks with exit‑on‑unhealthy policy

### Troubleshooting

* Migrations: run `prisma migrate deploy` in API container
* Bot not messaging: check token + webhook or polling mode
* SSL: run certbot script; confirm A record points to VPS

---

## 12) Contribution Guidelines (Solo‑friendly)

* Conventional commits: `feat(web): add event resize handles`
* One logical change per PR; keep patches small
* Update SoT and ADRs when decisions change
* Add/extend tests when touching core flows

---

## 13) ADRs (Decisions Log — initial)

1. **Source of Truth:** Central PostgreSQL (server) for multi‑device consistency. Obsidian export is a projection.
2. **Desktop Shell:** Electron for Windows; revisit Tauri later if footprint matters.
3. **Reminders:** Telegram DMs + desktop notifications; post‑block reflection mandatory prompts can be snoozed.
4. **Security (MVP):** HTTPS via Nginx/Certbot; hashed secrets; backups; optional TOTP later; client‑side encryption deferred.
5. **Mobile:** Wrap web for Android later; native only if user base justifies.

---

## 14) Test Plan (Smoke)

* Create/move/resize events; cross‑day; overlapping guards
* Drag task → event (with/without estimate); link back to task
* Reminder timings (T‑30/T‑5/start/end); jitter under 10s
* Reflection capture; analytics roll‑up; export idempotency
* Bot commands navigation and pagination

---

## 15) Work Items Backlog (Now → Next)

**Now (0.3.1)**

* Fix drag‑to‑schedule payload & validation
* Implement resize handles + snap grid
* Allow cross‑day events + segmented render
* Add manual time inputs
* Month view scroll & ghosts; edge auto‑scroll

**Next (0.3.2–0.3.4)**

* Bot reminders & commands; dedupe
* HTTPS + healthchecks + protected routes
* Docs/READMEs + seeds + error taxonomy

**Then (0.4.x)**

* Contexts & time windows; layers; dependencies
* Suggestion engine; aging/escalation; reflection‑aware tweaks

---

## 16) How To Use This With Any LLM (Step‑by‑step)

1. **Pin SoT** (`/docs/NEUROBOOST_SoT.md`) and copy it into the new chat.
2. Paste **the exact files** you want modified (or their relevant excerpts).
3. Paste the **Delta‑Only PR Prompt** and the **Guardrails**.
4. Ask for **patch diffs** only; forbid structural changes.
5. Run the diffs locally; if the model requests touching more files, supply them explicitly.
6. Commit with conventional message; update SoT/ADRs when decisions change.

**Tip:** When a session drifts, restart a new chat, paste SoT + current sprint scope + Guardrails. Keep conversations short and task‑scoped.

---

## 17) Open Questions (to resolve when ready)

* Final color system for layers and importance tags
* Where to store detailed reflections (per event vs per day roll‑ups)
* Minimum viable Android shell feature set
* Export file naming convention (by date vs ID vs title)

---

## 18) Appendices

**A. Sample Reflection Schema**

```json
{
  "eventId": "uuid",
  "focus": 0.0,
  "goal": 0.0,
  "mood": 8,
  "notes": "optional text",
  "tags": ["study", "social"],
  "createdAt": "ISO"
}
```

**B. Scheduling Suggestion Pseudocode**

```ts
const suggest = (slots, tasks, energy) => {
  const prioritized = sortByUrgency(tasks);
  const feasible = filterByWindowsAndContext(prioritized, slots);
  return packWithLowContextSwitch(feasible, energy);
};
```

**C. Healthcheck Examples**

* `GET /health` → `{status: "ok", uptime, version}`
* Bot heartbeat: periodic “I’m alive” log; alert on failure

---

> **This document is the new single source of truth.** Keep it updated when decisions change. Use §9 prompts to keep LLMs bounded and consistent.