# NeuroBoost

> A calendar-first personal assistant for neurodivergent users. Time-blocking, task management, and gentle accountability through reflections.

[![Version](https://img.shields.io/badge/version-0.3.3-blue.svg)](https://github.com/zemdenalex/neuroboost)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)]()

## 🧠 Philosophy

**"The organizer for non-organizers"**

NeuroBoost is designed for people with ADHD, autism, and chronic disorganization. Instead of fighting against your brain, it works with it:

- **Calendar-first**: Visual time-blocking as the primary interface
- **Low friction**: Drag-and-drop everything, quick captures via Telegram
- **Non-judgmental**: Track reality vs. plan without guilt
- **Flexible**: Adapts to how you actually work, not how you "should" work
- **Privacy-first**: Self-hosted, no telemetry, your data stays yours

## ✨ Features

### Current (v0.3.3)

**📅 Calendar**
- Week and month views with drag-and-drop
- Create events by dragging
- Move and resize events (15-minute snap grid)
- Multi-day and cross-midnight event support
- All-day events section
- Current time indicator

**✅ Task Management**
- 6 priority levels (Buffer → Emergency)
- Drag tasks to calendar to schedule
- Fractional priorities for fine ordering
- Bulk operations
- Tag system

**🤖 Telegram Bot**
- Quick task/note capture
- View calendar and tasks
- Stats and adherence tracking
- Persistent reply keyboard
- Session-based wizards

**📊 Reflections & Stats**
- Post-event reflection (focus %, goal %, mood)
- Weekly adherence metrics
- Task completion tracking
- Priority breakdown visualization

**🌐 Multi-Page Web App**
- Home - Philosophy and introduction
- Calendar - Main time-blocking interface
- Tasks - Kanban board
- Time Planning - 168-hour week allocation
- Reflections - Review what was done
- Goals - Long-term tracking
- Profile - Stats and visualizations
- Settings - Preferences and configuration
- Gamification - Progress tracking (mocked)

### Coming Soon (v0.3.4+)

- 🐛 Feedback system with GitHub integration
- 🔒 HTTPS and authentication
- 📢 Reminder notifications
- 📈 Planning page with goal→project→task hierarchy
- 🤖 Smart task scheduling
- 🏠 Context-aware tasks (@home, @office)
- ⚡ Energy-based scheduling
- 🔄 Routines and templates

## 🚀 Quick Start

### Prerequisites

- Node.js 20 LTS
- pnpm 10.14+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Telegram Bot Token (from @BotFather)

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/zemdenalex/neuroboost.git
cd neuroboost

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your values:
# - DATABASE_URL
# - TELEGRAM_BOT_TOKEN

# 4. Start database
docker compose up -d db

# 5. Run migrations
pnpm --filter @nb/api prisma migrate dev

# 6. Seed demo data (optional)
pnpm --filter @nb/api seed

# 7. Start services (in separate terminals)
pnpm --filter @nb/api dev   # Backend API (port 3001)
pnpm --filter @nb/web dev   # Frontend (port 5173)
pnpm --filter @nb/bot dev   # Telegram bot
```

Access the web app at http://localhost:5173

### Quick Commands

```bash
# Database management
pnpm db:up          # Start PostgreSQL
pnpm db:down        # Stop PostgreSQL
pnpm db:psql        # Open psql console

# Development
pnpm api:dev        # Start API server
pnpm web:dev        # Start web UI
pnpm bot:stub       # Test bot keyboard

# Prisma
pnpm prisma:generate  # Generate client
pnpm prisma:migrate   # Run migrations
```

## 🚢 Production Deployment

### VPS Setup (Ubuntu 22.04)

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Install Docker Compose
sudo apt update
sudo apt install docker-compose-plugin

# 3. Clone and configure
git clone https://github.com/zemdenalex/neuroboost.git
cd neuroboost
cp .env.production .env
# Edit .env with production values

# 4. Build and deploy
docker compose build
docker compose up -d

# 5. Run migrations
docker compose exec api pnpm prisma migrate deploy

# 6. Check health
curl http://localhost/health
```

### Nginx Configuration

The included `nginx.conf` provides:
- Reverse proxy for API and web
- Static asset caching
- Rate limiting
- Security headers
- Health check endpoint

### SSL/HTTPS Setup (Coming in v0.3.6)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 📁 Project Structure

```
neuroboost/
├── apps/
│   ├── api/            # Express backend + Prisma
│   ├── web/            # React frontend
│   ├── bot/            # Telegram bot
│   └── shell/          # Electron wrapper (optional)
├── docker-compose.yml  # Container orchestration
├── nginx.conf          # Reverse proxy config
└── scripts/
    └── deploy/         # Deployment automation
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/neuroboost

# API
API_PORT=3001
NODE_ENV=production

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_token_here
BOT_PORT=3002

# Frontend (build-time)
VITE_API_URL=http://localhost:3001

# Timezone & Hours
TZ=Europe/Moscow
WORK_HOURS_START=09:00
WORK_HOURS_END=17:00
```

### User Settings

Configure via `/settings` page or API:
- Working hours and days
- Timezone preferences
- Task filtering during work hours
- Header style (horizontal/vertical)

## 🎨 Design System

- **Font**: Monospace throughout (`font-mono`)
- **Colors**: Zinc palette (950 background, 100 text)
- **Interactions**: Drag-and-drop primary
- **Animations**: Minimal (`animate-pulse` only)
- **Mobile**: Responsive 375px+

## 🔌 API Reference

### Core Endpoints

```typescript
// Events
GET    /events?start={iso}&end={iso}
POST   /events
PATCH  /events/:id
DELETE /events/:id

// Tasks  
GET    /tasks
POST   /tasks
PATCH  /tasks/:id
DELETE /tasks/:id
POST   /tasks/:id/schedule
PATCH  /tasks/bulk

// Reflections
POST   /events/:id/reflection

// Stats
GET    /stats/week?start={date}

// Settings
GET    /settings
PATCH  /settings
```

See full API documentation in [docs/API.md](docs/API.md)

## 🤖 Telegram Bot Commands

- `/start` - Show main menu
- `/help` - List commands
- `/tasks` - View tasks by priority
- `/today` - Today's schedule
- `/stats` - Weekly adherence
- `/note` - Quick capture
- `/calendar` - Week view

## 🧪 Testing

```bash
# Unit tests (coming soon)
pnpm test

# E2E tests (planned)
pnpm test:e2e

# Manual testing checklist
- [ ] Create event by dragging
- [ ] Move event to different day
- [ ] Resize event duration
- [ ] Create task via bot
- [ ] Drag task to calendar
- [ ] Complete reflection
```

## 🚧 Known Issues

- Month view scroll performance
- Task reordering doesn't persist
- No touch/mobile drag support
- No HTTPS yet (v0.3.6)
- No authentication (v0.3.7)
- Single user only

## 📝 Version History

- **v0.3.3** (2025-01-06) - Multi-page UI, settings, profile
- **v0.3.2** (2024-12-15) - Backend improvements, bot enhancements
- **v0.3.1** (2024-10-01) - Week grid revamp, time input, task drag
- **v0.3.0** (2024-09-01) - Production deployment, Docker, nginx
- **v0.2.x** (2024-08-21) - Task management, Telegram bot
- **v0.1.x** (2024-08-10) - Initial prototype

See [CHANGELOG.md](CHANGELOG.md) for details.

## 🗺️ Roadmap

### v0.3.x (Current Focus)
- ✅ Multi-page architecture
- ⏳ Feedback/bug reporting system
- ⏳ Bug fixes and polish
- ⏳ HTTPS and security
- ⏳ Authentication
- ⏳ Planning page with goals

### v0.4.x (Task Intelligence)
- Smart scheduling algorithm
- Contexts (@home, @office)
- Energy-based scheduling
- Routines and patterns
- Task dependencies

### v1.0 (Production)
- Multi-user support
- Mobile apps
- Google Calendar sync
- AI suggestions
- Offline support

## 🤝 Contributing

This project is under active development. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Please follow:
- Conventional commits
- One feature per PR
- Update documentation
- Add tests (when available)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built for and by neurodivergent individuals who struggle with traditional productivity tools.

Special thanks to the ADHD and autism communities for inspiration and feedback.

## 📞 Contact

- GitHub: [@zemdenalex](https://github.com/zemdenalex)
- Project: [github.com/zemdenalex/neuroboost](https://github.com/zemdenalex/neuroboost)

---

**Current Status:** Alpha - Daily driver for single user  
**Deploy:** http://193.104.57.79 (HTTP only for now)  
**Bot:** [@your_bot_name_bot](https://t.me/your_bot_name_bot)