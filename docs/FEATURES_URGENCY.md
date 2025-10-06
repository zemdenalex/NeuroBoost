# NeuroBoost Features & Urgency Tracking

**Last Updated:** 2025-01-15  
**Current Version:** v0.3.3 (2025-01-06)  
**Next Target:** v0.3.4 (Feedback System)

This document tracks all planned features with priority levels (P0-P3), urgency reasoning, dependencies, and rough effort estimates.

---

## Priority Levels

- **P0** - Critical (blocks usage or deployment)
- **P1** - High (major value, user-facing improvements)
- **P2** - Medium (infrastructure, technical debt, polish)
- **P3** - Low (backlog, future considerations)

---

## P0 Features (v0.3.4 - Critical)

### Feedback & Bug Reporting System

**Urgency:** CRITICAL - Currently no way for users (or Denis) to report bugs/ideas systematically. Everything relies on memory or ad-hoc chat messages. This blocks multi-user testing and slows development.

**Target Version:** v0.3.4 (staged over 3 micro-versions)

**Effort:** 12-15 days total

**Components:**

#### v0.3.4.1: Database + Admin Page (5-6 days)
- **Backend:**
  - New `Feedback` table in Prisma schema
    - Fields: `id`, `userId`, `type` (bug|feature|question), `title`, `description`, `url`, `userAgent`, `screenshot?`, `status` (new|investigating|resolved|wontfix), `priority` (P0-P3), `createdAt`, `resolvedAt?`
  - API endpoints:
    - `POST /feedback` - Submit feedback (public)
    - `GET /feedback` - List all feedback (admin only)
    - `PATCH /feedback/:id` - Update status/priority (admin only)
    - `DELETE /feedback/:id` - Delete feedback (admin only)
- **Frontend:**
  - Floating "Report Bug" button (bottom-right, all pages)
  - Modal form: Type selector, title, description, "Include screenshot" checkbox
  - Auto-capture: Current page URL, user agent, timestamp
  - Admin page at `/admin/feedback` with list, filters, actions
  - Simple password login for admin page (hardcoded for now)
- **Why This First:** Core data structure; enables other methods

#### v0.3.4.2: Dev Bot Notifications (3-4 days)
- **Backend:**
  - New env var: `DEVELOPER_TELEGRAM_IDS` (comma-separated)
  - New endpoint: `POST /feedback/notify-devs` (internal)
  - When feedback submitted → send notification to dev bot
- **Bot:**
  - New bot: `neuroboost_dev_bot` (separate token)
  - Restricted to hardcoded Telegram user IDs
  - Receives notifications: "🐛 New Bug Report: {title} - {url}"
  - Quick actions: "View Details" (shows full feedback), "Mark P0", "Mark Resolved"
- **Integration:**
  - Frontend submits feedback → DB insert → Trigger `/feedback/notify-devs`
- **Why Second:** Enables real-time awareness without polling admin page

#### v0.3.4.3: GitHub Issues API Integration (4-5 days)
- **Backend:**
  - New env vars: `GITHUB_TOKEN`, `GITHUB_REPO` (e.g., "zemdenalex/neuroboost")
  - Endpoint: `POST /feedback/create-github-issue` (internal)
  - Logic:
    - When feedback marked as P0 or "bug" → auto-create GitHub issue
    - Include: Title, description, labels (bug/feature), link to admin page
    - Store `githubIssueNumber` in Feedback table
  - GitHub API wrapper: `createIssue(title, body, labels)`
- **Admin Page:**
  - Show GitHub issue link if exists
  - Button: "Create GitHub Issue" (manual trigger)
  - Auto-attach context files (generate on-the-fly):
    - If bug on `/tasks` → attach `Tasks.tsx`, `pages/` context, `src/` context, etc.
    - Include: Stack trace (if captured), user agent, timestamp
- **Dev Bot:**
  - Notification: "🐛 Bug → GitHub #123" with issue link
- **Why Third:** Requires stable DB + bot; adds automation

**Dependencies:**
- Admin auth (hardcoded password for now)
- Context file structure (from v0.3.4 or can be minimal)

**User Stories:**
1. As Denis, I can quickly report bugs while using the app without leaving the interface
2. As Denis, I receive instant notifications on dev bot when bugs are reported
3. As Denis, I can review all feedback in one place with filtering and prioritization
4. As Denis, critical bugs automatically become GitHub issues for tracking

**Success Criteria:**
- ✅ Feedback form accessible from all pages
- ✅ Submissions stored in database with full context
- ✅ Dev bot sends notifications within 10 seconds
- ✅ Admin page shows all feedback with filters
- ✅ GitHub issues created automatically for P0 bugs
- ✅ Context files attached to GitHub issues

---

## P1 Features (v0.3.5 - High Priority)

### Bug Fixes & Polish

**Urgency:** HIGH - Current bugs frustrate daily usage and block "production-ready" milestone.

**Target Version:** v0.3.5

**Effort:** 10-12 days

**Known Bugs (from previous chats):**

1. **Month View Scroll Stutter** (2 days)
   - Infinite scroll resets position on re-render
   - Auto-scroll doesn't stop immediately on drop
   - Fix: Debounce scroll detection, improve virtual scrolling logic

2. **Task Reordering Reloads** (1 day)
   - Dragging task triggers full sidebar refresh
   - Loses focus and scroll position
   - Fix: Optimistic UI updates, don't reload until API confirms

3. **Cross-Day Event Movement** (2 days)
   - Multi-day timed events (>24h) can't be resized by dragging
   - Can only edit manually in editor
   - Fix: Add resize handles, split rendering logic per day

4. **Manual Time Input Edge Cases** (1 day)
   - Some formats like "1050" work, but "25:00" doesn't show error
   - Fix: Better validation, show error states

5. **Event Drag Ghost Misalignment** (1 day)
   - Ghost preview sometimes offset from cursor
   - Fix: Recalculate ghost position on scroll

6. **Task Drag to Month View** (1 day)
   - Dragging task from sidebar to month view doesn't work
   - Only works in week grid
   - Fix: Add drop zones to month view day cells

7. **Mobile Touch Delays** (2 days)
   - Long-press threshold too long (500ms)
   - No haptic feedback
   - Fix: Reduce to 300ms, add vibration API

**Dependencies:** None (all isolated fixes)

**Success Criteria:**
- ✅ 48-hour continuous usage without rage-inducing bugs
- ✅ All drag operations work smoothly (>20fps)
- ✅ No console errors during normal use
- ✅ Mobile touch interactions feel responsive

---

### Planning Page (Raw Version)

**Urgency:** HIGH - Core feature for long-term goal tracking; user needs this to fix broken Obsidian workflow.

**Target Version:** v0.3.5 (raw), v0.3.9 (complete)

**Effort:** 8-10 days (raw), +15-20 days (complete)

**Raw Version Features (v0.3.5):**

1. **Graph View** (6-7 days)
   - Visual: Force-directed graph (D3.js or react-force-graph)
   - Nodes: Goals (circles), Projects (squares), Tasks (triangles)
   - Edges: Derivation arrows (goal → project → tasks)
   - Interactions: Click to expand, drag to rearrange, hover for details
   - Known issues: Will be buggy, layout may be poor, expect performance issues with >50 nodes
   - MVP: Just show relationships, no editing

2. **Longevity Views** (2-3 days)
   - Tabs: Life / Year / Quarter / Month
   - Display: Simple list of goals/projects per timeframe
   - Filtering: Category-based (career, health, relationships, etc.)
   - MVP: Read-only view, no creation/editing

**Complete Version Features (v0.3.9):**

3. **Project XP System** - All Three Variants
   - **Variant A: Time-Based** (3 days)
     - Each project has target hours (e.g., "Alumni Video: 10 hours")
     - Tasks/events contribute actual time spent
     - Progress bar: "8.5 / 10 hours (85%)"
     - Color: Green (on track), Yellow (behind), Red (stalled)
   
   - **Variant B: Percentage-Based** (2 days)
     - Each project = 100%
     - Tasks assigned % weight (e.g., "Edit video: 40%")
     - Complete task → add % to project
     - Progress bar: "65% complete"
   
   - **Variant C: Gamified XP** (4 days)
     - Each project needs XP to "level up" (e.g., 1000 XP)
     - Tasks give XP: `time_spent × focus% × difficulty`
     - Can over-level (125% = extra effort)
     - Visual: XP bar with level indicator

4. **Graph Improvements** (5-6 days)
   - Add/edit nodes directly in graph
   - Delete edges (unlink tasks from projects)
   - Save layout positions
   - Performance optimization (canvas rendering?)
   - Better collision detection

5. **Longevity Editing** (4-5 days)
   - Create/edit goals per timeframe
   - Drag goals between timeframes
   - Derive projects from goals
   - Auto-create tasks from projects

**Dependencies:**
- Graph view: D3.js or react-force-graph library
- XP system: Extended Task/Project models in backend

**User Stories:**
1. As Denis, I can visualize how my daily tasks connect to long-term goals
2. As Denis, I can track project progress with multiple XP methods
3. As Denis, I can see life/year/quarter/month views like in Obsidian
4. As Denis, I can derive tasks from projects and projects from goals

**Success Criteria (Raw):**
- ✅ Graph renders with goals → projects → tasks
- ✅ Can navigate between life/year/quarter/month views
- ✅ Known bugs documented, not blocking usage

**Success Criteria (Complete):**
- ✅ Graph is interactive and performant (>30fps with 100 nodes)
- ✅ All 3 XP systems functional and switchable
- ✅ Can create/edit/delete across all views
- ✅ Layout persists across sessions

---

## P2 Features (v0.3.6 - Medium Priority)

### Server Hardening

**Urgency:** MEDIUM - Security and reliability improvements for production deployment. Not blocking current single-user usage, but needed before multi-user.

**Target Version:** v0.3.6

**Effort:** 8-10 days

**Components:**

1. **HTTPS Setup** (2-3 days)
   - Install Certbot on VPS
   - Generate Let's Encrypt certificate for domain
   - Update nginx.conf with SSL configuration
   - Set up auto-renewal cron job
   - Redirect HTTP → HTTPS
   - Test SSL Labs rating (aim for A)
   - Update docker-compose.yml ports

2. **Docker Improvements** (2-3 days)
   - Review Dockerfiles (may be outdated)
   - Update base images to latest stable (Node 20 LTS, Postgres 16)
   - Improve layer caching (separate deps from source)
   - Multi-stage builds for smaller images
   - Health check improvements (actual DB queries, not just HTTP)
   - Update docker-compose with resource limits

3. **Deployment Script Updates** (2-3 days)
   - Review deploy.sh (currently 274 lines)
   - Add rollback functionality (`deploy.sh rollback`)
   - Better error handling (exit on failure)
   - Database backup before deployment (currently partial)
   - Verify all services healthy after deploy
   - Add deployment notifications (Telegram bot?)

4. **Backup System** (2 days)
   - Automated daily backups (3 AM MSK)
   - Compress and encrypt backups (gpg?)
   - Store: Local + remote (S3/Backblaze/Hetzner)
   - Retention: Keep 30 days, compress older
   - Monthly restore test (document procedure)
   - Backup script: `scripts/backup.sh`

**Dependencies:**
- Domain name (already have IP: 193.104.57.79)
- DNS setup (A record)
- Certbot installed on VPS

**Success Criteria:**
- ✅ HTTPS working with A rating on SSL Labs
- ✅ Auto-renewal tested (certbot renew --dry-run)
- ✅ Docker builds in <5 minutes
- ✅ Health checks detect failures within 30 seconds
- ✅ Deployment script has rollback functionality
- ✅ Backups automated and tested (restore works)

---

## P3 Features (v0.3.7-0.3.8 - Foundation for v0.4.x)

These are preliminary features that prepare for v0.4.x task intelligence. Order and scope may change.

### v0.3.7: Task Intelligence Foundations

**Urgency:** LOW - Not blocking current usage, but needed for v0.4.x features.

**Target Version:** v0.3.7

**Effort:** 10-12 days

**Components:**

1. **Contexts System** (4-5 days)
   - Database: Add `contexts` array to Task model
   - Predefined contexts: @home, @office, @computer, @phone, @errands, @anywhere
   - Custom contexts: User-defined with icons/colors
   - API: `GET /contexts`, `POST /contexts`, filter tasks by context
   - UI: Context selector in task editor, filter sidebar by context
   - Bot: Context filtering in task lists

2. **Energy Levels** (2-3 days)
   - Database: Add `energy` field to Task model (1-5)
   - UI: Energy selector (⚡×1 to ⚡×5)
   - Filtering: Show only tasks matching current energy
   - Bot: Energy-based task suggestions

3. **Work Hours Integration** (2 days)
   - Already implemented in backend (v0.3.2)
   - Frontend: Use `/tasks/filtered` endpoint
   - Show work hours status indicator
   - Hide/show tasks based on work hours + tags
   - Settings: Configure work hours in UI

4. **Calendar Layers** (3-4 days)
   - Database: Add `layerId` to Event and Task models
   - Predefined layers: Work, Personal, Health, Education, Social, Home Care
   - UI: Layer visibility toggles, color-coded events
   - Filtering: Show/hide layers independently
   - Bot: Layer-based event filtering

**Dependencies:**
- None (all additive)

**Success Criteria:**
- ✅ Can filter tasks by context (show only @home tasks)
- ✅ Can filter tasks by energy level
- ✅ Work hours filtering works in frontend
- ✅ Calendar layers toggle on/off
- ✅ All filters work in bot too

---

### v0.3.8: Advanced Task Features

**Urgency:** LOW - Quality-of-life improvements.

**Target Version:** v0.3.8

**Effort:** 12-15 days

**Components:**

1. **Tags System Improvements** (2-3 days)
   - Database: Already have `tags` array
   - UI: Tag autocomplete, tag cloud, color-coded tags
   - Filtering: Multi-tag AND/OR logic
   - Bot: Tag-based filtering

2. **Task Dependencies** (4-5 days)
   - Database: Add `dependencies` array (Task IDs), `parentTaskId`
   - UI: Dependency selector, visual tree view
   - Logic: Block task if dependencies incomplete
   - Visualization: Dependency graph (simpler than Planning page graph)

3. **Time Windows** (3-4 days)
   - Database: Add `earliestTime`, `latestTime`, `idealTime`, `windowDays`
   - UI: Time window selector ("Morning (6-10 AM)", custom)
   - Smart scheduling: Only suggest tasks within windows
   - Bot: Respect time windows in suggestions

4. **Routines System** (3-4 days)
   - Database: New `Routine` table, `RoutineInstance` for activations
   - Predefined: Morning routine, Evening routine, Home Alone routine
   - Activation: One-click → creates all tasks
   - Tracking: Record completion stats per routine
   - Bot: Routine activation via button

**Dependencies:**
- Contexts (v0.3.7) - for routine context awareness
- Layers (v0.3.7) - for routine layer assignment

**Success Criteria:**
- ✅ Can create task dependencies (A blocks B)
- ✅ Time windows restrict scheduling suggestions
- ✅ Routines activate with one click
- ✅ Routine stats tracked (completion rate)

---

### v0.3.9: Final Polish + Planning Page Complete

**Urgency:** LOW - Final cleanup before v0.4.0.

**Target Version:** v0.3.9 (last before v0.4.0)

**Effort:** 15-20 days

**Components:**

1. **Planning Page Completion** (10-12 days)
   - All XP systems functional (time, %, gamified)
   - Graph editing (add/remove nodes/edges)
   - Longevity editing (create/edit goals)
   - Layout persistence
   - Performance optimization

2. **Frontend Refactor** (5-6 days)
   - Break large files into smaller components
   - Tasks.tsx: 763 lines → <200 lines (delegate to components)
   - WeekGrid.tsx: Extract drag logic to hooks
   - Consistent naming conventions
   - Remove unused code

3. **Bug Bash** (3-4 days)
   - Fix all known minor bugs
   - Test all features end-to-end
   - Mobile testing (touch interactions)
   - Cross-browser testing (Chrome, Firefox, Safari)

**Dependencies:**
- Planning page raw version (v0.3.5)

**Success Criteria:**
- ✅ Planning page fully functional
- ✅ No files >500 lines (except generated)
- ✅ Zero console errors
- ✅ 48-hour test period with no critical bugs

---

## Backlog (v0.4.x+)

These features are deferred until after v0.3.x is complete and stable.

### v0.4.0: Task Intelligence Launch

**Components:**
- Smart scheduling algorithm (energy + context + time windows)
- Task suggestions based on patterns
- Auto-categorization (ML or rules-based)
- Aging/escalation system (guilt tracking)
- Pattern recognition (completion times, success rates)

**Effort:** 20-30 days

---

### v0.4.1-0.4.3: Advanced Features

**Potential Features:**
- Subtask trees with progress rollup
- Critical path calculation for projects
- Pomodoro timer integration
- Focus mode (block distractions)
- Daily planning wizard
- Weekly review system

**Effort:** 30-40 days total

---

### v0.5.x+: Integration & Expansion

**Potential Features:**
- Google Calendar two-way sync
- Obsidian real export (not dry-run)
- Real authentication (Telegram-based)
- Multi-user support
- PWA with offline mode
- Mobile native apps (React Native)
- AI suggestions (GPT-4 integration)

**Effort:** 50+ days

---

## Urgency Reasoning Summary

| Version | Feature | Urgency Reason | Days |
|---------|---------|----------------|------|
| v0.3.4.1 | Feedback DB + Admin | No systematic bug tracking → development bottleneck | 5-6 |
| v0.3.4.2 | Dev Bot | Manual polling inefficient → need real-time alerts | 3-4 |
| v0.3.4.3 | GitHub Issues | Context tracking → faster debugging | 4-5 |
| v0.3.5 | Bug Fixes | Current bugs frustrate usage → blocks "production" | 10-12 |
| v0.3.5 | Planning (Raw) | Broken Obsidian workflow → need replacement | 8-10 |
| v0.3.6 | HTTPS | Security requirement → blocks multi-user | 2-3 |
| v0.3.6 | Backups | Data loss risk → blocks confidence | 2 |
| v0.3.7 | Contexts | Foundation for v0.4.x → enables task intelligence | 4-5 |
| v0.3.8 | Dependencies | Quality-of-life → improves task organization | 4-5 |
| v0.3.9 | Planning (Complete) | Core feature completion → ready for v0.4.0 | 10-12 |

---

## Total Timeline Estimate

**v0.3.4:** 12-15 days (3 weeks)  
**v0.3.5:** 18-22 days (4-5 weeks)  
**v0.3.6:** 8-10 days (2 weeks)  
**v0.3.7:** 10-12 days (2-3 weeks)  
**v0.3.8:** 12-15 days (3 weeks)  
**v0.3.9:** 15-20 days (3-4 weeks)

**Total v0.3.x completion:** ~75-94 days (15-19 weeks, ~4-5 months)

**Assumptions:**
- Solo developer (Denis)
- Heavy AI assistance (LLMs for code generation)
- Part-time work (not full 8-hour days)
- Buffer for debugging, testing, context switching

**Reality Check:**
- Denis worked ~5 days over 3 weeks on v0.3.0→v0.3.3
- At this pace: v0.3.x could take 6-12 months calendar time
- Focus blocks development speed more than raw hours

---

## Feature Request Process

When new features are suggested:

1. **Assess Urgency:**
   - P0 = Blocks usage or deployment
   - P1 = Major value, user-facing
   - P2 = Infrastructure, polish
   - P3 = Nice-to-have, backlog

2. **Estimate Effort:**
   - Small: 1-2 days
   - Medium: 3-5 days
   - Large: 6-10 days
   - Huge: 10+ days

3. **Identify Dependencies:**
   - What must exist first?
   - What could break?

4. **Slot into Roadmap:**
   - Fits current version scope?
   - Push to next version?
   - Add to backlog?

5. **Document Decision:**
   - Add to this file
   - Update SoT
   - Log in DECISIONS_LOG.md

---

**Document Owner:** Denis Zemtsov  
**Review Frequency:** Weekly during active development  
**Next Review:** After v0.3.4 completion
