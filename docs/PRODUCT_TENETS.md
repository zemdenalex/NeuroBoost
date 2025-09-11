# Product Tenets (Non‑Negotiables)

1. **Calendar‑first planning.** The calendar is the primary surface; tasks exist to support scheduling and reflection, not the reverse.

2. **Task intelligence.** The system supports deadline‑only tasks, time estimates, categories (emergency, asap, must_today, deadline_soon, if_possible), contexts, energy levels, dependencies, and routines. These attributes feed a smart suggestion engine that proposes the next action but never schedules automatically.
   - Tasks may be **repeating** (daily, weekly, monthly, or Cron‑like) and can be grouped into **routines** that slot multiple chores at once (e.g., care of pets during Home Alone).

3. **Respectful push.** Nudges and reflections are duration‑aware and context‑aware. Users can customize reminder policies (frequency, quiet hours, deduping). Weekly planner prompts help plan the week.

4. **Low‑friction capture.** Keyboard‑first web UI and Telegram bot (optional), with quick add and slash commands. Main menus appear as reply keyboards under the text input; long lists use under‑message keyboards. The number of visible tasks and sort order are adjustable.

5. **Plan vs. Actual.** Lightweight reflections (focus, mood, goal) and adherence reports drive iterative improvements.

6. **Data ownership.** The internal database is the source of truth. Exports are idempotent zip archives of Markdown files; nothing outside `NeuroBoost/` is written; never destructive.

7. **Safety & performance.** No third‑party telemetry; secure defaults (TLS, Argon2id) and performance budgets (week view <1.5 s for 200 blocks, create/update <500 ms). Observability is local and privacy‑friendly.

8. **Modularity.** The interface is divided into focused pages: Planner (calendar), Tasks, Reflections, Goals & Dreams, and later Gamification and Time Budget. Each page surfaces only what’s needed.

9. **A11y & keyboard.** Minimal monospace theme with two accent colors; full keyboard navigation; future theming unlocked via gamification.
