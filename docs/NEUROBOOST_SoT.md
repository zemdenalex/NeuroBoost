# NeuroBoost — Master Handoff & LLM Workflow (v0.3.x → v0.4.x)

**Owner:** Denis (zemdenalex)  
**Scope:** Consolidated history, decisions, current state, roadmap, and a practical LLM development playbook.  
**Goal:** Make the project coherent, executable, and easy to iterate with LLMs without losing structure.

---

## 1) Executive Summary

NeuroBoost is a calendar‑first personal assistant designed to **push planning, reminders, plan‑vs‑actual logging, and reflection** while remaining **Obsidian‑compatible** and **self‑hostable**. The immediate focus is **stability and polish of v0.3.x** (everything that exists must work) followed by **task intelligence in v0.4.x** (contexts, time windows, dependencies, smarter scheduling).

**MVP pillars**

- Daily planning loop with enforced time‑blocking and fast capture
    
- Reminders (pre‑block, start‑of‑block, post‑block reflection)
    
- Plan‑vs‑Actual side‑by‑side with simple analytics
    
- Obsidian exports with stable IDs (idempotent re‑export)
    
- Telegram quick capture + reminders; Windows shell wrapper
    

**Non‑goals (MVP):** Rich third‑party calendar sync, native mobile apps, AI heavy features, complex offline CRDT sync.

---

## 2) Vision Evolution (What changed & why)

**Early concept → Now**

- From a general “productivity + knowledge” tool to a **pushy, calendar‑centered assistant**.
    
- From equal weight on tasks/notes to **time‑blocking first**, with tasks feeding the schedule.
    
- From “full multi‑user” to **single‑user MVP** while keeping architecture multi‑tenant‑ready and preparing for security enhancement and authorization implementation.
    
- From “AI soon” to **collect the right data first** (events, reflections, completion times), then add intelligence.
    

**Next 6–12 months (directional)**

- Mature the **reminder/reflect loop**, then add **task intelligence** (contexts, windows, dependencies).
    
- Introduce **simple learning** (no ML infra at first): simple algorithm, that estimates from history; then progress to smarter suggestions.
    
- Only after polish: **Android shell** (wrap web), then selective integrations.
    

---

## 3) Architecture Snapshot (Target for v0.3.x)

- **Frontend:** React + TypeScript + Tailwind (week/month views, drag/move/resize, plan vs actual, different pages for different purposes)
    
- **Backend:** Node/Express (REST), Prisma ORM, PostgreSQL (single tenant for now)
    
- **Bot:** Telegram (Telegraf) for capture, reminders, and simple commands
    
- **Desktop:** Electron shell (Windows) to enable startup‑on‑boot, tray, notifications
    
- **Export:** Markdown with YAML front‑matter, stable IDs, idempotent
    
- **Infra:** VPS (Ubuntu), Docker Compose, Nginx + Certbot (HTTPS), health checks
    

**Key domain objects**

- **Event**: {id, title, startsAt, endsAt, layerId, sourceTaskId?, reflection{focus%, goal%, mood1‑10}}
    
- **Task**: {id, title, priority, estimatedMinutes?, deadline?, layerId?, contexts[], timeWindow?, parentTaskId?, dependencies[]}
    
- **Layer** (calendar context): Work, Personal, Health, Education, Social, Home Care (toggle visibility; colors)
    

---

## 4) Current State → Gaps (Truth list for v0.3.x)

### Works

**Calendar (Web UI):**

- Week/month rendering with drag-to-create
- Event creation by drag; move/resize with 15-min snap
- Task creation with priorities (0-5)
- Reflection fields (focus %, goal %, mood 1-10)
- Drag task → calendar creates events linked via `sourceTaskId`; task status updates to `SCHEDULED`
- WeekGrid ghost preview clipped inside time grid with start/end time labels
- Edge auto-scroll triggers near top/bottom; stops on drop
- Basic stats calculation and display

**Telegram Bot (Restructured v0.3.1):**

- Modular architecture (155-line entry point, clean separation of concerns)
- Persistent reply keyboard with 10 buttons (🤖 Smart Suggestions, 📋 Tasks, 🌍 Contexts, etc.)
- Reply keyboard buttons trigger correct handlers (no more falling through to generic text)
- New Task wizard: free text → priority selection → task creation
- Quick Note wizard: explicit trigger only (/note or button, no auto-inference)
- Task list with pagination (10/page), priority grouping, correct emojis (🧊🔥⚡📌⏳💡)
- Commands functional: /start, /help, /tasks, /note, /stats, /today, /calendar, /contexts, /routines, /cancel
- Task filtering by priority
- Stats display (weekly adherence, events, reflections)
- Session management working (wizards maintain state)

**Backend:**

- PostgreSQL schema stable
- Prisma migrations working
- REST API endpoints functional
- Health check endpoint (/health)
- Basic logging

**Infrastructure:**

- VPS online (HTTP only)
- Docker Compose setup
- PostgreSQL containerized

### Broken / Missing (must fix in v0.3.x)

**Calendar (High Priority):**

- **Month view (vertical)**: infinite scroll stutter/resets; range highlight should span start→hover continuously; auto-scroll must stop on drop; weekend behavior identical to weekdays (no visual distinction)
- **Task reordering**: drag-between-items always re-sorted by name/ID; reordering triggers full sidebar refresh and loses focus
- **Recurring events** not implemented yet

**Telegram Bot (Medium Priority):**

- **Event display** incomplete: can't view today's schedule or week overview properly
- **Reminders system** not implemented: no pre-event, start-of-block, or reflection prompts
- **Work hours configuration** incomplete: can't fully set/save work hours and days
- **Notification deduplication** missing: could send duplicate reminders
- **v0.4.x features** are stubs only: contexts, layers, routines, smart suggestions show placeholder messages

**Security (Critical):**

- **HTTPS missing**: all traffic over HTTP, including credentials
- **No authentication**: anyone with URL can access calendar
- **Health checks sparse**: no monitoring of service health
- **Error reporting** minimal: errors fail silently or show generic messages
- **Input validation** gaps: accepts some invalid inputs

**Technical Debt:**

- Single hardcoded user (no multi-user support yet)
- No automated tests (manual testing only)
- Basic error handling (needs improvement)
- No caching layer
- No real-time updates (must refresh)
- Touch support incomplete (mobile drag issues)

### Partially Working (needs polish)

**Event Resizing:**

- Top/bottom resize handles exist
- 15-min snap working
- Edge cases need handling (cross-midnight resize, collision detection)

**Task-Event Linking:**

- Basic linking via `sourceTaskId` works
- Visual indicators incomplete
- Can't easily unlink or relink

**Bot Keyboards:**

- Reply keyboard works but some contextual inline keyboards need better state management
- Pagination works but could be smoother
- Filter menu functional but limited options

---

## 5) v0.3.x Plan — “Make Everything Actually Work”

### 0.3.1 — Core Fixes (5–7 days)

1. **Manual time input (editor)**
    

- Allow free‑form HH:MM typing (e.g., `1050 → 10:50`) with no snap
    
- Backspace/delete must not shift other fields; robust parsing; Enter=save, Esc=cancel.
    
- Cross‑midnight entries (e.g., 22:00→06:00) remain **timed**, not all‑day.
    

2. **Cross‑day timed events**
    

- Create and edit events that span midnight; render as segmented blocks with continuation markers on both days; allow resizing across midnight. Not all-day events, but timed with start and finish on different dates.
    

3. **Month view polish**
    

- **Vertical infinite scroll** without reset/stutter; header month follows the **middle week**.
    
- Drag‑to‑create all‑day: **highlight entire range from start day to hovered day** with same color for all of them.
    
- Edge auto‑scroll up/down while dragging; **stop immediately on drop (before editor opens) or escape pressed**.
    
- **Timed creation disabled** in Month view; show a subtle tip to use Week view for timed blocks.
    

4. **Task reordering**
    

- Preserve exact visual order on drop (no hidden alpha/ID sorts); append on cross‑bucket; maintain fractional priority in `[⌊p⌋, ⌊p⌋+1)`.
    
- Reorder without full refresh; focus retention; ARIA live announcements.
    

5. **Touch support (defer if needed)**
    

- Long‑press create; basic thresholds; _desktop remains the focus in 0.3.x_.
    

### 0.3.2 — Telegram Activation (7–10 days)

- **Reminders**: pre‑event (30/5/1 min options), start‑of‑block, post‑block reflection, timed tasks/deadlines
    
- **Commands**: `/start`, `/help`, `/task`, `/top`, `/today`, `/plan`, `/reflect`
    
- **Keyboards**: persistent reply markup; stable pagination; dedupe. Different keyboards for different purposes (i. e. reply buttons for main menus, inline buttons for lists/tasks/events)
    
- **Event↔Task linking**: optional flag or drag‑linking UI
    

### 0.3.3 — Auth & HTTPS (4–6 days)

- **HTTPS** via Nginx + Certbot; **/health** endpoints; compose healthchecks
    
- **Auth**: Telegram‑issued token for web; protect week grid routes; user isolation in DB shape
    

### 0.3.4 — Documentation & Hardening (3–4 days)

- Module READMEs; API reference (OpenAPI or MD tables)
    
- Error taxonomy + toasts; input validation; seeds + demo data
    
- Smoke tests; backup/restore guide; logging & tracing basics
    

**Definition of Done (v0.3.x)**

- 48 hours of uninterrupted use without a broken flow
    
- All drags/moves/resizes behave predictably
    
- Bot delivers reminders reliably with low jitter
    
- HTTPS+healthchecks green; deployment reproducible from README
    

### 0.3.5 — Multi-page web app MVP (5–7 days)

- Add new pages for different purposes.
    
- Simple main page explaining website functionality, purpose and philosophy behind it.
    
- Profile page with stats and visualisations. 
    
- Mocked up for now authentication page (login/sign up).
    
- Tasks page for better visualization and organization of tasks, simple algorithm help for prioritizing, psychological/philosophical/management helpers like. 
    
- Reflections page with stats on what was actually done, or how you feel about things, suggestions of what to do by simple algorithm.
    
- Goals and dreams page, close to tasks page, but different feel about it, it should help user understand what to focus on, manage philosophy, what to put into main priorities and what tasks to derive from that.
    
- Gamification page to help user ease into the process of using the app, close to reflections and profile pages, but a bit different focus, like XP, stats, etc. 
    
- New header menu to help navigate through website. 
    
- Only simple pages for now, don't polish, main focus is on grids, calendar, tasks, bot.



---

### Version 0.3.x Mission Statement

Version 0.3.x exists to transform NeuroBoost from a "mostly working demo" into a "reliable daily driver." Every feature that exists in the UI should work exactly as expected. No new features until everything current is rock-solid. This is about building trust with the system - if dragging a task to the calendar fails, users won't trust anything else.

By the end of v0.3.x:

- Denis can use NeuroBoost for 48 hours straight without encountering a single broken feature
- Every drag operation works smoothly
- The Telegram bot responds correctly to all existing commands
- The VPS deployment is secure with SSL
- Documentation exists for every module

---

### Current State Analysis (v0.3.0 → v0.3.1)

#### What's Working

- Basic week/month view rendering
- Event creation via drag (with limitations)
- Task creation and priority system
- Telegram bot basic structure
- Database schema and API endpoints
- Reflection system (focus/goal/mood)
- Stats calculation
- VPS deployment (HTTP only)

#### What's Completely Broken

1. **Drag Task to Calendar** - Throws "Validation error" every time
2. **Event Resizing** - Feature doesn't exist despite being in spec
3. **Multi-day Timed Events** - Cannot create events crossing midnight
4. **Manual Time Input** - No way to input precise times like 10:50 or 12:25
5. **Recurring Events** - Not implemented
6. **Mobile Drag to Create** - Doesn't work at all on touch devices

#### What's Partially Broken

1. **Month View** - Can't properly scroll between months, ghost previews don't work right
2. **Telegram Keyboard** - Moves up with notifications (inline buttons instead of reply buttons)
3. **Task Display in Bot** - Shows too few tasks

#### What's Missing but Expected

1. **SSL Certificate** - Security risk
2. **Health Checks** - No monitoring
3. **Error Recovery** - Fails silently
4. **Module Documentation** - No guides for development
5. **Data Validation** - Accepts invalid inputs
6. Authentication - Anyone can see my tasks and calendar just by having address

---

### Version 0.3.1: Core Functionality Fixes

**Timeline:** 5-7 days  
**Theme:** "The Big Fix"  
**Success Criteria:** All drag operations work, all time-related bugs fixed
#### Priority 1: Multi-day Timed Events (Day 3-4)

**Current Behavior:**

- Cannot create event from 22:00 to 06:00 next day
- System confused about which day the event ends

**Expected Behavior:**

- Drag from Monday 22:00 to Tuesday 06:00 creates single event
- Event shows on both days
- Clear visual indication of continuation

**Implementation Requirements:**

1. **Creation Flow:**
    
    - Allow drag across day boundaries in week view
    - Calculate total duration correctly
    - Store as single event with multi-day flag
2. **Display Logic:**
    
    - Split rendering across days
    - Show "continues from previous day" indicator
    - Show "continues to next day" indicator
    - Correct height calculation for each segment
3. **Edge Cases:**
    
    - Events spanning multiple days (concert festival)
    - Events starting at exactly midnight
    - Events ending at exactly midnight
    - Weekend wrap-around

**Testing Checklist:**

- [ ] Create sleep event (22:00-06:00)
- [ ] Create weekend event (Fri 18:00-Mon 09:00)
- [ ] Move multi-day event
- [ ] Resize multi-day event
- [ ] Delete multi-day event

#### Priority 2: Manual Time Input (Day 4-5)

**Current Behavior:**

- Can only set times by dragging to grid positions
- Grid snaps to 15-minute intervals
- Cannot set precise times like 10:50

**Expected Behavior:**

- Click on time in event editor opens input
- Can type exact time
- Validates format and range
- Updates event immediately

**Implementation Requirements:**

1. **UI Components:**
    
    - Replace time display with input fields on click
    - Support formats: "10:50", "1050", "10:50 AM"
    - Show validation errors inline
2. **Validation Rules:**
    
    - Valid time range (00:00-23:59)
    - End time after start time
    - Handle day boundary logic
3. **User Experience:**
    
    - Tab between start and end time
    - Enter key saves
    - Escape cancels edit
    - Click outside saves if valid

**Testing Checklist:**

- [ ] Enter valid times
- [ ] Enter invalid formats
- [ ] Set end before start
- [ ] Quick entry (1050 → 10:50)
- [ ] AM/PM handling

#### Priority 3: Month View Improvements (Day 5-6)

**Current Issues:**

- Cannot scroll between months (only buttons work)
- Ghost preview missing on weekends
- Ghost missing on source day during drag
- Cannot create events longer than visible month

**Fix Requirements:**

1. **Scrolling:**
    
    - Add vertical scroll for continuous months
    - Update current month indicator based on viewport
    - Lazy load months as needed
    - Smooth scroll to today button
2. **Ghost Previews:**
    
    - Fix weekend highlighting
    - Show ghost on drag source
    - Consistent ghost across all days
3. **Multi-month Events:**
    
    - Allow drag beyond visible month
    - Auto-scroll when near edges
    - Show event spanning months

**Testing Checklist:**

- [ ] Scroll through 12 months
- [ ] Create event on weekend
- [ ] Create 3-month event
- [ ] Performance with 100+ events

#### Priority 4: Touch Support (Day 6-7)

**Current Behavior:**

- Drag to create doesn't work on mobile/tablet
- Can't resize on touch devices
- Can't scroll while dragging

**Expected Behavior:**

- Long press to start drag
- Visual feedback for touch
- Scroll while dragging near edges

**Implementation Requirements:**

1. **Touch Events:**
    
    - Handle touchstart/touchmove/touchend
    - Long press (500ms) to initiate drag
    - Prevent default scrolling during drag
2. **Mobile UX:**
    
    - Larger touch targets (min 44px)
    - Haptic feedback if available
    - Cancel drag on multitouch
3. **Responsive Adjustments:**
    
    - Single day view on phones
    - 3-day view on tablets
    - Bigger handles for resize

**Testing Checklist:**

- [ ] Create event on iPhone
- [ ] Create event on Android
- [ ] Resize on tablet
- [ ] Scroll while viewing

---

### Version 0.3.2: Telegram Bot Rehabilitation

**Timeline:** 3-4 days  
**Theme:** "Bot That Actually Works"  
**Success Criteria:** All bot commands work, keyboard doesn't jump

#### Fix 1: Keyboard Management

**Current Problem:**

- Inline keyboard moves up with each message
- Need to scroll or /start to see buttons again

**Solution Approach:**

1. Switch from inline keyboards to reply keyboards where appropriate
2. Keep main menu as persistent keyboard
3. Use inline only for contextual actions
4. Consider separate notification bot

**Implementation:**

- Main menu: Reply keyboard (always visible)
- Actions: Inline keyboards (temporary)
- Notifications: Separate bot, simple keyboards to answer notifications (later versions), like delay, postpone, mark done, reflect, etc.

#### Fix 2: Task Display

**Current Problem:**

- Shows only 3-5 tasks
- No pagination
- Can't see all priorities

**Solution Requirements:**

1. Show tasks grouped by priority
2. Pagination with "Show more" button
3. Summary count at top
4. Filter options

**Display Format:**

```
📋 Tasks (23 total)

🔴 Emergency (1)
- Fix production database

🟡 Must Today (3)
- Review PR #45
- Call with client
- Send weekly report

[Show more...] [Filter]
```

#### Fix 3: Command Structure

**Add Basic Commands:**

- `/start` - Show main menu
- `/help` - List all commands
- `/tasks` - Show task list
- `/today` - Today's agenda
- `/week` - Week overview

**Keep Keyboard Flow:**

- Main interactions still via keyboard
- Commands as shortcuts
- Consistent navigation

#### Fix 4: Event Display

**Current:** Basic list **Needed:** Structured timeline

```
📅 Today - Sept 4

Morning:
09:00-10:00 📘 Team standup
10:30-12:00 📗 Deep work

Afternoon:
14:00-15:00 📘 Client call
16:00-17:00 📗 Code review

Evening:
No events planned
```

#### Fix 5: Reflection Prompts

**Implementation:**

- Store pending reflections
- Send reminder after event ends
- One-click reflection start
- Guide through focus/goal/mood

#### Fix 6: Error Messages

**Current:** Silent failures or generic errors **Needed:** Helpful, specific messages

Examples:

- "Task creation failed" → "Please add a task title"
- "Invalid input" → "Priority must be 0-5"
- Connection errors → "Server unavailable, try again in a moment"

---

### Version 0.3.3: Infrastructure & Health

**Timeline:** 2-3 days  
**Theme:** "Production Ready"  
**Success Criteria:** SSL working, monitoring active, errors logged

#### Priority 1: SSL Certificate

**Requirements:**

1. Let's Encrypt certificate
2. Auto-renewal setup
3. Redirect HTTP to HTTPS
4. Update all API URLs

**Implementation Steps:**

1. Install certbot
2. Generate certificate for domain
3. Configure nginx for SSL
4. Setup auto-renewal cron
5. Test SSL Labs rating (aim for A)

#### Priority 2: Health Monitoring

**Endpoints Needed:**

- `/health` - Basic alive check
- `/health/detailed` - Database, disk, memory
- `/health/dependencies` - External services

**Monitoring Setup:**

1. Uptime monitoring (every 5 min)
2. Alert if down >2 checks
3. Daily health report
4. Performance metrics

#### Priority 3: Error Handling

**Requirements:**

1. Catch all unhandled errors
2. Log with context
3. User-friendly messages
4. Recovery procedures

**Error Categories:**

- Database connection lost → Retry with backoff
- Invalid user input → Clear error message
- Server errors → Log and notify admin
- Rate limits → Queue and retry

#### Priority 4: Backup System

**Daily Backups:**

1. Database dump at 3 AM MSK
2. Compress and encrypt
3. Store locally + remote
4. Keep 30 days of backups
5. Test restore monthly

#### Priority 5: Logging Enhancement

**Structured Logging:**

- Request ID for tracing
- User context
- Performance metrics
- Error stack traces
- Daily rotation

---

### Version 0.3.4: Polish & Small Features

**Timeline:** 2-3 days  
**Theme:** "Nice to Haves"  
**Success Criteria:** Colors working, recurring events tested

#### Feature 1: Event/Task Colors

**Implementation:**

- 8 preset colors
- Color picker in advanced options
- Colors by category mapping
- Consistent across views

**Categories & Default Colors:**

- Work/Professional - Blue (#3B82F6)
- Education/Learning - Purple (#8B5CF6)
- Health/Exercise - Green (#10B981)
- Social/Family - Pink (#EC4899)
- Routine/Chores - Gray (#6B7280)
- Hobbies/Fun - Orange (#F97316)
- Rest/Sleep - Indigo (#6366F1)
- Other/Default - Zinc (#71717A)

#### Feature 2: Recurring Events Testing

**Test Scenarios:**

1. Daily standup (weekdays only)
2. Weekly therapy (every Thursday)
3. Monthly rent (1st of month)
4. Yearly birthday
5. Custom pattern (every 3 days)

**Edge Cases:**

- Skip single occurrence
- Edit single vs series
- Delete series
- Modify middle occurrence

#### Feature 3: Quick Actions

**Keyboard Shortcuts:**

- `N` - New event at current time
- `T` - New task
- `Space` - Toggle sidebar
- `/` - Search
- `?` - Show shortcuts

#### Feature 4: Performance Optimization

**Targets:**

- Week view load <1.5s
- Smooth 30fps dragging
- Instant task creation
- No lag with 200+ events

**Optimizations:**

- Virtual scrolling for long lists
- Debounce drag updates
- Cache weekly data
- Lazy load month view

#### Feature 5: Data Export

**Export Options:**

- CSV export for events
- JSON backup
- Task list as markdown
- Weekly report PDF

---

### Module Documentation Requirements

Each module needs a `README_MODULE.md` file with:

#### 1. API Module (`apps/api/`)

```markdown
# API Module

## Purpose
RESTful API serving calendar events, tasks, and user data.
Handles all business logic and database operations.

## Key Files
- server.mjs - Express server setup
- routes/*.mjs - Endpoint definitions
- services/*.mjs - Business logic
- prisma/schema.prisma - Database schema

## Environment Variables
- DATABASE_URL - PostgreSQL connection
- PORT - Server port (default 3001)
- LOG_LEVEL - info|debug|error

## Key Endpoints
[List all endpoints with parameters]

## Database Operations
[Common queries and migrations]

## Error Codes
[All possible error responses]

## Testing
npm run test:api
```

#### 2. Bot Module (`apps/bot/`)

```markdown
# Telegram Bot Module

## Purpose
Interactive bot for task capture and notifications.
Provides mobile-friendly interface to core features.

## State Management
- Session-based conversations
- Keyboard navigation
- Command shortcuts

## Message Flows
[Diagram of conversation trees]

## Integration Points
- API calls to backend
- Notification scheduling
- Session storage

## Deployment
- Webhook vs polling
- Environment setup
- Bot father commands
```

#### 3. Web Module (`apps/web/`)

```markdown
# Web UI Module

## Purpose
Primary interface for calendar and task management.
Rich interactions with drag-and-drop.

## Component Structure
- /components/Calendar - Week/Month views
- /components/Events - Event editor
- /components/Tasks - Task sidebar
- /stores - State management

## Key Features
- Drag to create/move/resize
- Keyboard shortcuts
- Touch support
- Responsive design

## API Integration
- Event CRUD
- Real-time updates
- Optimistic mutations
```

---

### Testing Protocol for v0.3.x

#### Smoke Tests (After Each Sub-version)

**Manual Testing Checklist:**

1. **Event Creation**
    
    - [ ] Drag to create in week view
    - [ ] Drag to create in month view
    - [ ] Create all-day event
    - [ ] Create multi-day event
    - [ ] Quick create button
2. **Event Manipulation**
    
    - [ ] Move within day
    - [ ] Move across days
    - [ ] Resize start time
    - [ ] Resize end time
    - [ ] Edit via double-click
    - [ ] Delete via keyboard
3. **Task Operations**
    
    - [ ] Create task with each priority
    - [ ] Drag task to calendar
    - [ ] Mark task complete
    - [ ] Create subtask
    - [ ] Delete task
4. **Telegram Bot**
    
    - [ ] /start shows menu
    - [ ] Create quick note
    - [ ] Create task
    - [ ] View today's events
    - [ ] View tasks by priority
5. **Data Integrity**
    
    - [ ] Events persist after refresh
    - [ ] Tasks maintain status
    - [ ] Reflections saved
    - [ ] Times display correctly (MSK)

#### Performance Benchmarks

**Acceptable Thresholds:**

- Page load: <3 seconds
- Event creation: <1 second
- Drag feedback: <100ms
- API responses: <500ms
- Bot responses: <2 seconds

#### Regression Tests

**After v0.3.4, verify nothing broke:**

1. All v0.3.1 fixes still work
2. Bot improvements intact
3. SSL certificate valid
4. No new console errors
5. Mobile still functional

---

### Development Guidelines

#### Code Quality Standards

**For Fixes:**

- Don't just patch, fix properly
- Add comments explaining the fix
- Include error handling
- Log important operations

**For Refactoring:**

- Only if it makes the fix cleaner
- Don't refactor working code
- Keep changes focused
- Document why refactored

#### Git Workflow

**Branch Strategy:**

```
main
├── v0.3.x-dev (main development branch)
│   ├── fix/drag-task-to-calendar
│   ├── fix/event-resizing
│   ├── fix/multi-day-events
│   └── feature/event-colors
```

**Commit Messages:**

```
fix(calendar): drag task to calendar validation
feat(events): manual time input
refactor(bot): keyboard management
docs(api): add endpoint documentation
```

#### Review Checklist

Before merging each fix:

- [ ] Feature works as specified
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Error cases handled
- [ ] Documentation updated
- [ ] No performance regression

---

### Time Allocation

#### v0.3.1 (Week 1)

- Day 1-2: Drag task to calendar + Event resizing
- Day 3-4: Multi-day events + Manual time
- Day 5-6: Month view + Touch support
- Day 7: Testing & bug fixes

#### v0.3.2 (Week 2, Days 1-4)

- Day 1: Keyboard management
- Day 2: Task display & commands
- Day 3: Event display & reflections
- Day 4: Error handling & testing

#### v0.3.3 (Week 2, Days 5-7)

- Day 5: SSL setup
- Day 6: Health monitoring
- Day 7: Backup system

#### v0.3.4 (Week 3)

- Day 1-2: Colors & categories
- Day 3: Recurring events testing
- Day 4: Quick actions
- Day 5: Performance optimization
- Day 6-7: Final testing

---

### Known Scope Boundaries

#### Explicitly NOT in v0.3.x

**Features to Resist:**

1. User authentication/login
2. Multi-user support
3. Real notifications (just structure)
4. XP/gamification
5. External calendar sync
6. AI features
7. Mobile app
8. Task time predictions
9. Obsidian real export (stays dry-run)
10. Email integration

**Technical Debt Accepted:**

1. Single user hardcoded
2. No automated tests (just manual)
3. Basic error handling only
4. Simple logging
5. No caching layer
6. No websockets
7. No service workers

#### Migration & Backwards Compatibility

**Data Preservation:**

- All existing events keep IDs
- Task priorities remain 0-5
- Timestamps stay UTC
- No schema breaking changes

**API Compatibility:**

- Endpoints keep same signatures
- New parameters are optional
- Error formats unchanged
- Response structures stable

---

### Success Metrics

#### v0.3.x is COMPLETE when:

**Functional Requirements:** ✅ All drag operations work smoothly ✅ Can create events at any time (10:50, 22:00-06:00) ✅ Month view scrolls continuously ✅ Telegram bot responds correctly to all commands ✅ Touch devices can create events ✅ SSL certificate active and auto-renewing

**Quality Requirements:** ✅ Zero console errors in normal use ✅ Denis uses for 48 hours without rage ✅ All promises resolve/reject properly ✅ Every user action has feedback ✅ Errors show helpful messages

**Documentation Requirements:** ✅ Each module has README_MODULE.md ✅ Main README updated with v0.3.x changes ✅ Keyboard shortcuts documented ✅ API endpoints documented ✅ Deployment steps documented

**Performance Requirements:** ✅ Week view loads in <2 seconds ✅ Event creation in <1 second ✅ Smooth dragging (>20fps) ✅ Bot responds in <3 seconds ✅ No memory leaks after 24 hours

---

### Handoff to Next Phase

#### What v0.4.x Can Assume

After v0.3.x completion:

1. All UI interactions work reliably
2. Telegram bot has solid foundation
3. SSL and monitoring active
4. Documentation exists for all modules
5. Color system implemented
6. Touch support working
7. Recurring events tested

#### Technical Debt for v0.4.x

To be addressed later:

1. No test coverage
2. Single user assumption
3. Basic error handling
4. No caching
5. No real-time updates
6. Simple state management
7. No offline support

#### Data Collected for v0.4.x

During v0.3.x usage, track:

- Common event durations
- Peak usage times
- Most used features
- Error frequency
- Performance bottlenecks
- Task completion patterns
- Reflection compliance

This data will inform v0.4.x priorities and help design the notification system.

---

### Emergency Procedures

#### If Something Breaks Production

1. **Immediate:** Revert to last working commit
2. **Notify:** Message in Telegram about issue
3. **Debug:** Check logs for errors
4. **Fix:** Create hotfix branch
5. **Test:** Verify fix locally
6. **Deploy:** Push fix to production
7. **Monitor:** Watch for 24 hours

#### Rollback Procedure

```bash
# Find last working commit
git log --oneline

# Revert to it
git revert HEAD
git push

# Or hard reset if needed
git reset --hard <commit-hash>
git push --force
```

#### Common Issues & Solutions

**Database locked:**

- Restart PostgreSQL
- Check connection pool

**Bot not responding:**

- Check webhook URL
- Verify token valid
- Restart bot service

**SSL expired:**

- Run certbot renew
- Restart nginx

**Out of memory:**

- Check for memory leaks
- Restart services
- Increase swap

---

### Final Notes

Version 0.3.x is about **reliability over features**. Every decision should prioritize "does it work every time" over "could we add this cool thing." This is the foundation that all future versions build upon. A broken foundation means everything above it eventually crumbles.

The hardest part will be resisting scope creep. When fixing the event editor, it's tempting to add "just one more field." Don't. Fix what's broken, document what's fixed, and move on. There's plenty of time for enhancements in v0.4.x and beyond.

Remember: The goal is 48 hours of rage-free usage. Not perfect, not beautiful, not feature-complete. Just reliable.

## 6) NeuroBoost v0.4.x Task Management Revolution 

**Version Range:** v0.4.1 → v0.4.3  
**Timeline:** 4-5 weeks total  
**Theme:** "Tasks That Actually Work With Your Life"  
**Principle:** Transform task management from a burden into a intelligent assistant

---

### Version 0.4.x Mission Statement

Version 0.4.x revolutionizes how NeuroBoost handles tasks. Currently, tasks are just items in a list with priorities. By v0.4.3, tasks will understand context, time windows, dependencies, routines, and emotional weight. The system will actively help schedule tasks based on your patterns, energy levels, and available time slots.

By the end of v0.4.x:

- Tasks know where they can be done (@home, @computer, @phone)
- Recurring home care routines work seamlessly
- Task dependencies and trees visualize project structure
- Smart scheduling suggests what to do when
- Emotional barriers are recognized and addressed
- Calendar contexts allow filtering by life area

---

### Current Task System Problems (v0.3.x → v0.4.1)

#### Fundamental Issues

1. **No Context Awareness**
    
    - Can't batch "phone calls" together
    - Can't hide "home tasks" when at office
    - No understanding of location requirements
2. **No Time Windows**
    
    - Tasks are either "anytime" or "specific deadline"
    - Can't express "morning routine" or "evening tasks"
    - No concept of "best done between X and Y"
3. **No Dependencies**
    
    - Can't link "presentation" to "gather data" task
    - No visualization of project structure
    - Can't see what's blocking what
4. **No Routines**
    
    - 17 daily tasks need individual creation
    - No templates for recurring patterns
    - Can't activate "home alone mode"
5. **No Emotional Intelligence**
    
    - 2-month old video project creates guilt
    - No recognition of procrastination patterns
    - No strategies for difficult tasks
6. **No Smart Scheduling**
    
    - System doesn't suggest when to do tasks
    - No consideration of energy levels
    - No optimization of context switches

---

### Version 0.4.1: Task Context & Intelligence

**Timeline:** 10-12 days  
**Theme:** "Tasks That Know Where They Belong"  
**Success Criteria:** Context-aware task system with time windows

#### Feature 1: Task Contexts (Day 1-2)

**Implementation Requirements:**

1. **Predefined Contexts:**
    
    ```
    @home - Tasks requiring home presence
    @office - Office/coworking tasks  
    @computer - Need computer access
    @phone - Can be done with just phone
    @errands - Out and about tasks
    @anywhere - No location requirement
    @energy-high - Requires focus/creativity
    @energy-low - Routine/simple tasks
    ```
    
2. **Custom Contexts:**
    
    - User can add custom contexts
    - Format: @custom-name
    - Assign color and icon
    - Set availability hours
3. **Context Filtering:**
    
    - Filter task list by current context
    - Hide irrelevant tasks
    - Quick context switcher in header

**Database Changes:**

```sql
ALTER TABLE Task ADD COLUMN contexts TEXT[]; -- Array of contexts
ALTER TABLE Task ADD COLUMN custom_contexts JSONB; -- User-defined

CREATE TABLE Context (
  id UUID PRIMARY KEY,
  user_id UUID,
  name VARCHAR(50),
  color VARCHAR(7),
  icon VARCHAR(50),
  availability_hours JSONB, -- {monday: {start: "09:00", end: "17:00"}}
  is_system BOOLEAN DEFAULT false
);
```

**UI Changes:**

- Context tags on each task
- Context filter dropdown
- Context batch view
- Current context indicator

#### Feature 2: Task Time Windows (Day 3-4)

**Implementation Requirements:**

1. **Window Types:**
    
    ```
    Specific: Sept 10, 14:00-15:00
    Daily: Every day 08:00-10:00
    Weekly: Every Monday 10:00-12:00
    Flexible: Any weekday morning
    Conditional: Every 3 days when home
    ```
    
2. **Window Properties:**
    
    - Earliest start time
    - Latest end time
    - Ideal time (AI suggestion)
    - Duration estimate
    - Buffer time needed
3. **Scheduling Logic:**
    
    - Find valid slots within windows
    - Respect context availability
    - Avoid conflicts
    - Optimize for batching

**Database Changes:**

```sql
ALTER TABLE Task ADD COLUMN time_window_type VARCHAR(20);
ALTER TABLE Task ADD COLUMN earliest_time TIME;
ALTER TABLE Task ADD COLUMN latest_time TIME;
ALTER TABLE Task ADD COLUMN ideal_time TIME;
ALTER TABLE Task ADD COLUMN window_days VARCHAR(7); -- 'MTWTFSS'
ALTER TABLE Task ADD COLUMN window_frequency INTEGER; -- every N days
ALTER TABLE Task ADD COLUMN last_scheduled DATE;
```

#### Feature 3: Calendar Contexts/Layers (Day 5-6)

**Concept:** Like Google Calendar's multiple calendars

**Implementation:**

1. **Calendar Layers:**
    
    ```
    Work - Blue (work events/tasks)
    Personal - Green (personal time)
    Home Care - Yellow (routines)
    Health - Red (exercise, medical)
    Education - Purple (classes, study)
    Social - Pink (friends, family)
    ```
    
2. **Layer Features:**
    
    - Toggle visibility
    - Bulk operations
    - Import/export per layer
    - Different reminder defaults
    - Share individual layers (future)
3. **Visual Design:**
    
    - Color coding throughout
    - Opacity for hidden layers
    - Quick toggle sidebar
    - Legend with counts

**Database Changes:**

```sql
CREATE TABLE CalendarLayer (
  id UUID PRIMARY KEY,
  user_id UUID,
  name VARCHAR(100),
  color VARCHAR(7),
  is_visible BOOLEAN DEFAULT true,
  reminder_defaults JSONB,
  created_at TIMESTAMP
);

ALTER TABLE Event ADD COLUMN layer_id UUID;
ALTER TABLE Task ADD COLUMN layer_id UUID;
```

#### Feature 4: Task Dependencies & Trees (Day 7-8)

**Implementation Requirements:**

1. **Dependency Types:**
    
    ```
    Blocks: Can't start until predecessor done
    Informs: Should check predecessor
    Related: Grouped but independent
    Parent: Subtask relationship
    ```
    
2. **Tree Visualization:**
    
    - Collapsible tree view
    - Drag to reorder
    - Progress rollup
    - Critical path highlighting
3. **Project Structure:**
    
    ```
    Alumni Video Project
    ├── Watch raw footage (30 min)
    ├── Create rough cut (1 hour)
    │   ├── Select best moments
    │   └── Basic timeline
    ├── Add music (30 min)
    ├── Color grade (1 hour)
    └── Export and upload (30 min)
    ```
    

**Database Changes:**

```sql
ALTER TABLE Task ADD COLUMN parent_task_id UUID;
ALTER TABLE Task ADD COLUMN dependency_type VARCHAR(20);
ALTER TABLE Task ADD COLUMN dependencies UUID[]; -- Array of blocking tasks
ALTER TABLE Task ADD COLUMN progress_percentage INTEGER DEFAULT 0;
ALTER TABLE Task ADD COLUMN is_milestone BOOLEAN DEFAULT false;
```

#### Feature 5: Smart Scheduling Assistant (Day 9-10)

**Core Algorithm:**

1. **Factors Considered:**
    
    - Task priority (0-5)
    - Time windows
    - Context availability
    - Energy requirements
    - Dependencies
    - Deadlines approaching
    - Historical completion patterns
2. **Scheduling Suggestions:**
    
    ```
    "Based on your free time and energy patterns:
    
    Morning (High Energy):
    - Alumni video editing (2 hours)
    - Call about locks (5 min break)
    
    Afternoon (Medium Energy):  
    - Update social cards (30 min)
    - GitHub education (45 min)
    
    Evening (Low Energy):
    - Home care routine (2 hours)
    ```
    
3. **Smart Features:**
    
    - Batch similar contexts
    - Respect energy patterns
    - Include break time
    - Warn about conflicts
    - Learn from feedback

**Implementation:**

```javascript
// Scheduling algorithm pseudocode
function suggestSchedule(date, availableSlots, tasks) {
  // Group by context
  const contextGroups = groupBy(tasks, 'context');
  
  // Sort by priority and deadline
  const prioritized = sortByUrgency(tasks);
  
  // Match to energy levels
  const schedule = matchToEnergyPattern(
    availableSlots,
    prioritized,
    userEnergyProfile
  );
  
  return optimizeContextSwitches(schedule);
}
```

#### Feature 6: Task Aging & Escalation (Day 11-12)

**Implementation:**

1. **Age Tracking:**
    
    - Days since creation
    - Days past deadline
    - Postponement count
    - Last interaction date
2. **Visual Indicators:**
    
    ```
    Fresh (0-3 days): Normal
    Aging (4-7 days): Yellow badge
    Old (8-30 days): Orange badge
    Ancient (30+ days): Red badge + guilt indicator
    ```
    
3. **Escalation Rules:**
    
    - Auto-increase priority after X days
    - Add to daily reminders
    - Suggest breaking into subtasks
    - Prompt for help/delegation

**Database Changes:**

```sql
ALTER TABLE Task ADD COLUMN created_date DATE;
ALTER TABLE Task ADD COLUMN postpone_count INTEGER DEFAULT 0;
ALTER TABLE Task ADD COLUMN last_interaction DATE;
ALTER TABLE Task ADD COLUMN guilt_score INTEGER; -- 0-10
ALTER TABLE Task ADD COLUMN escalation_triggered BOOLEAN DEFAULT false;
```

---

### Version 0.4.2: Routines & Patterns

**Timeline:** 7-8 days  
**Theme:** "Recurring Patterns Made Simple"  
**Success Criteria:** Routine templates working, pattern recognition active

#### Feature 1: Routine Templates (Day 1-3)

**Implementation Requirements:**

1. **Routine Structure:**
    
    ```yaml
    Morning Routine (Home Alone):
      trigger: manual | time | condition
      duration: 2 hours
      tasks:
        - Walk dogs (15 min)
        - Feed dogs (5 min, depends_on: walk)
        - Feed cats (10 min, depends_on: dogs_secured)
        - Check birds (10 min)
        - Water plants (if: no_rain_3_days)
    ```
    
2. **Routine Types:**
    
    - Daily (morning, evening)
    - Conditional (home alone)
    - Weekly (sunday planning)
    - Project (video editing flow)
3. **Activation Options:**
    
    - One-click activation
    - Auto-activate on schedule
    - Activate via bot
    - Skip individual tasks

**Database Schema:**

```sql
CREATE TABLE Routine (
  id UUID PRIMARY KEY,
  user_id UUID,
  name VARCHAR(255),
  description TEXT,
  trigger_type VARCHAR(20), -- manual|time|condition
  trigger_config JSONB,
  estimated_duration INTEGER,
  tasks JSONB, -- Array of task templates
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE RoutineInstance (
  id UUID PRIMARY KEY,
  routine_id UUID,
  activated_at TIMESTAMP,
  completed_at TIMESTAMP,
  tasks_completed JSONB,
  tasks_skipped JSONB,
  actual_duration INTEGER
);
```

#### Feature 2: Conditional Tasks (Day 4-5)

**Condition Types:**

1. **Time-based:**
    
    - If morning: do X
    - If weekend: do Y
    - If last_done > 3 days: do Z
2. **Environment-based:**
    
    - If no_rain_3_days: water garden
    - If parents_away: pet routine
    - If at_home: home tasks
3. **State-based:**
    
    - If energy_high: creative work
    - If stressed: simple tasks
    - If behind_schedule: priorities only

**Implementation:**

```javascript
const conditions = {
  no_rain_3_days: () => daysSinceRain() > 3,
  parents_away: () => checkCalendar('parents_vacation'),
  energy_high: () => lastMoodRating() >= 7,
  morning: () => currentHour() < 12
};
```

#### Feature 3: Pattern Recognition (Day 6-7)

**Track and Learn:**

1. **Completion Patterns:**
    
    - Best time for task types
    - Average duration by context
    - Success rate by time of day
    - Energy levels post-completion
2. **Procrastination Patterns:**
    
    - Tasks frequently postponed
    - Common excuses/reasons
    - Emotional difficulty correlation
    - Success strategies
3. **Suggestions Based on Patterns:**
    
    ```
    "You complete 80% of phone calls before noon"
    "Video editing takes 50% longer in evenings"
    "You skip gym 70% on Mondays - try Tuesday?"
    ```
    

**Database Tracking:**

```sql
CREATE TABLE TaskPattern (
  id UUID PRIMARY KEY,
  user_id UUID,
  task_type VARCHAR(100),
  context VARCHAR(50),
  best_time TIME,
  average_duration INTEGER,
  completion_rate DECIMAL,
  energy_before INTEGER,
  energy_after INTEGER,
  mood_impact INTEGER
);
```

#### Feature 4: Routine Analytics (Day 8)

**Dashboard Showing:**

1. **Routine Performance:**
    
    - Completion rate per routine
    - Average time vs estimated
    - Most skipped tasks
    - Best performing days
2. **Insights:**
    
    - "Morning routine 90% successful when started before 8 AM"
    - "Pet care takes 30% longer on weekends"
    - "You skip plant watering 40% of the time"
3. **Recommendations:**
    
    - Adjust routine timing
    - Break up long routines
    - Remove frequently skipped tasks
    - Add buffer time

---

### Version 0.4.3: Polish & Bug Fixes

**Timeline:** 3-4 days  
**Theme:** "Making It Smooth"  
**Success Criteria:** All v0.4.x features working seamlessly

#### Priority 1: Performance Optimization (Day 1)

**Issues to Fix:**

- Task tree rendering with 100+ tasks
- Context switching lag
- Routine activation delay
- Smart scheduling computation time

**Optimizations:**

- Virtual scrolling for long task lists
- Memoize context filters
- Background scheduling computation
- Incremental tree updates

#### Priority 2: UI Polish (Day 2)

**Improvements:**

- Smooth animations for tree collapse
- Drag tasks between contexts
- Better mobile routine view
- Context color consistency
- Quick-add task with context

#### Priority 3: Bot Integration (Day 3)

**Add Commands:**

- `/contexts` - Show/switch contexts
- `/routine [name]` - Activate routine
- `/pending` - Show aging tasks
- View tasks by context
- Quick routine completion

#### Priority 4: Testing & Fixes (Day 4)

**Test Scenarios:**

1. Create 50-task project tree
2. Run week of routines
3. Test all conditional triggers
4. Verify scheduling suggestions
5. Test context switching
6. Mobile routine management

---

### Migration from v0.3.x

#### Data Migration Requirements

1. **Existing Tasks:**
    
    - Add default context @anywhere
    - Set time windows to full day
    - No dependencies initially
    - Keep all priorities
2. **Existing Events:**
    
    - Assign to Personal layer
    - Keep all properties
    - No migration needed
3. **User Settings:**
    
    - Create default contexts
    - Set up default layers
    - Initialize energy patterns

#### Migration Script

```sql
-- Add contexts to existing tasks
UPDATE Task SET contexts = ARRAY['@anywhere'] WHERE contexts IS NULL;

-- Create default calendar layers
INSERT INTO CalendarLayer (user_id, name, color) VALUES
  (current_user, 'Personal', '#10B981'),
  (current_user, 'Work', '#3B82F6'),
  (current_user, 'Home Care', '#F59E0B');

-- Initialize task patterns from historical data
INSERT INTO TaskPattern (task_type, best_time, average_duration)
SELECT 
  title as task_type,
  EXTRACT(hour from created_at)::time as best_time,
  60 as average_duration
FROM Task WHERE status = 'DONE';
```

---

### UI/UX Design Updates

#### New Views

1. **Task Tree View** (`/tasks`)
    
    - Hierarchical task display
    - Drag to reorganize
    - Progress indicators
    - Bulk operations
2. **Context Dashboard** (`/contexts`)
    
    - Cards for each context
    - Task count per context
    - Quick filter buttons
    - Time availability
3. **Routines Manager** (`/routines`)
    
    - Routine templates
    - Activation buttons
    - Performance stats
    - Edit/create interface
4. **Smart Schedule** (`/schedule`)
    
    - AI suggestions
    - Drag to accept/modify
    - Alternative options
    - Feedback buttons

#### Updated Components

1. **Task Card:**
    
    ```
    [Context badges] [@home @phone]
    Task Title
    ⏰ 9:00-10:00 | 📅 Sept 10 | 🔄 Every 3 days
    Dependencies: 2 blocked | Progress: 60%
    Age: 5 days | Guilt: Medium
    ```
    
2. **Calendar Event:**
    
    - Layer color coding
    - Context indicator
    - Routine membership badge
    - Dependency arrows

---

### API Endpoints (New/Updated)

#### Contexts

```
GET /api/contexts - List all contexts
POST /api/contexts - Create custom context
GET /api/tasks?context=@home - Filter by context
PATCH /api/contexts/:id/current - Set current context
```

#### Time Windows

```
POST /api/tasks/:id/schedule-window - Set time window
GET /api/tasks/available-slots?date=2024-09-10 - Get valid slots
POST /api/tasks/:id/auto-schedule - Smart schedule
```

#### Routines

```
GET /api/routines - List routines
POST /api/routines - Create routine
POST /api/routines/:id/activate - Activate routine
GET /api/routines/:id/stats - Get performance stats
```

#### Dependencies

```
POST /api/tasks/:id/dependencies - Add dependency
DELETE /api/tasks/:id/dependencies/:depId - Remove
GET /api/tasks/:id/tree - Get full tree
GET /api/tasks/:id/critical-path - Get blocking path
```

#### Smart Scheduling

```
POST /api/schedule/suggest - Get AI suggestions
POST /api/schedule/optimize - Optimize day
POST /api/schedule/feedback - Train algorithm
```

---

### Testing Protocol for v0.4.x

#### Core Test Scenarios

1. **Context Management:**
    
    - Create custom context @gym
    - Filter tasks by @home
    - Batch phone calls together
    - Switch contexts via bot
2. **Time Windows:**
    
    - Set morning window (8-10 AM)
    - Create "every 3 days" task
    - Test window conflicts
    - Auto-schedule within windows
3. **Routines:**
    
    - Create morning routine
    - Activate with conditions
    - Skip individual tasks
    - Track completion rate
4. **Dependencies:**
    
    - Create 5-level tree
    - Test blocking behavior
    - Verify progress rollup
    - Rearrange tree structure
5. **Smart Scheduling:**
    
    - Get daily suggestions
    - Accept/modify proposals
    - Test context batching
    - Verify energy matching

#### Performance Benchmarks

- Task tree with 100 items: <2s render
- Context switch: <500ms
- Routine activation: <1s
- Smart schedule generation: <3s
- Dependency calculation: <1s

---

### Success Metrics for v0.4.x

#### Quantitative Goals

1. **Task Completion:** 40% → 70% completion rate
2. **Context Switching:** Reduce by 50%
3. **Routine Adherence:** >80% completion
4. **Scheduling Accuracy:** 60% suggestions accepted
5. **Task Age:** Average age <7 days

#### Qualitative Goals

1. **Reduced Anxiety:** Routines feel manageable
2. **Better Focus:** Context batching works
3. **Clear Priorities:** Dependencies visible
4. **Smart Assistance:** Suggestions helpful
5. **Emotional Support:** Guilt addressed

---

### Risk Mitigation

#### Complexity Risks

- **Too Many Features:** Focus on core first
- **Confusing UI:** Progressive disclosure
- **Performance Issues:** Optimize early
- **Migration Problems:** Test thoroughly

#### User Experience Risks

- **Routine Anxiety:** Break into smaller chunks
- **Over-scheduling:** Keep flexibility
- **Alert Fatigue:** Smart notifications only
- **Context Overload:** Start with defaults

---

### Development Guidelines

#### Priorities for v0.4.x

1. **Core Functionality First:** Get basics working
2. **Performance Matters:** Don't ship slow features
3. **Mobile Support:** Test everything on phone
4. **Bot Integration:** Keep bot in sync
5. **Data Integrity:** Never lose user data

#### Code Organization

```
apps/web/
├── components/
│   ├── Tasks/
│   │   ├── TaskTree.tsx
│   │   ├── TaskCard.tsx
│   │   └── ContextFilter.tsx
│   ├── Routines/
│   │   ├── RoutineManager.tsx
│   │   ├── RoutineInstance.tsx
│   │   └── RoutineStats.tsx
│   └── Schedule/
│       ├── SmartScheduler.tsx
│       └── ScheduleSuggestions.tsx
├── stores/
│   ├── taskStore.ts
│   ├── contextStore.ts
│   └── routineStore.ts
```

---

### Handoff to v0.4.4+

After v0.4.3, the system will have:

- Complete task context system
- Working routines and patterns
- Smart scheduling suggestions
- Task dependencies and trees
- Calendar layers for organization

This foundation enables v0.4.4+ to add:

- Telegram notifications (finally!)
- Reflection improvements
- Advanced patterns
- Energy tracking
- Mood correlations

The task system will be sophisticated enough to support intelligent notifications that actually help rather than annoy.

---

### Final Notes for v0.4.x

This version transforms NeuroBoost from a calendar with tasks into an intelligent personal assistant that understands your life patterns. The key is making complexity feel simple - users shouldn't need to think about contexts and dependencies, they should just see smart suggestions that make sense.

Remember Denis's home care routine - 17 tasks totaling 2 hours daily. By the end of v0.4.x, this should be one button: "Activate Home Alone Routine" with smart scheduling of when to do each task based on other commitments.

The emotional aspect is crucial - that alumni video with 69 days of guilt needs recognition and a strategy, not just another reminder. The system should help break through procrastination, not add to anxiety.
    

---

## 7) Telegram Reminder & Auth Flows (MVP)

**Two‑bot strategy**

- **Main bot**: interactive commands, browsing, capture.
    
- **Notify bot**: one‑way reminders; separate process, shared DB.
    

**Reminders & nudges**

- Event reminders: T‑30, T‑10, T‑5; start‑ping; end‑ping with reflection (focus %, goal %, mood 1–10).
    
- Planning nudges: **Daily 21:00** (plan next day), **Weekly Sunday 18:00** (plan upcoming week & reflect on past).
    
- Quiet hours default **22:00–08:00** (per‑user override).
    
- Rate cap **~1 message/minute per user**; **group tasks with identical timestamps** into one message.
    

**Auth**

- `/start` → identify Telegram `userId` → issue one‑time **web token**; open web app with token → set secure session; protect routes.
    
- Limit initial concurrent users to ~5; prepare DB for multi‑user.
    

---

## 8) Data Model (Additions for 0.4.x)

```sql
-- Energy (new)
ALTER TABLE "Task" ADD COLUMN energy INTEGER CHECK (energy BETWEEN 1 AND 5);

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

- Project elevator pitch & MVP pillars
    
- Current stack & domain model
    
- Folder structure (canonical)
    
- Coding standards
    
- “Do NOT change” list (filenames, entry points, interfaces)
    
- Active sprint scope and acceptance criteria
    
- Known issues & TODOs
    

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
- Diffs per file (with no +/- only raw code, either in code blocks or full file replacement without skipping anything)
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

- **No framework/stack swaps** unless explicitly requested
    
- **No folder renames** without an ADR
    
- **Smallest viable change**; patch diffs preferred
    
- **Keep types strict**; add tests for core flows
    
- **Preserve telemetry hooks and IDs**
    

---

## 10) Repository Layout (Canonical for v0.3.x)

> This section replaces the earlier “packages/”‑heavy proposal. It aligns the SoT with the **current archive** and near‑term 0.3.x goals. Modular packages can be introduced later (see “Future optional modularization”).

### 10.1 Observed in repo (commit 6c9aeec)

- `apps/api` (Express + Prisma; `prisma/` lives here)
    
- `apps/web` (React/TS week+month views)
    
- `apps/bot` (Telegraf bot)
    
- `apps/shell` (Windows helper; optional)
    
- `docs/`, `prompts/`, `scripts/`, `private/` (contains backups/SSL), `docker-compose.yml`, `pnpm-workspace.yaml`
    

### 10.2 Canonical layout (practical, v0.3.x)

```
neuroboost/
├─ apps/
│  ├─ api/            # Express + Prisma; REST
│  ├─ web/            # React + TS UI (week/month, drag/move/resize)
│  ├─ bot/            # Telegraf (capture/commands); reminders later via notify bot
│  └─ shell/          # Optional Windows helper (tray/auto‑start)
├─ docs/              # SoT, ADRs, ROADMAP, LIVING_SPEC
├─ prompts/           # control prompts used with LLMs
├─ scripts/
│  ├─ deploy/         # nginx/certbot/compose helpers
│  └─ db/             # backup/restore, seed, migrate wrappers
├─ logs/              # runtime logs (gitignored)
├─ private/           # backups/, ssl/ (gitignored)
├─ .github/           # CI, labeler (optional)
├─ .env.example
├─ docker-compose.yml
├─ README.md
└─ CONTRIBUTING.md
```

**Notes**

- **No `packages/` right now.** Shared packages (`ui/`, `core/`, `config/`) add churn and path changes; postpone to ≥0.5.x when reuse pressure is real.
    
- **Prisma stays under `apps/api/prisma`.** Moving to root increases coupling unless multiple services write the DB.
    
- **`apps/notify`** reserved for 0.4.4+ (separate one‑way notifier). Not present in 0.3.x.
    
- **`private/` & `logs/`** must be **.gitignored**; keep backups/SSL here, not in the repo history.
    

### 10.3 Workspace configuration (pnpm)

```yaml
# pnpm-workspace.yaml (v0.3.x)
packages:
  - 'apps/*'
  # - 'packages/*'   # planned for ≥0.5.x when introducing shared packages
```

### 10.4 Git hygiene (.gitignore highlights)

- `private/**`, `logs/**`, `**/backup_*.sql*`, `**/ssl/**`, `*.local.*`, `*.env`, `**/.DS_Store`
    
- Keep only `*.example` env files tracked.
    

### 10.5 “Do NOT change” list for LLM sessions

- Do **not** introduce `packages/` or move Prisma to root in 0.3.x tasks.
    
- Do **not** rename `apps/*` folders or change entry points.
    
- Keep API routes/DTOs unchanged unless a spec says otherwise.
    

### 10.6 Future optional modularization (≥0.5.x)

If/when duplication justifies it:

```
packages/
  ui/       # shared UI (Headless components)
  core/     # types, validators, scheduling helpers
  config/   # eslint, tsconfig, tailwind presets
```

Migration would be staged with alias fallbacks to avoid breaking LLM deltas.

## 11) README.md (Proposed)

> **Note:** Replace placeholders with actual values during implementation.

### Overview

NeuroBoost is a calendar‑first personal assistant for **time‑blocking, reminders, plan‑vs‑actual, and reflection**, with **Obsidian exports** and a **Telegram bot**. Self‑hostable; Windows shell for startup and notifications.

### Stack

- React + TypeScript + Tailwind (apps/web)
    
- Node/Express + Prisma + PostgreSQL (apps/api)
    
- Telegram bot via Telegraf (apps/bot)
    
- Electron shell (Windows)
    
- Docker Compose + Nginx + Certbot
    

### Prerequisites

- Node 20 LTS, pnpm
    
- Docker & Docker Compose
    
- PostgreSQL 16 (containerized)
    
- Telegram bot token
    
- Domain pointing to VPS (for HTTPS)
    

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

- `/health` endpoints for api/web/bot
    
- Compose healthchecks with exit‑on‑unhealthy policy
    

### Troubleshooting

- Migrations: run `prisma migrate deploy` in API container
    
- Bot not messaging: check token + webhook or polling mode
    
- SSL: run certbot script; confirm A record points to VPS
    

---

## 12) Contribution Guidelines (Solo‑friendly)

- Conventional commits: `feat(web): add event resize handles`
    
- One logical change per PR; keep patches small
    
- Update SoT and ADRs when decisions change
    
- Add/extend tests when touching core flows
    

---

## 13) ADRs (Decisions Log — initial)

1. **Source of Truth:** Central PostgreSQL (server) for multi‑device consistency. Obsidian export is a projection.
    
2. **Desktop Shell:** Electron for Windows; revisit Tauri later if footprint matters.
    
3. **Reminders:** Telegram DMs + desktop notifications; post‑block reflection mandatory prompts can be snoozed.
    
4. **Security (MVP):** HTTPS via Nginx/Certbot; hashed secrets; backups; optional TOTP later; client‑side encryption deferred.
    
5. **Mobile:** Wrap web for Android later; native only if user base justifies.
    

---

## 14) Test Plan (Smoke)

- Create/move/resize events; cross‑day; overlapping guards
    
- Drag task → event (with/without estimate); link back to task
    
- Reminder timings (T‑30/T‑5/start/end); jitter under 10s
    
- Reflection capture; analytics roll‑up; export idempotency
    
- Bot commands navigation and pagination
    

---

## 15) Work Items Backlog (Now → Next)

**Now (0.3.1)**

- **Manual time inputs**: free typing; snap on save; robust HH:MM parsing; cross‑midnight remains timed.
    
- **Cross‑day timed events**: create/edit/resize across midnight; segmented render with continuation markers.
    
- **Month view (vertical)**: smooth infinite scroll; range highlight start→hover; auto‑scroll stops on drop; disable timed multi‑day creation.
    
- **Task reordering**: preserve on‑screen order; append on cross‑bucket; fractional priority kept; keyboard reorder without refresh.
    

**Next (0.3.2–0.3.4)**

- **Telegram reminders** via notify bot; grouping; quiet hours; rate cap.
    
- **HTTPS + healthchecks + protected routes** (Telegram token auth).
    
- Docs/READMEs + seeds + error taxonomy.
    

**Then (0.4.x)**

- Contexts & energy; windows; layers; dependencies; suggestion engine with `S_simple`; aging/escalation; reflection‑aware tweaks.