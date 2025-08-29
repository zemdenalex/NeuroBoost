# NeuroBoost v0.3.0 - Complete Documentation

A calendar-first personal assistant with focus on time management, task scheduling, and plan vs actual tracking. Built with monospace aesthetics and keyboard-first interactions.

## Table of Contents
- [Core Features](#core-features)
- [Web UI](#web-ui)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Technical Stack](#technical-stack)

## Core Features

### Calendar System
- **Week View** - 7-day grid with hourly slots (MSK timezone display, UTC storage)
- **Month View** - Full month calendar with event previews
- **All-Day Events** - Sticky top lane for all-day and multi-day events
- **Multi-Day Events** - Drag across days to create spanning events
- **Event Recurrence** - RRULE-based recurring events with exceptions
- **Real-time Updates** - Current time indicator updates every 30 seconds

### Task Management
- **Priority System** (0-5 scale):
  - 0: Buffer - Low-priority fill tasks
  - 1: Emergency - Override everything
  - 2: ASAP - Urgent and important
  - 3: Must today - Default priority
  - 4: Deadline soon - Important but can wait
  - 5: If possible - Nice to have
- **Drag-to-Schedule** - Drag tasks from sidebar directly to calendar
- **Task Hierarchy** - Support for subtasks with parent-child relationships
- **Status Tracking** - TODO, IN_PROGRESS, SCHEDULED, DONE, CANCELLED

### Plan vs Actual
- **Reflections** - End-of-event tracking with:
  - Focus percentage (0-100%)
  - Goal achievement (0-100%)
  - Mood rating (1-10)
  - Optional notes
- **Weekly Stats** - Adherence tracking with planned vs completed minutes
- **Performance Badges** - Real-time display of weekly performance

### Notifications & Reminders
- **Duration-Aware Defaults**:
  - ≤30min events: 3 minutes before
  - ~60min events: 5 minutes before
  - ≥4h events: 30 minutes before
- **Multiple Channels** - Telegram, Web, Desktop, Email support
- **Quiet Hours** - Configurable do-not-disturb periods
- **Deduplication** - 2-minute window to prevent duplicate notifications

## Web UI

### Week View Features

#### Event Creation
- **Drag to Create** - Click and drag on empty space to create timed event
- **All-Day Creation** - Drag in the all-day lane at top
- **Multi-Day Creation** - Drag across day columns for spanning events
- **Quick Create** - Button for instant 1-hour event at current time

#### Event Manipulation
- **Move Events** - Drag event body to move within day
- **Cross-Day Move** - Ctrl+Drag to move events between days
- **Resize Events** - Automatic 15-minute snap grid
- **Edit Events** - Double-click or Enter key to open editor
- **Delete Events** - Delete key or button in editor

#### Visual Features
- **Overlap Layout** - Smart stacking for overlapping events
- **Current Time Line** - Red indicator showing "now" with auto-update
- **All-Day Section** - Sticky header showing all-day events
- **Responsive Design** - 1/3/7 day views based on screen size
- **Ghost Previews** - Animated previews during drag operations

### Month View Features

#### Navigation
- **Click Day** - Navigate to week containing that day
- **Double-Click** - Create all-day event for that day
- **Drag Across Days** - Create multi-day spanning events
- **Month Navigation** - Previous/Next month buttons
- **Today Button** - Quick return to current month

#### Display
- **Event Previews** - Up to 4 events per day (2 on mobile)
- **Event Counters** - Show total events when space limited
- **Today Highlight** - Blue circle around current date
- **Weekend Shading** - Visual distinction for weekends
- **Out-of-Month Days** - Grayed out for context

### Task Sidebar

#### Features
- **Always Open by Default** - Sidebar starts open for immediate access
- **Priority Grouping** - Tasks grouped by priority level
- **Drag to Schedule** - Drag any task to calendar to create event
- **Quick Actions**:
  - Toggle completion with checkbox
  - Delete with × button
  - Edit by clicking task
- **Filtering** - Show/hide completed tasks
- **Task Creation** - Inline form with priority selection

### Event Editor

#### Basic Fields
- Title (required)
- Time range display
- All-day toggle
- Reminder settings (0, 1, 3, 5, 10, 30, 60 minutes)

#### Advanced Fields (collapsible)
- Description (multi-line)
- Location
- Tags (comma-separated)
- Color (hex code)
- Recurrence rules

#### Reflection Fields (for existing events)
- Focus percentage slider
- Goal achievement slider
- Mood rating slider
- Reflection notes

#### Actions
- Save/Create button
- Delete button (edit mode only)
- Cancel button
- Escape key or click outside to close

### Header Components

#### Stats Badge
- Planned hours for week
- Completed hours
- Adherence percentage
- Color coding (green >80%, amber >60%, red <60%)

#### Nudge Badge
- Active notification route
- Deduplication window
- Weekly planner schedule

#### DB Badge
- Database connection status
- Real-time health indicator

## API Reference

### Base Configuration
- **URL**: `http://localhost:3001`
- **Format**: JSON
- **Authentication**: None (single-user MVP)
- **Timezone**: UTC storage, MSK display

### Events Endpoints

#### GET /events
Retrieve events within date range, with recurring event expansion.

**Query Parameters:**
- `start` (ISO 8601) - Range start date
- `end` (ISO 8601) - Range end date

**Response:**
```json
[{
  "id": "uuid",
  "title": "Event title",
  "startsAt": "2025-08-29T10:00:00Z",
  "endsAt": "2025-08-29T11:00:00Z",
  "allDay": false,
  "rrule": "FREQ=WEEKLY;COUNT=4",
  "description": "Event description",
  "location": "Location",
  "color": "#3B82F6",
  "tags": ["work", "meeting"],
  "isMultiDay": false,
  "reminders": [{
    "id": "uuid",
    "minutesBefore": 5,
    "channel": "TELEGRAM"
  }],
  "reflections": [{
    "focusPct": 80,
    "goalPct": 90,
    "mood": 8,
    "note": "Productive session"
  }],
  "task": {
    "id": "uuid",
    "title": "Related task"
  }
}]
```

#### POST /events
Create new event with optional reminders.

**Request Body:**
```json
{
  "title": "Meeting",
  "startsAt": "2025-08-29T10:00:00Z",
  "endsAt": "2025-08-29T11:00:00Z",
  "allDay": false,
  "description": "Team sync",
  "location": "Conference room",
  "tags": ["work"],
  "reminders": [{
    "minutesBefore": 5,
    "channel": "TELEGRAM"
  }]
}
```

#### PATCH /events/:id
Update existing event properties.

#### DELETE /events/:id
Remove event and associated data.

### Tasks Endpoints

#### GET /tasks
Retrieve tasks with optional filtering.

**Query Parameters:**
- `status` - Filter by status (TODO, IN_PROGRESS, etc.)
- `priority` - Filter by priority (0-5)

**Response:**
```json
{
  "tasks": [{
    "id": "uuid",
    "title": "Task title",
    "description": "Details",
    "priority": 3,
    "status": "TODO",
    "tags": ["important"],
    "dueDate": "2025-08-30T00:00:00Z",
    "estimatedMinutes": 60,
    "parentId": null,
    "subtasks": [],
    "createdAt": "2025-08-29T10:00:00Z",
    "updatedAt": "2025-08-29T10:00:00Z"
  }]
}
```

#### POST /tasks
Create new task with priority and tags.

#### PATCH /tasks/:id
Update task including status changes.

**Request Body:**
```json
{
  "status": "SCHEDULED",
  "priority": 2
}
```

#### DELETE /tasks/:id
Remove task from system.

### Reflections

#### POST /events/:id/reflection
Save plan vs actual data for an event.

**Request Body:**
```json
{
  "focusPct": 75,
  "goalPct": 80,
  "mood": 7,
  "note": "Some interruptions",
  "wasCompleted": true,
  "wasOnTime": false
}
```

### Statistics

#### GET /stats/week
Get weekly performance metrics.

**Query Parameters:**
- `start` - Week start date

**Response:**
```json
{
  "startOfWeek": "2025-08-26T00:00:00Z",
  "endOfWeek": "2025-09-02T00:00:00Z",
  "plannedMinutes": 2400,
  "completedMinutes": 1800,
  "adherencePct": 75,
  "eventCount": 20,
  "reflectionCount": 15
}
```

### Quick Notes

#### POST /notes/quick
Save quick note with auto-tagging.

**Request Body:**
```json
{
  "body": "Remember to review #project docs",
  "source": "web"
}
```

#### GET /notes/quick
Retrieve recent quick notes.

**Query Parameters:**
- `limit` - Maximum notes to return (default: 20)

### Export

#### GET /export/dry-run
Preview Obsidian vault export (read-only).

**Query Parameters:**
- `vault` - Vault path (optional)

**Response:**
```json
{
  "mode": "dry-run",
  "planned": 42,
  "totalBytes": 15360,
  "files": [{
    "path": "NeuroBoost/tasks/uuid.md",
    "action": "create",
    "bytes": 256
  }]
}
```

### System

#### GET /health
System health check with database status.

#### GET /status/route
Current notification routing configuration.

#### GET /status/nudges
Nudge system status and configuration.

## Database Schema

### Core Tables
- **Task** - Task management with priorities and hierarchy
- **Event** - Calendar events with UTC timestamps
- **EventException** - Recurring event exceptions
- **Reminder** - Event reminders with delivery tracking
- **Reflection** - Plan vs actual tracking
- **QuickNote** - Quick capture notes
- **TelegramSession** - Bot session management
- **UserSettings** - User preferences and configuration
- **ExportRun** - Export history tracking

## Keyboard Shortcuts

### Global
- `Escape` - Close editor/modal
- `Ctrl+Enter` - Save in editor

### Week View
- `←/→` - Previous/Next week
- `+/-` - Nudge selected event ±15 minutes
- `Enter` - Edit selected event
- `Delete` - Delete selected event
- `Drag` - Create event
- `Ctrl+Drag` - Move event across days
- `Double-click` - Edit event

### Month View
- `Click` - Navigate to week
- `Double-click` - Create all-day event
- `Drag` - Create multi-day event

## Technical Stack

### Backend
- Node.js 20 LTS
- Express.js
- Prisma 6.14 ORM
- PostgreSQL 16
- Zod validation

### Frontend
- React 18.3
- TypeScript 5.4
- Vite 5.3
- Tailwind CSS 3.4
- Monospace font family

### Infrastructure
- Docker & Docker Compose
- pnpm 10.14 package manager
- UTC timestamp storage
- MSK (UTC+3) display timezone

## Design Principles

### Monospace Aesthetic
- Font: `font-mono` throughout
- Colors: Zinc palette (black/gray/white)
- Minimal animations with `animate-pulse`
- High contrast borders
- Focus on typography over icons

### Interaction Patterns
- Keyboard-first design
- Drag-and-drop for scheduling
- Double-click for editing
- Single click for selection
- Contextual ghost previews

### Responsive Behavior
- Mobile: 1-day view, simplified UI
- Tablet: 3-day view, reduced features
- Desktop: Full 7-day view, all features

## Current Limitations

- Single-user system (no authentication)
- Export is dry-run only (no actual writes)
- No external calendar sync
- Telegram bot in stub mode
- No client-side encryption
- No mobile app (web responsive only)

---

**Version**: 0.3.0  
**Status**: Production MVP  
**License**: Private  
**Author**: Denis Zemtsov (@zemdenalex)