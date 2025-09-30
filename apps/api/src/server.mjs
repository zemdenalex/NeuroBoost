import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import rrulePkg from 'rrule';
const { RRule } = rrulePkg;
import path from 'node:path';
import fs from 'node:fs/promises';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { createLogger } from './logger.mjs';
import v04xRoutes from './routes/v04x-contexts.mjs';

const logger = createLogger('api');
const prisma = new PrismaClient();
const app = express();

// Middleware for request logging
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.request(req.method, req.url, res.statusCode, duration, {
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length'),
      ip: req.ip
    });
  });
  
  next();
});

app.use(express.json());

// --- CORS Configuration ---
const allow = [/^http:\/\/localhost:51\d{2}$/];
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    cb(null, allow.some(rx => rx.test(origin)));
  }
}));

app.use(v04xRoutes);

logger.info('CORS configured', { allowedOrigins: 'localhost:51xx' });

// --- Zod Validation Schemas ---
const CreateEventSchema = z.object({
  title: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  allDay: z.boolean().default(false),
  description: z.string().optional(),
  location: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).default([]),
  rrule: z.string().optional(),
  tz: z.string().default('Europe/Moscow'),
  sourceTaskId: z.string().optional(),
  reminders: z.array(z.object({
    minutesBefore: z.number(),
    channel: z.enum(['TELEGRAM', 'WEB', 'DESKTOP', 'EMAIL']).default('TELEGRAM'),
    message: z.string().optional()
  })).default([])
});

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.number().int().min(0).max(5).default(3),
  parentId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  dueDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().positive().optional()
});

const CreateReflectionSchema = z.object({
  focusPct: z.number().int().min(0).max(100),
  goalPct: z.number().int().min(0).max(100),
  mood: z.number().int().min(1).max(10),
  note: z.string().optional(),
  actualStartsAt: z.string().datetime().optional(),
  actualEndsAt: z.string().datetime().optional(),
  wasCompleted: z.boolean().default(true),
  wasOnTime: z.boolean().default(true)
});

// --- Health Check ---
app.get('/health', async (req, res) => {
  const timer = logger.startTimer('health_check');
  
  try {
    const dbTimer = logger.startTimer('db_query');
    const now = await prisma.$queryRaw`SELECT now() AT TIME ZONE 'UTC' AS utc_now;`;
    dbTimer.end();
    
    const result = { ok: true, db: 'ok', utc_now: now?.[0]?.utc_now ?? null };
    logger.info('Health check successful', result);
    
    timer.end();
    res.json(result);
  } catch (error) {
    logger.error('Health check failed', { error: error.message }, error);
    timer.end();
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Legacy compatibility endpoint for web app
app.get('/healthz/db', async (req, res) => {
  const timer = logger.startTimer('db_health_check');
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.debug('Database health check successful');
    timer.end();
    res.json({ ok: true });
  } catch (error) {
    logger.error('Database health check failed', { error: error.message }, error);
    timer.end();
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// --- Status Route ---
app.get('/status/route', (req, res) => {
  const primary = process.env.NB_ROUTE_PRIMARY || 'telegram-stub';
  const quiet = process.env.NB_QUIET || '';
  
  const result = {
    ok: true,
    primary,
    dedupeWindowSec: 120,
    quietHours: quiet,
    writesEnabled: false
  };
  
  logger.debug('Route status requested', result);
  res.json(result);
});

// Legacy nudges endpoint for web app
app.get('/status/nudges', (req, res) => {
  const primary = process.env.NB_ROUTE_PRIMARY || 'telegram-stub';
  const quiet = process.env.NB_QUIET || '';
  
  const result = {
    ok: true,
    activeRoute: primary,
    dedupeWindowSec: 120,
    quietHours: quiet,
    nextPlannerTime: '18:00',
    nudgesEnabled: true
  };
  
  logger.debug('Nudges status requested', result);
  res.json(result);
});

// --- EVENTS API ---
app.get('/events', async (req, res) => {
  const timer = logger.startTimer('get_events');
  
  try {
    const start = req.query.start ? new Date(String(req.query.start)) : new Date();
    const end = req.query.end ? new Date(String(req.query.end)) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      logger.warn('Invalid date parameters', { start: req.query.start, end: req.query.end });
      return res.status(400).json({ error: 'Invalid start or end date' });
    }

    logger.debug('Fetching events', { 
      start: start.toISOString(), 
      end: end.toISOString(),
      range: `${Math.round((end - start) / (1000 * 60 * 60 * 24))} days`
    });

    const dbTimer = logger.startTimer('events_db_query');
    const events = await prisma.event.findMany({
      where: {
        OR: [
          { startsAt: { gte: start, lte: end } },
          { endsAt: { gte: start, lte: end } },
          { AND: [{ startsAt: { lte: start } }, { endsAt: { gte: end } }] }
        ]
      },
      include: {
        task: true,
        reminders: true,
        reflections: true,
        exceptions: true
      }
    });
    dbTimer.end({ count: events.length });

    // Expand recurring events
    const expandedEvents = [];
    let recurringProcessed = 0;
    
    for (const event of events) {
      if (event.rrule) {
        try {
          const rule = RRule.fromString(event.rrule);
          const occurrences = rule.between(start, end, true);
          
          for (const occurrence of occurrences) {
            const duration = new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime();
            const isSkipped = event.exceptions.some(ex => 
              Math.abs(new Date(ex.occurrence).getTime() - occurrence.getTime()) < 60000 && ex.skipped
            );
            
            if (!isSkipped) {
              expandedEvents.push({
                ...event,
                id: `${event.id}_${occurrence.getTime()}`,
                startsAt: occurrence,
                endsAt: new Date(occurrence.getTime() + duration),
                isRecurrence: true,
                parentId: event.id
              });
            }
          }
          recurringProcessed++;
        } catch (error) {
          logger.warn('Invalid RRULE', { eventId: event.id, rrule: event.rrule }, error);
          expandedEvents.push(event);
        }
      } else {
        expandedEvents.push(event);
      }
    }

    logger.info('Events fetched successfully', {
      originalCount: events.length,
      expandedCount: expandedEvents.length,
      recurringProcessed,
      duration: timer.end()
    });

    res.json(expandedEvents);
  } catch (error) {
    logger.error('Failed to fetch events', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

app.post('/events', async (req, res) => {
  const timer = logger.startTimer('create_event');
  
  try {
    const data = CreateEventSchema.parse(req.body);
    logger.debug('Creating event', { title: data.title, allDay: data.allDay });
    
    const { reminders, ...eventData } = data;
    
    const dbTimer = logger.startTimer('event_create_db');
    const event = await prisma.event.create({
      data: {
        ...eventData,
        isMultiDay: new Date(data.endsAt).toDateString() !== new Date(data.startsAt).toDateString(),
        reminders: {
          create: reminders
        }
      },
      include: {
        task: true,
        reminders: true,
        reflections: true
      }
    });
    dbTimer.end();

    logger.info('Event created successfully', { 
      eventId: event.id, 
      title: event.title,
      remindersCount: reminders.length,
      duration: timer.end()
    });

    res.json({ ok: true, event });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Event validation failed', { errors: error.errors });
      timer.end();
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Failed to create event', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

app.patch('/events/:id', async (req, res) => {
  const timer = logger.startTimer('update_event');
  
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.debug('Updating event', { eventId: id, updates: Object.keys(updates) });

    // Handle multi-day calculation if dates are being updated
    if (updates.startsAt || updates.endsAt) {
      const event = await prisma.event.findUnique({ where: { id } });
      if (!event) {
        logger.warn('Event not found for update', { eventId: id });
        return res.status(404).json({ error: 'Event not found' });
      }

      const newStart = updates.startsAt ? new Date(updates.startsAt) : new Date(event.startsAt);
      const newEnd = updates.endsAt ? new Date(updates.endsAt) : new Date(event.endsAt);
      updates.isMultiDay = newStart.toDateString() !== newEnd.toDateString();
    }

    const dbTimer = logger.startTimer('event_update_db');
    const event = await prisma.event.update({
      where: { id },
      data: updates,
      include: {
        task: true,
        reminders: true,
        reflections: true
      }
    });
    dbTimer.end();

    logger.info('Event updated successfully', { 
      eventId: id, 
      title: event.title,
      duration: timer.end()
    });

    res.json({ ok: true, event });
  } catch (error) {
    logger.error('Failed to update event', { eventId: req.params.id, error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

app.delete('/events/:id', async (req, res) => {
  const timer = logger.startTimer('delete_event');
  
  try {
    const { id } = req.params;
    logger.debug('Deleting event', { eventId: id });

    const dbTimer = logger.startTimer('event_delete_db');
    await prisma.event.delete({ where: { id } });
    dbTimer.end();

    logger.info('Event deleted successfully', { eventId: id, duration: timer.end() });
    res.json({ ok: true });
  } catch (error) {
    logger.error('Failed to delete event', { eventId: req.params.id, error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

// --- TASKS API ---
app.get('/tasks', async (req, res) => {
  const timer = logger.startTimer('get_tasks');
  
  try {
    const status = req.query.status;
    const priority = req.query.priority ? parseInt(String(req.query.priority)) : undefined;

    logger.debug('Fetching tasks', { status, priority });

    const dbTimer = logger.startTimer('tasks_db_query');
    const tasks = await prisma.task.findMany({
      where: {
        ...(status && { status: String(status) }),
        ...(priority !== undefined && { priority })
      },
      include: {
        subtasks: true,
        parent: true,
        events: true
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    dbTimer.end({ count: tasks.length });

    logger.info('Tasks fetched successfully', { 
      count: tasks.length, 
      status, 
      priority,
      duration: timer.end()
    });

    res.json({ tasks });
  } catch (error) {
    logger.error('Failed to fetch tasks', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

app.post('/tasks', async (req, res) => {
  const timer = logger.startTimer('create_task');
  
  try {
    const data = CreateTaskSchema.parse(req.body);
    logger.debug('Creating task', { title: data.title, priority: data.priority });

    const dbTimer = logger.startTimer('task_create_db');
    const task = await prisma.task.create({
      data,
      include: {
        subtasks: true,
        parent: true,
        events: true
      }
    });
    dbTimer.end();

    logger.info('Task created successfully', { 
      taskId: task.id, 
      title: task.title, 
      priority: task.priority,
      duration: timer.end()
    });

    res.json({ ok: true, task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Task validation failed', { errors: error.errors });
      timer.end();
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Failed to create task', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

app.patch('/tasks/:id', async (req, res) => {
  const timer = logger.startTimer('update_task');
  
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.debug('Updating task', { taskId: id, updates: Object.keys(updates) });

    const dbTimer = logger.startTimer('task_update_db');
    const task = await prisma.task.update({
      where: { id },
      data: updates,
      include: {
        subtasks: true,
        parent: true,
        events: true
      }
    });
    dbTimer.end();

    logger.info('Task updated successfully', { 
      taskId: id, 
      title: task.title,
      status: task.status,
      duration: timer.end()
    });

    res.json({ ok: true, task });
  } catch (error) {
    logger.error('Failed to update task', { taskId: req.params.id, error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

app.delete('/tasks/:id', async (req, res) => {
  const timer = logger.startTimer('delete_task');
  
  try {
    const { id } = req.params;
    logger.debug('Deleting task', { taskId: id });

    const dbTimer = logger.startTimer('task_delete_db');
    await prisma.task.delete({ where: { id } });
    dbTimer.end();

    logger.info('Task deleted successfully', { taskId: id, duration: timer.end() });
    res.json({ ok: true });
  } catch (error) {
    logger.error('Failed to delete task', { taskId: req.params.id, error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

// --- REFLECTIONS API ---
app.post('/events/:id/reflection', async (req, res) => {
  const timer = logger.startTimer('save_reflection');
  
  try {
    const { id } = req.params;
    const data = CreateReflectionSchema.parse(req.body);

    logger.debug('Saving reflection', { eventId: id, focusPct: data.focusPct, goalPct: data.goalPct, mood: data.mood });

    const dbTimer = logger.startTimer('reflection_save_db');
    const reflection = await prisma.reflection.upsert({
      where: { eventId: id },
      update: data,
      create: { ...data, eventId: id },
      include: { event: true }
    });
    dbTimer.end();

    logger.info('Reflection saved successfully', { 
      reflectionId: reflection.id, 
      eventId: id,
      eventTitle: reflection.event.title,
      duration: timer.end()
    });

    res.json({ ok: true, reflection });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Reflection validation failed', { errors: error.errors });
      timer.end();
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Failed to save reflection', { eventId: req.params.id, error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

// --- QUICK NOTES API ---
app.post('/notes/quick', async (req, res) => {
  const timer = logger.startTimer('save_quick_note');
  
  try {
    const { body, source = 'web' } = req.body;
    
    if (!body || typeof body !== 'string') {
      logger.warn('Invalid quick note body', { body: typeof body });
      return res.status(400).json({ error: 'Body is required' });
    }

    const tags = (body.match(/#\w+/g) || []).map(tag => tag.slice(1));
    logger.debug('Creating quick note', { source, tagsCount: tags.length, bodyLength: body.length });
    
    const dbTimer = logger.startTimer('quick_note_create_db');
    const note = await prisma.quickNote.create({
      data: {
        body,
        tags: ['quick', ...tags],
        source
      }
    });
    dbTimer.end();

    logger.info('Quick note saved successfully', { 
      noteId: note.id, 
      source, 
      tags: note.tags,
      duration: timer.end()
    });

    res.json({ ok: true, note });
  } catch (error) {
    logger.error('Failed to save quick note', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

app.get('/notes/quick', async (req, res) => {
  const timer = logger.startTimer('get_quick_notes');
  
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 20;
    
    logger.debug('Fetching quick notes', { limit });

    const dbTimer = logger.startTimer('quick_notes_db_query');
    const notes = await prisma.quickNote.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    dbTimer.end({ count: notes.length });

    logger.info('Quick notes fetched successfully', { count: notes.length, duration: timer.end() });
    res.json({ notes });
  } catch (error) {
    logger.error('Failed to fetch quick notes', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

// --- STATS API ---
app.get('/stats/week', async (req, res) => {
  const timer = logger.startTimer('get_week_stats');
  
  try {
    const startDate = req.query.start ? new Date(String(req.query.start)) : new Date();
    if (isNaN(startDate.getTime())) {
      logger.warn('Invalid start date for stats', { start: req.query.start });
      return res.status(400).json({ error: 'Invalid start date' });
    }

    // Get start of week (Monday)
    const dayOfWeek = startDate.getDay();
    const startOfWeek = new Date(startDate);
    startOfWeek.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    logger.debug('Calculating week stats', { 
      startOfWeek: startOfWeek.toISOString(), 
      endOfWeek: endOfWeek.toISOString() 
    });

    const dbTimer = logger.startTimer('week_stats_db_query');
    const events = await prisma.event.findMany({
      where: {
        OR: [
          { startsAt: { gte: startOfWeek, lt: endOfWeek } },
          { endsAt: { gte: startOfWeek, lt: endOfWeek } }
        ]
      },
      include: { reflections: true }
    });
    dbTimer.end({ eventCount: events.length });

    const plannedMinutes = events.reduce((total, event) => {
      const duration = new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime();
      return total + Math.round(duration / (1000 * 60));
    }, 0);

    const completedMinutes = events.reduce((total, event) => {
      if (event.reflections.length > 0) {
        const duration = new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime();
        return total + Math.round(duration / (1000 * 60));
      }
      return total;
    }, 0);

    const adherencePct = plannedMinutes > 0 ? Math.round((completedMinutes / plannedMinutes) * 100) : 0;

    const stats = {
      startOfWeek: startOfWeek.toISOString(),
      endOfWeek: endOfWeek.toISOString(),
      plannedMinutes,
      completedMinutes,
      adherencePct,
      eventCount: events.length,
      reflectionCount: events.filter(e => e.reflections.length > 0).length
    };

    logger.info('Week stats calculated successfully', { 
      ...stats, 
      plannedHours: Math.round(plannedMinutes / 60 * 10) / 10,
      duration: timer.end()
    });

    res.json(stats);
  } catch (error) {
    logger.error('Failed to calculate week stats', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

// --- EXPORT (Dry-run only) ---
function confineToNeuroBoost(vaultPathAbs) {
  const root = path.resolve(vaultPathAbs ?? process.cwd());
  const nbRoot = path.join(root, 'NeuroBoost');
  return { root, nbRoot };
}

app.get('/export/dry-run', async (req, res) => {
  const timer = logger.startTimer('export_dry_run');
  
  try {
    const VAULT = req.query.vault ? String(req.query.vault) : undefined;
    const { nbRoot } = confineToNeuroBoost(VAULT);

    logger.debug('Starting export dry-run', { vault: VAULT || 'default', nbRoot });

    const dbTimer = logger.startTimer('export_data_fetch');
    const [tasks, events, notes] = await Promise.all([
      prisma.task.findMany({ include: { subtasks: true } }),
      prisma.event.findMany({ include: { reminders: true, reflections: true } }),
      prisma.quickNote.findMany({ take: 100, orderBy: { createdAt: 'desc' } })
    ]);
    dbTimer.end({ taskCount: tasks.length, eventCount: events.length, noteCount: notes.length });

    const files = [];

    // Tasks -> NeuroBoost/tasks/<id>.md
    for (const task of tasks) {
      const relPath = path.join('NeuroBoost', 'tasks', `${task.id}.md`);
      const content = [
        '---',
        `id: ${task.id}`,
        'type: task',
        `priority: ${task.priority}`,
        `status: ${task.status}`,
        `tags: ${JSON.stringify(['#neuroboost', ...task.tags])}`,
        task.dueDate ? `due_date: ${task.dueDate}` : '',
        task.estimatedMinutes ? `estimated_minutes: ${task.estimatedMinutes}` : '',
        '---',
        '',
        `# ${task.title}`,
        task.description || ''
      ].filter(Boolean).join('\n');

      files.push({
        path: relPath.replace(/\\/g, '/'),
        action: 'create',
        bytes: Buffer.byteLength(content, 'utf8')
      });
    }

    // Events -> NeuroBoost/calendar/<YYYY>/<YYYY-MM-DD>__<id>.md
    for (const event of events) {
      const startDate = new Date(event.startsAt);
      const day = startDate.toISOString().slice(0, 10);
      const year = day.slice(0, 4);
      const relPath = path.join('NeuroBoost', 'calendar', year, `${day}__${event.id}.md`);
      
      const content = [
        '---',
        `id: ${event.id}`,
        'type: event',
        `all_day: ${event.allDay}`,
        `rrule: ${event.rrule || ''}`,
        `starts_at_utc: ${new Date(event.startsAt).toISOString()}`,
        `ends_at_utc: ${new Date(event.endsAt).toISOString()}`,
        `tags: ${JSON.stringify(['#neuroboost', '#calendar', ...event.tags])}`,
        event.location ? `location: ${event.location}` : '',
        event.color ? `color: ${event.color}` : '',
        `reflections: ${event.reflections.length}`,
        '---',
        '',
        `# ${event.title}`,
        event.description || ''
      ].filter(Boolean).join('\n');

      files.push({
        path: relPath.replace(/\\/g, '/'),
        action: 'create',
        bytes: Buffer.byteLength(content, 'utf8')
      });
    }

    // Quick Notes -> NeuroBoost/notes/quick.md (append mode)
    if (notes.length > 0) {
      const relPath = path.join('NeuroBoost', 'notes', 'quick.md');
      const content = [
        '---',
        'type: quick_notes',
        `tags: ["#neuroboost", "#quick"]`,
        '---',
        '',
        '# Quick Notes',
        '',
        ...notes.map(note => `- ${note.createdAt.toISOString().slice(0, 10)} ${note.body}`)
      ].join('\n');

      files.push({
        path: relPath.replace(/\\/g, '/'),
        action: 'update',
        bytes: Buffer.byteLength(content, 'utf8')
      });
    }

    const result = {
      mode: 'dry-run',
      planned: files.length,
      totalBytes: files.reduce((sum, f) => sum + f.bytes, 0),
      files: files.slice(0, 50)
    };

    logger.info('Export dry-run completed successfully', { 
      filesPlanned: result.planned, 
      totalKB: Math.round(result.totalBytes / 1024),
      taskFiles: tasks.length,
      eventFiles: events.length,
      noteFiles: notes.length > 0 ? 1 : 0,
      duration: timer.end()
    });

    res.json(result);
  } catch (error) {
    logger.error('Export dry-run failed', { error: error.message }, error);
    timer.end();
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// === USER SETTINGS & WORK HOURS API ===

const UserSettingsSchema = z.object({
  defaultTimezone: z.string().default('Europe/Moscow'),
  workingHoursStart: z.number().min(0).max(23).default(9),
  workingHoursEnd: z.number().min(0).max(23).default(17),
  workingDays: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]), // Mon-Fri
  enableTelegram: z.boolean().default(true),
  enableWeb: z.boolean().default(true),
  enableDesktop: z.boolean().default(false),
  obsidianVaultPath: z.string().optional()
});

// Get user settings
app.get('/settings', async (req, res) => {
  const timer = logger.startTimer('get_user_settings');
  
  try {
    logger.debug('Fetching user settings');

    const dbTimer = logger.startTimer('settings_db_query');
    let settings = await prisma.userSettings.findFirst({
      where: { userId: 'default' } // For single-user MVP
    });
    
    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.userSettings.create({
        data: {
          userId: 'default',
          defaultTimezone: 'Europe/Moscow',
          workingHoursStart: 9,
          workingHoursEnd: 17,
          workingDays: [1, 2, 3, 4, 5]
        }
      });
    }
    dbTimer.end();

    logger.info('User settings fetched successfully', { 
      settingsId: settings.id,
      workingHours: `${settings.workingHoursStart}-${settings.workingHoursEnd}`,
      duration: timer.end()
    });

    res.json({ settings });
  } catch (error) {
    logger.error('Failed to fetch user settings', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

// Update user settings
app.patch('/settings', async (req, res) => {
  const timer = logger.startTimer('update_user_settings');
  
  try {
    const data = UserSettingsSchema.partial().parse(req.body);
    logger.debug('Updating user settings', { updates: Object.keys(data) });

    const dbTimer = logger.startTimer('settings_update_db');
    const settings = await prisma.userSettings.upsert({
      where: { userId: 'default' },
      update: {
        ...data,
        updatedAt: new Date()
      },
      create: {
        userId: 'default',
        ...data
      }
    });
    dbTimer.end();

    logger.info('User settings updated successfully', { 
      settingsId: settings.id,
      updatedFields: Object.keys(data),
      duration: timer.end()
    });

    res.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Settings validation failed', { errors: error.errors });
      timer.end();
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Failed to update user settings', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

// === ENHANCED TASK FILTERING API ===

// Get filtered tasks based on work hours and visibility rules
app.get('/tasks/filtered', async (req, res) => {
  const timer = logger.startTimer('get_filtered_tasks');
  
  try {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentDay = currentTime.getDay();
    const forceAll = req.query.all === 'true';

    logger.debug('Fetching filtered tasks', { 
      currentHour, 
      currentDay, 
      forceAll,
      timezone: req.query.timezone || 'Europe/Moscow'
    });

    // Get user settings
    const settingsTimer = logger.startTimer('get_settings_for_filtering');
    const settings = await prisma.userSettings.findFirst({
      where: { userId: 'default' }
    });
    settingsTimer.end();

    // Get all tasks
    const dbTimer = logger.startTimer('filtered_tasks_db_query');
    const allTasks = await prisma.task.findMany({
      where: {
        status: { not: 'DONE' }
      },
      include: {
        subtasks: true,
        parent: true,
        events: true
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    dbTimer.end({ count: allTasks.length });

    let filteredTasks = allTasks;

    // Apply work hours filtering if settings exist and not forcing all
    if (settings && !forceAll) {
      const isWorkDay = settings.workingDays.includes(currentDay);
      const isWorkTime = currentHour >= settings.workingHoursStart && currentHour < settings.workingHoursEnd;
      const isWorkHours = isWorkDay && isWorkTime;

      logger.debug('Work hours analysis', {
        isWorkDay,
        isWorkTime,
        isWorkHours,
        workingDays: settings.workingDays,
        workingHours: `${settings.workingHoursStart}-${settings.workingHoursEnd}`
      });

      if (isWorkHours) {
        // During work hours, filter out personal tasks (except emergency/ASAP)
        filteredTasks = allTasks.filter(task => {
          // Always show emergency (1) and ASAP (2) tasks
          if (task.priority <= 2) return true;

          // Filter out personal/home tasks during work hours
          const personalTags = ['personal', 'home', 'family', 'leisure', 'hobby'];
          const hasPersonalTag = task.tags.some(tag => 
            personalTags.includes(tag.toLowerCase())
          );

          return !hasPersonalTag;
        });
      }
      // Outside work hours, show all tasks (no filtering)
    }

    // Group tasks by priority for response
    const tasksByPriority = filteredTasks.reduce((acc, task) => {
      if (!acc[task.priority]) acc[task.priority] = [];
      acc[task.priority].push(task);
      return acc;
    }, {});

    const response = {
      tasks: filteredTasks,
      tasksByPriority,
      metadata: {
        totalTasks: allTasks.length,
        filteredTasks: filteredTasks.length,
        isWorkHours: settings ? 
          settings.workingDays.includes(currentDay) && 
          currentHour >= settings.workingHoursStart && 
          currentHour < settings.workingHoursEnd : false,
        workingHours: settings ? {
          start: settings.workingHoursStart,
          end: settings.workingHoursEnd,
          days: settings.workingDays
        } : null,
        currentTime: currentTime.toISOString(),
        currentHour,
        currentDay
      }
    };

    logger.info('Filtered tasks retrieved successfully', {
      totalTasks: allTasks.length,
      filteredTasks: filteredTasks.length,
      isWorkHours: response.metadata.isWorkHours,
      emergencyTasks: filteredTasks.filter(t => t.priority === 1).length,
      duration: timer.end()
    });

    res.json(response);
  } catch (error) {
    logger.error('Failed to get filtered tasks', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

// Get task priorities summary
app.get('/tasks/priorities', async (req, res) => {
  const timer = logger.startTimer('get_task_priorities');
  
  try {
    const dbTimer = logger.startTimer('priority_stats_db_query');
    const priorityStats = await prisma.task.groupBy({
      by: ['priority', 'status'],
      _count: true,
      where: {
        status: { not: 'DONE' }
      }
    });
    dbTimer.end();

    const priorityNames = ['Buffer', 'Emergency', 'ASAP', 'Must Today', 'Deadline Soon', 'If Possible'];
    
    const summary = {};
    for (let i = 0; i <= 5; i++) {
      summary[i] = {
        name: priorityNames[i],
        total: 0,
        todo: 0,
        scheduled: 0,
        inProgress: 0
      };
    }

    priorityStats.forEach(stat => {
      if (summary[stat.priority]) {
        summary[stat.priority].total += stat._count;
        const statusKey = stat.status.toLowerCase().replace('_', '');
        if (summary[stat.priority][statusKey] !== undefined) {
          summary[stat.priority][statusKey] = stat._count;
        }
      }
    });

    logger.info('Task priorities summary generated', { 
      totalCategories: Object.keys(summary).length,
      duration: timer.end()
    });

    res.json({ prioritySummary: summary });
  } catch (error) {
    logger.error('Failed to get task priorities', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

// === TASK SCHEDULING API ===

// Convert task to event (task-to-calendar drag and drop)
app.post('/tasks/:id/schedule', async (req, res) => {
  const timer = logger.startTimer('schedule_task_as_event');
  
  try {
    const { id } = req.params;
    const { startsAt, duration = 60, keepTaskOpen = false } = req.body;

    if (!startsAt) {
      return res.status(400).json({ error: 'startsAt is required' });
    }

    logger.debug('Scheduling task as event', { 
      taskId: id, 
      startsAt, 
      duration, 
      keepTaskOpen 
    });

    // Get task details
    const taskTimer = logger.startTimer('get_task_for_scheduling');
    const task = await prisma.task.findUnique({ 
      where: { id },
      include: { subtasks: true }
    });
    taskTimer.end();

    if (!task) {
      logger.warn('Task not found for scheduling', { taskId: id });
      return res.status(404).json({ error: 'Task not found' });
    }

    // Calculate event times
    const startTime = new Date(startsAt);
    const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));

    // Create event
    const eventTimer = logger.startTimer('create_event_from_task');
    const event = await prisma.event.create({
      data: {
        title: task.title,
        description: task.description,
        startsAt: startTime,
        endsAt: endTime,
        allDay: false,
        sourceTaskId: task.id,
        tags: task.tags,
        isMultiDay: startTime.toDateString() !== endTime.toDateString(),
        reminders: {
          create: [{
            minutesBefore: duration <= 30 ? 3 : duration <= 60 ? 5 : 15,
            channel: 'TELEGRAM'
          }]
        }
      },
      include: {
        task: true,
        reminders: true,
        reflections: true
      }
    });
    eventTimer.end();

    // Update task status to SCHEDULED (unless keeping it open)
    if (!keepTaskOpen) {
      const taskUpdateTimer = logger.startTimer('update_task_status');
      await prisma.task.update({
        where: { id },
        data: { status: 'SCHEDULED' }
      });
      taskUpdateTimer.end();
    }

    logger.info('Task scheduled as event successfully', {
      taskId: id,
      eventId: event.id,
      taskTitle: task.title,
      startTime: startTime.toISOString(),
      duration,
      keepTaskOpen,
      reminderMinutes: duration <= 30 ? 3 : duration <= 60 ? 5 : 15,
      duration: timer.end()
    });

    res.json({ 
      ok: true, 
      event,
      message: `Task "${task.title}" scheduled for ${duration} minutes`
    });
  } catch (error) {
    logger.error('Failed to schedule task as event', { 
      taskId: req.params.id, 
      error: error.message 
    }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

// Bulk task operations
app.patch('/tasks/bulk', async (req, res) => {
  const timer = logger.startTimer('bulk_task_operations');
  
  try {
    const { taskIds, operation, data = {} } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'taskIds array is required' });
    }

    logger.debug('Performing bulk task operation', {
      operation,
      taskCount: taskIds.length,
      data
    });

    let result;
    const dbTimer = logger.startTimer('bulk_task_db_operation');

    switch (operation) {
      case 'mark_done':
        result = await prisma.task.updateMany({
          where: { id: { in: taskIds } },
          data: { status: 'DONE', updatedAt: new Date() }
        });
        break;

      case 'set_priority':
        if (typeof data.priority !== 'number' || data.priority < 0 || data.priority > 5) {
          return res.status(400).json({ error: 'Valid priority (0-5) is required' });
        }
        result = await prisma.task.updateMany({
          where: { id: { in: taskIds } },
          data: { priority: data.priority, updatedAt: new Date() }
        });
        break;

      case 'add_tags':
        if (!data.tags || !Array.isArray(data.tags)) {
          return res.status(400).json({ error: 'tags array is required' });
        }
        // This requires individual updates for array operations
        result = { count: 0 };
        for (const taskId of taskIds) {
          const task = await prisma.task.findUnique({ where: { id: taskId } });
          if (task) {
            const newTags = [...new Set([...task.tags, ...data.tags])];
            await prisma.task.update({
              where: { id: taskId },
              data: { tags: newTags, updatedAt: new Date() }
            });
            result.count++;
          }
        }
        break;

      case 'hide_during_workhours':
        // For now, we'll add a special tag to indicate hidden during work hours
        result = { count: 0 };
        for (const taskId of taskIds) {
          const task = await prisma.task.findUnique({ where: { id: taskId } });
          if (task) {
            const newTags = task.tags.includes('hidden_workhours') 
              ? task.tags 
              : [...task.tags, 'hidden_workhours'];
            await prisma.task.update({
              where: { id: taskId },
              data: { tags: newTags, updatedAt: new Date() }
            });
            result.count++;
          }
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }

    dbTimer.end();

    logger.info('Bulk task operation completed', {
      operation,
      tasksAffected: result.count,
      duration: timer.end()
    });

    res.json({ 
      ok: true, 
      operation,
      tasksAffected: result.count,
      message: `${operation} applied to ${result.count} tasks`
    });
  } catch (error) {
    logger.error('Failed to perform bulk task operation', { 
      operation: req.body.operation,
      error: error.message 
    }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

// === TELEGRAM BOT INTEGRATION HELPERS ===

// Get today's focus data (optimized for bot)
app.get('/bot/today-focus', async (req, res) => {
  const timer = logger.startTimer('bot_today_focus');
  
  try {
    const timezone = req.query.timezone || 'Europe/Moscow';
    const { DateTime } = await import('luxon');
    
    const now = DateTime.now().setZone(timezone);
    const todayStart = now.startOf('day').toUTC().toJSDate();
    const todayEnd = now.endOf('day').toUTC().toJSDate();

    logger.debug('Getting today focus for bot', { timezone, date: now.toISODate() });

    // Get today's events and priority tasks in parallel
    const [events, allTasks, settings] = await Promise.all([
      prisma.event.findMany({
        where: {
          OR: [
            { startsAt: { gte: todayStart, lte: todayEnd } },
            { endsAt: { gte: todayStart, lte: todayEnd } }
          ]
        },
        include: { reminders: true, reflections: true },
        orderBy: { startsAt: 'asc' }
      }),
      prisma.task.findMany({
        where: { status: 'TODO' },
        orderBy: { priority: 'asc' }
      }),
      prisma.userSettings.findFirst({ where: { userId: 'default' } })
    ]);

    // Apply work hours filtering
    const currentHour = now.hour;
    const currentDay = now.weekday % 7; // Convert to Sunday=0 format
    
    let visibleTasks = allTasks;
    let isWorkHours = false;

    if (settings) {
      const isWorkDay = settings.workingDays.includes(currentDay);
      isWorkHours = isWorkDay && currentHour >= settings.workingHoursStart && currentHour < settings.workingHoursEnd;
      
      if (isWorkHours) {
        visibleTasks = allTasks.filter(task => {
          if (task.priority <= 2) return true; // Always show emergency/ASAP
          
          const personalTags = ['personal', 'home', 'family', 'leisure'];
          return !task.tags.some(tag => personalTags.includes(tag.toLowerCase()));
        });
      }
    }

    // Get top 5 priority tasks
    const topTasks = visibleTasks.slice(0, 5);
    
    // Find next event
    const nextEvent = events.find(event => new Date(event.startsAt) > new Date());

    const response = {
      currentTime: now.toISO(),
      isWorkHours,
      workHours: settings ? {
        start: settings.workingHoursStart,
        end: settings.workingHoursEnd,
        days: settings.workingDays
      } : null,
      todayEvents: {
        total: events.length,
        next: nextEvent ? {
          id: nextEvent.id,
          title: nextEvent.title,
          startsAt: nextEvent.startsAt,
          timeUntil: Math.round((new Date(nextEvent.startsAt).getTime() - new Date().getTime()) / (1000 * 60))
        } : null,
        events: events.map(e => ({
          id: e.id,
          title: e.title,
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          allDay: e.allDay
        }))
      },
      priorityTasks: {
        total: visibleTasks.length,
        top: topTasks.map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          estimatedMinutes: t.estimatedMinutes,
          tags: t.tags
        }))
      }
    };

    logger.info('Today focus data prepared for bot', {
      eventsCount: events.length,
      totalTasks: allTasks.length,
      visibleTasks: visibleTasks.length,
      topTasks: topTasks.length,
      isWorkHours,
      duration: timer.end()
    });

    res.json(response);
  } catch (error) {
    logger.error('Failed to get today focus for bot', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: String(error) });
  }
});

// --- LOGS API (for debugging) ---
app.get('/logs/recent', (req, res) => {
  try {
    const lines = parseInt(req.query.lines) || 50;
    const level = req.query.level;
    
    const logs = logger.getRecentLogs(lines, level);
    const stats = logger.getStats();
    
    res.json({
      logs,
      stats,
      total: logs.length
    });
  } catch (error) {
    logger.error('Failed to get recent logs', { error: error.message }, error);
    res.status(500).json({ error: String(error) });
  }
});

// --- Start Server ---
const port = Number(process.env.PORT || process.env.API_PORT || 3001);

app.listen(port, () => {
  logger.info('NeuroBoost API Server started', {
    port,
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    pid: process.pid
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message }, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason: String(reason), promise: String(promise) });
});