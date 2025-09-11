# Roadmap Snapshot (2025-09-11)

## v0.3.2 Stabilization
- Fix reliability issues: notifications, Telegram bot flows, drag/resize in week view. 
- De‑prioritize monthly view; focus on polishing existing surfaces. 
- Keep export as dry‑run and idempotent.

## v0.4.x — Task Intelligence & Flow
The **v0.4.x series** is split into focused sub‑versions to iteratively build a smarter task experience:

- **v0.4.1 – Contexts & Energy.** Introduce built‑in contexts (`@home`, `@computer`, `@university`, `@work`, `@errands`, `@personal`, `@routine`) and allow users to define their own.  Switch the `energy` field to a numeric 1–5 scale with semantic hints (1 = very low energy, 5 = full focus).  Update the suggestion engine to score tasks based on context and energy fit.

- **v0.4.2 – Routines & Dependencies.** Implement routines as anxiety‑safe checklists rather than long blocking slabs; let users define dependencies between tasks and manually bump aging counters.  Build a dedicated Tasks page with sorting, filtering, visibility toggles (e.g., show only top‑priority, hide repeats/home‑care, filter by context), subtasks, parent/child relationships, and category heatmaps.

- **v0.4.3 – Smart Slotting & Aging.** Expand the suggestion engine to account for time windows and manual bump count.  Add support for splitting tasks into subtasks and connecting goals → projects → tasks → subtasks in the UI.  Provide manual time input for precise scheduling, including cross‑midnight events.

- **v0.4.4 – Notifications Backbone.** Deploy a dedicated notify bot for one‑way reminders.  Implement default nudge windows: event reminders at 30, 10 and 5 minutes before start; daily planning prompts at 21:00; weekly planning prompts at Sunday 18:00.  Add quiet hours (default 22:00–08:00), rate limiting (≈1 message/min), grouping of tasks with identical timestamps, snooze controls and opt‑in per‑task reminders.

- **v0.4.5 – Reflections & Analytics.** Enhance reflections with adherence charts and mood/focus statistics.  Offer daily and weekly summaries and integrate reflection outcomes (e.g., low focus) into suggestion weighting.

- **v0.4.6 – Export & Sharing.** Finish the export pipeline (zip of Markdown files) and allow simple sharing of routines or task templates.  Keep export idempotent and dry‑run by default.

## v0.5.x – Authentication & Multi‑User
Add Telegram‑based authentication and basic user isolation.  Deploy early Windows/Android shells and finalize server and TLS configuration.

## v0.6.x – Gamification & Goals/Dreams
Revamp goal and task hierarchies; introduce categories, tags and color themes.  Add XP, streaks and badges; unlock new UI themes.

## v0.7.x – Optimization & Native Shells
Focus on performance and optimization; release macOS/iOS shells.  Refine bot interactions and offline support.

## v0.8.x – Intelligence & Attention Tracking
Introduce basic ML‑based suggestions and time‑prediction models once enough data exists.  Add optional attention tracking (in‑app browser/time spent metrics) with strong privacy controls.

## v0.9.x – Open Beta & Pricing
Prepare for open beta with a subscription model.  Add an “about us” page and donation/subscription flows.  Continue polish.

## v1.0.x – General Availability
Launch the product publicly, migrate to more scalable servers, and start the next development cycle.
