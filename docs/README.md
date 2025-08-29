# NeuroBoost v0.2.1

Calendar-first personal assistant with Telegram bot integration. **Production-ready** with comprehensive logging and monitoring.

## Current Status: MVP Complete ✅

- ✅ **Enhanced API** - Express + Prisma with priority system, reflections, recurring events
- ✅ **Task System** - Priorities 0-5 (Buffer→Emergency→ASAP→Must today→Deadline soon→If possible)
- ✅ **Telegram Bot** - Inline keyboards, staged flows, quick notes, smart notifications
- ✅ **Web UI** - Enhanced calendar with task sidebar, reflections, plan vs actual tracking
- ✅ **Professional Logging** - Structured JSON logs with performance metrics
- ✅ **Database Schema** - Full Prisma setup with recurring events, reminders, sessions

## Stack

* **Backend:** Node 20 + Express + Prisma 6 + PostgreSQL 16
* **Frontend:** React 18 + TypeScript + Vite + Tailwind
* **Bot:** Telegraf 4 with inline keyboards
* **Database:** PostgreSQL with UTC timestamps, Moscow timezone UI
* **Logging:** Structured JSON logs with automatic rotation
* **Package Manager:** pnpm 10.14.x

## Quick Start

### Prerequisites
- Node 20.15+
- pnpm 10.14.x
- PostgreSQL 16 (port 5433)
- Telegram Bot Token

### Installation

```bash
# Install dependencies
pnpm install

# Setup database
cd apps/api
pnpm prisma migrate dev --name init
pnpm prisma generate
```

### Development

```bash
# Terminal 1: API Server
cd apps/api
pnpm dev
# Logs: logs/api.log

# Terminal 2: Telegram Bot  
cd apps/bot
# Edit .env with your TELEGRAM_BOT_TOKEN
pnpm dev
# Logs: logs/bot.log

# Terminal 3: Web UI (optional)
cd apps/web
pnpm dev
# http://localhost:5173

# Terminal 4: View Logs
.\view-logs.ps1 all -Watch
```

## Logging System

Professional logging with performance metrics:

```bash
# View recent logs (PowerShell)
.\view-logs.ps1 all          # All services, last 50 lines
.\view-logs.ps1 api 100      # API logs, last 100 lines  
.\view-logs.ps1 bot -Watch   # Follow bot logs in real-time
.\view-logs.ps1 all -Errors  # Error logs only

# Alternative (Node.js)
node view-logs.mjs api 50    # API logs, last 50 lines
```

**Log Files:**
- `logs/api.log` - API requests, database queries, performance metrics
- `logs/bot.log` - User interactions, API calls, session management  
- `logs/api.error.log` - API errors only
- `logs/bot.error.log` - Bot errors only

## API Endpoints

**Base URL:** `http://localhost:3001`

### Core Endpoints
- `GET /health` - Health check with database status
- `GET /events?start=ISO&end=ISO` - Get events (with recurring expansion)
- `POST /events` - Create event with reminders
- `PATCH /events/:id` - Update event
- `DELETE /events/:id` - Delete event

### Task Management  
- `GET /tasks?status=TODO&priority=2` - Get tasks with filters
- `POST /tasks` - Create task with priority 0-5
- `PATCH /tasks/:id` - Update task (including status changes)
- `DELETE /tasks/:id` - Delete task

### Plan vs Actual
- `POST /events/:id/reflection` - Save reflection (focus%, goal%, mood 1-10)
- `GET /stats/week?start=YYYY-MM-DD` - Weekly adherence statistics

### Quick Notes & Export
- `POST /notes/quick` - Save quick note with auto-tagging
- `GET /export/dry-run` - Preview Obsidian export (safe, no writes)

## Telegram Bot

**Bot Commands:** Inline keyboards only (no slash commands)

**Main Menu:**
- 📝 Quick Note - Instant capture with #quick tagging
- 📋 New Task - Priority-based task creation (0-5 system)  
- 📅 New Event - Smart 1-hour events
- 📅 Plan Today - Today's events + urgent tasks
- 📊 Stats - Weekly adherence tracking

**Features:**
- **Staged Creation Flows** - Progressive disclosure
- **Session Management** - Context preserved between messages
- **Smart Auto-Detection** - Recognizes quick notes automatically
- **Priority System Integration** - Full 0-5 priority support
- **Performance Tracking** - All interactions logged

## Priority System

| Priority | Name | Color | Use Case |
|----------|------|-------|----------|
| 0 | Buffer | Blue | Fill time when available |
| 1 | Emergency | Red | Override everything |
| 2 | ASAP | Orange | Urgent and important |
| 3 | Must today | Yellow | Default priority |
| 4 | Deadline soon | Green | Important but can wait |
| 5 | If possible | Gray | Nice to have |

## Database Schema

**Key Models:**
- `Task` - Priority 0-5, subtasks, tags, estimated minutes
- `Event` - UTC timestamps, RRULE recurring, multi-day support
- `Reminder` - Duration-aware defaults, multiple channels  
- `Reflection` - Plan vs actual tracking (focus%, goal%, mood)
- `TelegramSession` - Staged conversation flows
- `UserSettings` - Timezone, working hours, reminder preferences

## Performance Metrics (from logs)

**Typical Response Times:**
- Event fetch: 15-36ms
- Event creation: 25-96ms  
- Task creation: 28-44ms
- Database queries: 13-156ms
- Bot interactions: <100ms

## File Structure

```
neuroboost-v0.2.1/
├── apps/
│   ├── api/              # Express + Prisma server
│   │   ├── src/
│   │   │   ├── server.mjs    # Enhanced API with logging
│   │   │   └── logger.mjs    # Structured JSON logger
│   │   └── prisma/schema.prisma
│   ├── bot/              # Telegram bot  
│   │   └── src/
│   │       ├── index.mjs     # Bot with inline keyboards
│   │       ├── keyboards.mjs # Keyboard layouts
│   │       ├── session.mjs   # Session management
│   │       └── logger.mjs    # Bot logging
│   └── web/              # React web UI
├── logs/                 # Structured JSON logs
├── view-logs.ps1        # PowerShell log viewer
└── view-logs.mjs        # Node.js log viewer
```

## Environment Variables

**API (.env):**
```env
DATABASE_URL=postgresql://user:pass@localhost:5433/neuroboost
LOG_LEVEL=info
NB_ROUTE_PRIMARY=telegram-stub
```

**Bot (.env):**
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
API_BASE=http://localhost:3001
LOG_LEVEL=info
TZ=Europe/Moscow
```

## Next Phase: Production Deployment

Ready for VPS deployment with:
- Docker containerization
- SSL certificates (Let's Encrypt)
- Nginx reverse proxy
- Auto-restart systemd services
- Log monitoring and alerts

## Monitoring

**Health Checks:**
- API: `http://localhost:3001/health`
- Bot: `http://localhost:3002/health`

**Log Monitoring:**
- Performance metrics tracked
- Error logs separated
- Automatic log rotation (10MB limit)
- Structured JSON for easy parsing

---

## Version History

- **v0.1.1** - Basic calendar with drag-create, Obsidian dry-run export
- **v0.2.1** - Full Telegram bot, enhanced API, professional logging, plan vs actual tracking

**Architecture:** Server-first for cross-device sync, privacy-focused, no external telemetry.