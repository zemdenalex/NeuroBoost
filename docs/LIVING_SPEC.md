# Living Spec (v0.3.2 → v0.4.x)

## Surfaces

### Planner
- Weekly/daily calendar grid is the primary interface. 
- Blocks can be dragged and resized to adjust start and end times. All‑day tasks appear at the top; timed tasks occupy their scheduled slots. 
- Deadline‑only tasks (tasks with a due date but no start time) appear below the grid with a **deadline line** overlay at their deadline. Users can drag these into the grid to schedule work blocks.
- Timeline respects **context/time‑of‑day** (e.g., work vs. home) and only suggests within active windows.

### Tasks
- Dedicated page for creating, editing and prioritizing tasks. 
- Each task has: `title`, `type` (`timed` | `deadline` | `all_day`), `estimateMin`, `category` (`emergency` | `asap` | `must_today` | `deadline_soon` | `if_possible` | null), `earliestStartAt?`, `deadlineAt?`, `priority` (1‑5), `energy` (`low` | `med` | `high`), `contexts[]`, `tags[]`, `deps[]`, `repeatPattern?` (`daily`, `weekly`, `monthly`, or a Cron‑like rule), `subtasks[]`, and `status` (`todo` | `doing` | `done`).  Categories loosely correspond to the “Emergency/ASAP/Must Today/Deadline Soon/If Possible” buckets from the raw task lists shared by Denis.
- Users can sort tasks by **urgency**, **created**, **deadline**, **category**, or **priority**.  Long lists should be paginated or truncated with “show more” controls.
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

The suggestion engine computes a score:

`score = U + P + Ctx + Eng + Cat − R`

- **U (Urgency)**: inverse of time to deadline; 0 for non‑deadline tasks. 
- **P (Priority)**: linear weight from user priority (1..5). 
- **Ctx (Context fit)**: +1 if current context matches; +0.5 if partially matches. 
- **Eng (Energy match)**: +1 if energy level matches current user state; else 0. 
- **Cat (Category)**: weight based on category:
  - emergency: +4  
  - asap: +3  
  - must_today: +2  
  - deadline_soon: +1  
  - if_possible or null: +0
- **R (Risk of failure)**: penalty if dependencies are unresolved, estimate exceeds available free window, or the task recently failed.

Return top‑N suggestions with a brief human‑readable rationale. **Never auto‑schedule**; always ask for consent.

## Notifications & Bot

- **Customizable nudge policies.** Users can configure when and how often they are reminded (e.g., 30 minutes before a free slot, hourly, daily). Quiet hours and snooze options are supported. Dedupe is soft and configurable, not hard‑coded.
- **Telegram UI.** Main menus appear below the input field; long lists (e.g., task lists, monthly views) appear below the message. Slash commands are optional shortcuts. Users can configure how many tasks to display at once and choose sort order.
- **Routines.** Routines group tasks and can be activated with one tap (e.g., “Home Alone” routine triggers 17 care tasks). Routines are slotted intelligently into free windows while respecting context and current schedule.

## Export

- Export remains a **dry‑run** by default. Users can export to a zip archive of Markdown files located in `NeuroBoost/`. Export never overwrites or deletes content outside the scoped folder.
- Obsidian integration is optional and minimal. The system does not depend on Obsidian; it simply produces compatible `.md` files for those who use it.

## Current Focus

- **v0.3.2 Stabilization:** Address remaining inconveniences (notifications reliability, bot flows, week view polish), but defer the monthly view. 
- **v0.4.x Primary Goals:**
  1. Task intelligence enhancements — implement categories and deadline‑only tasks with timeline overlays.  
  2. Dedicated Tasks page with sorting, filtering, subtasks, dependencies, and category heatmaps.  
  3. Routine activation and intelligent slotting based on contexts and free windows.  
  4. Notification center with user‑tunable policies and improved Telegram UX (under‑input vs under‑message keyboards, optional slash commands).  
  5. Reflections improvements (visualizations, adherence insights).
- **Deferred:** Monthly view, time budget page, gamification, attention tracking/in‑app browser. These will be addressed post‑v0.4.x once the core planner and tasks experience is robust.
