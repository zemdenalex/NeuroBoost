# Living Spec (v0.3.2 → v0.4.x)

## Surfaces

### Planner
- Weekly/daily calendar grid is the primary interface. 
- Blocks can be dragged and resized to adjust start and end times. All‑day tasks appear at the top; timed tasks occupy their scheduled slots. 
- Deadline‑only tasks (tasks with a due date but no start time) appear below the grid with a **deadline line** overlay at their deadline. Users can drag these into the grid to schedule work blocks.
- Timeline respects **context/time‑of‑day** (e.g., work vs. home) and only suggests within active windows.

### Tasks
- Dedicated page for creating, editing and prioritizing tasks. 
- Each task has: `title`, `type` (`timed` | `deadline` | `all_day`), `estimateMin`, `category` (`emergency` | `asap` | `must_today` | `deadline_soon` | `if_possible` | null), `earliestStartAt?`, `deadlineAt?`, `priority` (1‑5), `energy` (1‑5), `contexts[]`, `tags[]`, `deps[]`, `repeatPattern?` (`daily`, `weekly`, `monthly`, or a Cron‑like rule), `subtasks[]`, and `status` (`todo` | `doing` | `done`).  Categories loosely correspond to the “Emergency/ASAP/Must Today/Deadline Soon/If Possible” buckets from the raw task lists shared by Denis.

  Additional per‑task properties:
  - `emotionalDifficulty` (1–5): how emotionally challenging the task feels.  High values may trigger prompts to break tasks into smaller parts or schedule them during high‑energy periods.
  - `aging`: `{ createdAt, bumps }` where `bumps` counts manual deferrals.  Each deferral slightly increases the task’s suggestion score, surfacing long‑avoided tasks.  The UI can highlight tasks that have aged beyond a configurable threshold.
  - `color`: optional custom color.  If absent, tasks inherit the default color of their category.  Default category colors: Work=blue, Education=purple, Health/Routine=green, Personal=orange, Errands=gray.  This helps visually distinguish types of work.
  - `parent` and `children[]`: pointers for hierarchical task trees.  Top‑level tasks capture broad goals (life goals), mid‑level tasks capture projects or long goals, and leaves are actionable tasks (small goals).  Splitting tasks into subtasks is manual in v0.4.x and will be guided by suggestions in later versions.
- Users can sort tasks by **urgency**, **created**, **deadline**, **category**, or **priority**.  Long lists should be paginated or truncated with “show more” controls.
- Users can toggle task visibility — for example, show only top‑priority tasks, hide repeating or home‑care routines, or filter by context.
- Provide bulk actions (e.g., assign category) and quick filters (e.g., show only ASAP tasks). 
- Visualizations: small charts/heatmaps summarizing tasks by category, completion status, and **repeat frequency**.  For example, a “Home Alone” routine might contain 17 daily caretaking tasks that together consume ~120 minutes; the heatmap should make such clusters obvious.

### Repeating and deadline‑only tasks

Not all tasks deserve a scheduled block on the grid.  Two common patterns are:

1. **Deadline‑only tasks.**  These are lightweight items with a due date but no fixed start time (e.g., “submit application by Thursday”).  They appear below the calendar as a list with a **deadline line** overlay at their due time.  Users can optionally drag them into the grid to allocate work blocks, but the system never schedules them automatically.

2. **Repeating caretaking tasks.**  These are routine chores that recur daily or at fixed intervals (e.g., “feed dogs”, “water plants”).  Rather than clutter the planner with dozens of small blocks, these tasks live in a **Routines** section.  When a routine is activated (e.g., “Home Alone”), the system schedules the associated tasks intelligently across the day, respecting available free windows and contexts (e.g., @home).

The task model therefore includes a `repeatPattern` and a `deps[]` list to specify routines or dependencies.  Repeating tasks can be ticked off quickly from the Tasks page or via the Telegram bot without opening the full planner.

### Reflections
- Capture daily and weekly reflections: `focus (1‑5)`, `mood (1‑5)`, `goalText`, `notes`, `adherence%` (planned vs. completed tasks). 
- Display adherence metrics and trends over time; highlight mismatches between planned and executed schedule.

### Goals & Dreams
- Help users articulate long‑term goals and break them down into sub‑goals and tasks. 
- Provide templates to derive tasks from goals, such as “increase freelance income” → “apply to 10 jobs per week.”

### Gamification *(future)*
- Introduce XP, streaks, badges, and unlockable themes once core planning features are stable. 
- Themes apply alternate color schemes and aesthetics to the monospace base.

### Time Budget *(future)*
- Visual 168‑hour planner where users allocate weekly hours to categories like health, socializing, rest, work, and growth. 
- Suggest distributions and visualize actual vs. planned allocations.

## Suggestions (scoring sketch)

Tasks are ranked using a simple scoring formula:

`S_simple = ((D / max(estimateMin, 5)) * priority) + C + E − R`

Where:

- **D (Deadline/window proximity)**: a piecewise score based on how close the task’s `deadlineAt` or end of its `window` is to now.  Tasks with no deadline or window contribute 0.
- **priority**: the user‑assigned priority (1–5).
- **C (Context fit)**: +1 if your current context exactly matches one of `task.contexts`, +0.5 if partially matches, else 0.
- **E (Energy fit)**: +1 if your current energy (1–5) is within ±1 of `task.energy`, else 0.
- **R (Risk/penalties)**: penalty applied if dependencies are unresolved, the estimated duration exceeds the available free window, or the task recently failed.  Each manual bump recorded in `aging.bumps` slightly increases the score, surfacing long‑avoided tasks.

Future releases will extend this formula with additional terms (aging boost, past adherence, routine weighting, emotional difficulty) as data accumulates.

Return the top‑N tasks along with a short rationale.  **Never auto‑schedule**; always ask for consent.

## Notifications & Bot

- **Customizable nudge policies.** Users can configure when and how often they are reminded.  By default the system sends:
    - **Event reminders** at 30, 10 and 5 minutes before a scheduled event.
    - **Daily planning nudges** at 21:00 local time to plan the next day.
    - **Weekly planning nudges** on Sunday at 18:00 local time to plan the week and reflect on the past week.
    Quiet hours (by default 22:00–08:00) prevent notifications during sleep and are fully configurable.  Snooze options allow postponing reminders.  The message rate is capped at about one Telegram message per minute per user; tasks sharing the same timestamp (for example, multiple deadlines at 15:00) are grouped into a single notification.
- **Telegram UI.** Main menus appear below the input field; long lists (e.g., task lists, monthly views) appear below the message.  Slash commands are optional shortcuts.  Users can configure how many tasks to display at once and choose sort order.  A second, dedicated **notify bot** is used exclusively for one‑way reminders to avoid keyboard collisions; the primary bot handles interactive commands and data entry.
- **Routines.** Routines group tasks and can be activated with one tap (e.g., “Home Alone” routine triggers 17 care tasks). Routines are slotted intelligently into free windows while respecting context and current schedule.

## Export

- Export remains a **dry‑run** by default. Users can export to a zip archive of Markdown files located in `NeuroBoost/`. Export never overwrites or deletes content outside the scoped folder.
- Obsidian integration is optional and minimal. The system does not depend on Obsidian; it simply produces compatible `.md` files for those who use it.

## Feedback & Backlog

Users should never have to hunt through chats or external notes to report issues or suggest improvements.  NeuroBoost therefore includes a **built‑in feedback loop** that funnels all reports into a single backlog:

- **Report bug** buttons in the Planner, Tasks, Reflections and Goals pages open a short form asking “What went wrong?” and optional steps to reproduce.  The UI automatically attaches relevant environment and diagnostic information (client/browser, version, timestamp and anonymized logs) so you don’t have to paste console errors.  For privacy, any personally identifying data (event titles, notes) is stripped before submission.
- **Suggest feature** links prompt you to describe the problem you’d like solved and any ideas you have.  Instead of forcing technical details, the form asks simple questions: “What are you trying to achieve?”, “What’s blocking you?”, and “How would success feel?”.  Users can also mark the priority (Nice to Have, Important, Critical) to help triage.
- **Backend and database.**  A new `Feedback` table stores each submission with fields `{id, userId, type (bug|feature), description, details, logsJson, priority, status ('open'|'triaged'|'in_progress'|'done'), createdAt, resolvedAt}`.  Only authorized developers see the backlog; it never appears in the user‑facing task list.
- **Retrieval and processing.**  An internal `/feedback` API lets maintainers list, filter and update feedback items.  For bug reports, server‑side error logs are attached automatically to speed debugging.  For feature ideas, suggested tags (e.g. planner, tasks, notifications) are added using simple NLP.
- **Integration with development workflow.**  Submissions convert into GitHub issues (or an internal ticket system) via a cron job or manual action.  The backlog helps prioritize the roadmap and feeds into our ADR/decisions log.

The goal of the feedback system is to reduce friction: users click a button, describe what they need in plain language, and the system does the rest.  This also ensures the team has structured, searchable records of all bugs and ideas rather than scattered screenshots and chats.

## Current Focus

- **v0.3.2 Stabilization:** Address remaining inconveniences (notifications reliability, bot flows, week view polish), but defer the monthly view. 
- **v0.4.x Primary Goals:**
  1. Task intelligence enhancements — implement categories and deadline‑only tasks with timeline overlays.  
  2. Dedicated Tasks page with sorting, filtering, subtasks, dependencies, and category heatmaps.  
  3. Routine activation and intelligent slotting based on contexts and free windows.  
  4. Notification center with user‑tunable policies and improved Telegram UX (under‑input vs under‑message keyboards, optional slash commands).  
  5. Reflections improvements (visualizations, adherence insights).
- **Deferred:** Monthly view, time budget page, gamification, attention tracking/in‑app browser. These will be addressed post‑v0.4.x once the core planner and tasks experience is robust.
