# Decisions Log (ADR‑style)

- 2025-09-11 — Confirm that Obsidian is optional; primary focus is a smart task/calendar system. Export remains a dry‑run zip of Markdown files.
- 2025-09-11 — Introduce task categories (emergency, asap, must_today, deadline_soon, if_possible) and deadline‑only tasks. Suggestions engine updated accordingly.
- 2025-09-11 — Monthly view de‑prioritized indefinitely; tasks, notifications, bot, and web polish take priority.
- 2025-09-11 — Nudge deduplication becomes configurable rather than a hard constraint.
- 2025-09-11 — UI structure: separate pages for Planner, Tasks, Reflections, Goals & Dreams; Gamification and Time Budget are future modules.

## 2025-09-11 — Additional refinements

- Introduce **repeating caretaking tasks** (daily/weekly routines) and a **Routines** section.  Routines group small recurring chores (e.g., pet care) and schedule them intelligently when activated.
- Clarify that **deadline‑only tasks** live below the calendar until the user drags them into the grid.  The system never auto‑schedules them.
- Task model updated: `repeatPattern` may be daily, weekly, monthly, or Cron‑like; categories map to raw buckets (Emergency/ASAP/Must Today/Deadline Soon/If Possible).  Sort order can be paginated.
- Visualization updated: heatmaps should surface clusters of repeating tasks and their time cost.
- LLM sessions should use new scripts (`gen-delta.ps1`, `gen-delta.js`) and top‑of‑file notes for large files.

## 2025-09-11 — Contexts, Energy and Scoring

- Adopt a **default set of contexts** (`@home`, `@computer`, `@university`, `@work`, `@errands`, `@personal`, `@routine`) with the ability for users to create custom contexts.  Contexts drive suggestions and filtering.
- Switch the **energy** field to a numeric 1–5 scale with semantic descriptions (1 = very low energy, 5 = full focus).  The suggestion engine now matches tasks to the user’s energy within ±1.
- Replace the old linear scoring formula with **S_simple = ((D / max(estimateMin, 5)) * priority) + C + E – R**, where D is deadline/window proximity, C is context fit, E is energy fit and R is risk/penalties.  Age bumps slightly increase the score.
- Add **task visibility toggles**, allowing users to hide or show certain categories (e.g., repeats/home‑care) or focus on top‑priority items.
- Default nudge windows defined: event reminders at **30**, **10** and **5** minutes before start; **daily planning** prompts at **21:00** local time; **weekly planning** prompts on **Sunday at 18:00** local time.  Users can override these times.
- Introduce a **rate limit** of roughly **one Telegram message per minute per user**.  Tasks sharing an identical timestamp are grouped into a single message.
- Create a **dedicated notify bot** for one‑way reminders, separate from the interactive bot.  Notifications respect quiet hours (default 22:00–08:00) and snooze settings.
- Define **anxiety‑safe routines**: routines render as sequential checklists by default rather than long blocking blocks; users can pause or modify them without penalty.
- Expand the product tenets with new points on the notify bot, anxiety‑safe routines, and transparent scoring & filters (Tenets 10–12).
- Split the v0.4.x roadmap into sub‑versions (0.4.1–0.4.6) covering contexts/energy, routines/dependencies, smart slotting/aging, notifications, reflections, and export/sharing.  Outline later versions (v0.5.x–v1.0.x) for authentication, gamification, optimization, ML, beta and GA.

## 2025-09-11 — Feedback & Backlog

- Introduce a **built‑in bug report and feature suggestion system** accessible from every page and via the bot.  Reports collect environment info and anonymized logs; suggestions ask user‑centric questions rather than technical details.
- Define a new `Feedback` table `{id, userId, type, description, details, logsJson, priority, status, createdAt, resolvedAt}` with an internal API for maintainers to triage and resolve submissions.
- Include a new **Feedback built in** tenet (Product Tenet #13) to emphasize that user feedback loops are essential to product quality.
- Update NFRs to ensure bug logs anonymize PII and limit log size.
- Add a backlog feature to the roadmap (see v0.4.7).
