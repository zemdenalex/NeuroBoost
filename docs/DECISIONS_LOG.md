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
