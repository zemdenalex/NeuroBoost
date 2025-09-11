# Roadmap Snapshot (2025-09-11)

## v0.3.2 Stabilization
- Fix reliability issues: notifications, Telegram bot flows, drag/resize in week view. 
- De‑prioritize monthly view; focus on polishing existing surfaces. 
- Keep export as dry‑run and idempotent.

## v0.4.x — Task Intelligence & Flow
1. **Categories, Repeats & Deadline‑only tasks.** Extend the task model to support repeating patterns (daily/weekly/monthly/Cron) and deadline‑only tasks.  Render deadline lines below the calendar grid and collect repeating chores into routines rather than scheduling each one individually.  Categories map to Emergency/ASAP/Must Today/Deadline Soon/If Possible buckets.
2. **Dedicated Tasks page.** Implement sorting (urgency, created, deadline, category), filtering, subtasks, dependencies, context & energy assignment, category heatmaps.  
3. **Routines & Smart Slotting.** Allow users to define routines (groups of tasks) and activate them with one tap. Use suggestion engine to slot routine tasks into free windows while respecting contexts and energy.  
4. **Notification Center & Bot UX.** Add per‑user nudge policies, quiet hours, snooze; unify web and Telegram notifications; allow optional slash commands and adjustable list lengths.  
5. **Reflections & Adherence.** Improve reflections page with adherence charts and insights; link reflections to suggestions (e.g., if low focus, suggest shorter tasks).

## Later — Beyond v0.4.x
- **Goals & Dreams.** Guide users to break long‑term goals into tasks; provide goal templates and progress trackers. 
- **Time Budget.** 168‑hour visual planner with suggested allocations for health, socializing, rest, work, and growth. 
- **Gamification & Themes.** Introduce XP, streaks, badges, and unlockable themes. 
- **Attention Tracking.** Integrate optional Cold‑Turkey‑like attention tracking with an in‑app browser and time spent measurement.
