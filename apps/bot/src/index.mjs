import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { SessionManager } from './session.mjs';
import { formatEvent, formatTask, formatTime } from './formatters.mjs';
import { sendToAPI } from './api-client.mjs';
import { createLogger } from './logger.mjs';
import { startPeriodicCleanup } from './cleanup.mjs';
import { 
  handleTodaysFocus,
  handleTopTasks,
  handleCalendarView,
  handleTaskAction,
  handleWorkHours
} from './enhanced-handlers.mjs';

import {
  createMonthCalendarKeyboard,
  createTimeSlotKeyboard,
  createEventDurationKeyboard,
  createMainKeyboard,
  createTaskPriorityKeyboard,
  createConfirmKeyboard,
  createWorkDaysKeyboard,
  createDayViewKeyboard
} from './keyboards.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const logger = createLogger('bot');
const raw = process.env.TELEGRAM_BOT_TOKEN || '';
const token = raw.trim();
if (!token) {
  logger.error('TELEGRAM_BOT_TOKEN is missing/empty after trim');
  process.exit(1);
}
// Optional sanity check (Telegram tokens look like 9-10 digits + colon + ~35 chars)
if (!/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(token)) {
  logger.warn('TELEGRAM_BOT_TOKEN format looks unusual');
}
const bot = new Telegraf(token);
const prisma = new PrismaClient();
const sessions = new SessionManager(prisma);

// API Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3001';

logger.info('NeuroBoost Telegram bot initializing', {
  apiBase: API_BASE,
  botToken: process.env.TELEGRAM_BOT_TOKEN ? '***' : 'MISSING'
});

// Bot error handling
bot.catch((err, ctx) => {
  logger.error('Bot error', {
    updateType: ctx.updateType,
    userId: ctx.from?.id,
    username: ctx.from?.username,
    chatId: ctx.chat?.id,
    error: err.message
  }, err);
  
  ctx.reply('❌ Something went wrong. Please try again.', createMainKeyboard()).catch(() => {
    logger.error('Failed to send error message to user', { userId: ctx.from?.id });
  });
});

// Start command - show main menu
bot.start(async (ctx) => {
  const user = ctx.from;
  const chatId = ctx.chat.id.toString();
  
  logger.botInteraction(user.id, user.username, 'start', {
    firstName: user.first_name,
    lastName: user.last_name,
    languageCode: user.language_code
  });
  
  await sessions.clearSession(chatId);
  
  const welcome = `🧠 *NeuroBoost v0.2.1*\n\nHi ${user.first_name}! Your enhanced calendar-first assistant.\n\n✨ *New Features:*\n• Smart task focus view\n• Month-ahead calendar\n• Quick task-to-event conversion\n• Work hours filtering`;
  
  try {
    await ctx.reply(welcome, {
      parse_mode: 'Markdown',
      ...createMainKeyboard()
    });
    
    logger.info('Enhanced start menu shown', { userId: user.id, username: user.username });
  } catch (error) {
    logger.error('Failed to show enhanced start menu', { userId: user.id, error: error.message }, error);
  }
});

// Main menu callback
bot.action('main_menu', async (ctx) => {
  const timer = logger.startTimer('main_menu_action');
  
  await ctx.answerCbQuery();
  await sessions.clearSession(ctx.chat.id.toString());
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'main_menu');
  
  try {
    await ctx.editMessageText('🧠 *NeuroBoost* - What would you like to do?', {
      parse_mode: 'Markdown',
      ...createMainKeyboard()
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show main menu', { userId: ctx.from.id, error: error.message }, error);
    timer.end();
  }
});

// === QUICK NOTE FLOW ===
bot.action('quick_note', async (ctx) => {
  const timer = logger.startTimer('quick_note_flow');
  
  await ctx.answerCbQuery();
  const chatId = ctx.chat.id.toString();
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'quick_note_start');
  
  try {
    await sessions.setSession(chatId, 'quick_note', {});
    
    await ctx.editMessageText(
      '📝 *Quick Note*\n\nSend me your note. It will be tagged with #quick automatically.\n\n💡 *Tip:* Add your own #tags in the message!',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'main_menu')]
        ])
      }
    );
    
    timer.end();
  } catch (error) {
    logger.error('Failed to start quick note flow', { userId: ctx.from.id, error: error.message }, error);
    timer.end();
  }
});

// === NEW TASK FLOW ===
bot.action('new_task', async (ctx) => {
  const timer = logger.startTimer('new_task_flow');
  
  await ctx.answerCbQuery();
  const chatId = ctx.chat.id.toString();
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'new_task_start');
  
  try {
    await sessions.setSession(chatId, 'new_task', { step: 'title' });
    
    await ctx.editMessageText(
      '📋 *New Task*\n\nWhat\'s the task title?\n\n💡 *Example:* "Review Q4 budget"',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'main_menu')]
        ])
      }
    );
    
    timer.end();
  } catch (error) {
    logger.error('Failed to start new task flow', { userId: ctx.from.id, error: error.message }, error);
    timer.end();
  }
});

// Task priority selection
bot.action(/^task_priority_(\d)$/, async (ctx) => {
  const timer = logger.startTimer('task_priority_selection');
  
  await ctx.answerCbQuery();
  const priority = parseInt(ctx.match[1]);
  const chatId = ctx.chat.id.toString();
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'task_priority_selected', { priority });
  
  const session = await sessions.getSession(chatId);
  if (!session || session.state !== 'new_task') {
    logger.warn('Invalid session for task priority selection', { 
      userId: ctx.from.id, 
      sessionState: session?.state 
    });
    return ctx.reply('❌ Session expired. Please start over.', createMainKeyboard());
  }
  
  // Create the task
  try {
    const taskData = {
      ...session.data,
      priority
    };
    
    const apiTimer = logger.startTimer('create_task_api');
    const result = await sendToAPI('POST', '/tasks', taskData);
    apiTimer.end();
    
    await sessions.clearSession(chatId);
    
    const priorityNames = ['Buffer', 'Emergency', 'ASAP', 'Must today', 'Deadline soon', 'If possible'];
    const priorityName = priorityNames[priority] || 'Unknown';
    
    logger.info('Task created via bot', {
      userId: ctx.from.id,
      taskId: result.task.id,
      title: taskData.title,
      priority,
      priorityName
    });
    
    await ctx.editMessageText(
      `✅ *Task Created!*\n\n📋 ${taskData.title}\n🎯 Priority: ${priority} (${priorityName})\n\nTask ID: \`${result.task.id}\``,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📋 New Task', 'new_task')],
          [Markup.button.callback('🏠 Main Menu', 'main_menu')]
        ])
      }
    );
    
    timer.end();
  } catch (error) {
    logger.error('Failed to create task via bot', { 
      userId: ctx.from.id, 
      taskData: session.data, 
      priority, 
      error: error.message 
    }, error);
    
    await ctx.editMessageText(
      '❌ Failed to create task. Please try again.',
      createMainKeyboard()
    );
    
    timer.end();
  }
});

// === NEW EVENT FLOW ===
bot.action('new_event', async (ctx) => {
  const timer = logger.startTimer('new_event_flow');
  
  await ctx.answerCbQuery();
  const chatId = ctx.chat.id.toString();
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'new_event_start');
  
  try {
    await sessions.setSession(chatId, 'new_event', { step: 'title' });
    
    await ctx.editMessageText(
      '📅 *New Event*\n\nWhat\'s the event title?\n\n💡 *Example:* "Team standup"',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'main_menu')]
        ])
      }
    );
    
    timer.end();
  } catch (error) {
    logger.error('Failed to start new event flow', { userId: ctx.from.id, error: error.message }, error);
    timer.end();
  }
});

// === PLAN TODAY FLOW ===
bot.action('plan_today', async (ctx) => {
  const timer = logger.startTimer('plan_today');
  
  await ctx.answerCbQuery();
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'plan_today');
  
  try {
    // Get today's events
    const todayStart = DateTime.now().setZone('Europe/Moscow').startOf('day').toUTC().toISO();
    const todayEnd = DateTime.now().setZone('Europe/Moscow').endOf('day').toUTC().toISO();
    
    const apiTimer1 = logger.startTimer('get_events_api');
    const eventsResponse = await sendToAPI('GET', `/events?start=${todayStart}&end=${todayEnd}`);
    apiTimer1.end();
    
    const events = eventsResponse || [];
    
    // Get high-priority tasks
    const apiTimer2 = logger.startTimer('get_tasks_api');
    const tasksResponse = await sendToAPI('GET', '/tasks?status=TODO&priority=2');
    apiTimer2.end();
    
    const urgentTasks = tasksResponse.tasks || [];
    
    let message = '📅 *Today\'s Plan*\n\n';
    
    if (events.length > 0) {
      message += '*📅 Scheduled Events:*\n';
      events.forEach(event => {
        const startTime = formatTime(event.startsAt);
        message += `• ${startTime} - ${event.title}\n`;
      });
      message += '\n';
    }
    
    if (urgentTasks.length > 0) {
      message += '*🔥 Urgent Tasks (Priority 2):*\n';
      urgentTasks.slice(0, 5).forEach(task => {
        message += `• ${task.title}\n`;
      });
      if (urgentTasks.length > 5) {
        message += `... and ${urgentTasks.length - 5} more\n`;
      }
      message += '\n';
    }
    
    if (events.length === 0 && urgentTasks.length === 0) {
      message += '✨ No scheduled events or urgent tasks!\n\nTime to plan your day?\n';
    }
    
    message += `\n🕐 *Moscow Time:* ${DateTime.now().setZone('Europe/Moscow').toFormat('HH:mm')}`;
    
    logger.info('Plan today shown', {
      userId: ctx.from.id,
      eventsCount: events.length,
      urgentTasksCount: urgentTasks.length
    });
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 New Task', 'new_task'), Markup.button.callback('📅 New Event', 'new_event')],
        [Markup.button.callback('🔄 Refresh', 'plan_today')],
        [Markup.button.callback('🏠 Main Menu', 'main_menu')]
      ])
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show plan today', { userId: ctx.from.id, error: error.message }, error);
    await ctx.editMessageText(
      '❌ Failed to load today\'s plan. Please try again.',
      createMainKeyboard()
    );
    timer.end();
  }
});

// === STATS FLOW ===
bot.action('stats', async (ctx) => {
  const timer = logger.startTimer('stats_flow');
  
  await ctx.answerCbQuery();
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'stats');
  
  try {
    const today = DateTime.now().setZone('Europe/Moscow').toISODate();
    
    const apiTimer = logger.startTimer('get_stats_api');
    const statsResponse = await sendToAPI('GET', `/stats/week?start=${today}`);
    apiTimer.end();
    
    const stats = statsResponse || { plannedMinutes: 0, completedMinutes: 0, adherencePct: 0, eventCount: 0, reflectionCount: 0 };
    
    const plannedHours = Math.round(stats.plannedMinutes / 60 * 10) / 10;
    const completedHours = Math.round(stats.completedMinutes / 60 * 10) / 10;
    const adherence = stats.adherencePct;
    
    let adherenceEmoji = '🔴';
    if (adherence >= 80) adherenceEmoji = '🟢';
    else if (adherence >= 60) adherenceEmoji = '🟡';
    
    const message = `📊 *Week Stats*\n\n` +
      `⏱️ *Planned:* ${plannedHours}h\n` +
      `✅ *Completed:* ${completedHours}h\n` +
      `${adherenceEmoji} *Adherence:* ${adherence}%\n\n` +
      `📅 *Events:* ${stats.eventCount}\n` +
      `💭 *Reflections:* ${stats.reflectionCount}\n\n` +
      `*Week starts Monday*`;
    
    logger.info('Stats shown', {
      userId: ctx.from.id,
      plannedHours,
      completedHours,
      adherence,
      eventCount: stats.eventCount
    });
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh', 'stats')],
        [Markup.button.callback('🏠 Main Menu', 'main_menu')]
      ])
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show stats', { userId: ctx.from.id, error: error.message }, error);
    await ctx.editMessageText(
      '❌ Failed to load stats. Please try again.',
      createMainKeyboard()
    );
    timer.end();
  }
});

// === TEXT MESSAGE HANDLERS ===
bot.on('text', async (ctx) => {
  const timer = logger.startTimer('text_message_handler');
  
  const chatId = ctx.chat.id.toString();
  const text = ctx.message.text;
  const session = await sessions.getSession(chatId);
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'text_message', {
    textLength: text.length,
    hasSession: !!session,
    sessionState: session?.state
  });
  
  if (!session) {
    // No active session - treat as potential quick note
    if (text.includes('#') || text.length < 100) {
      // Looks like a quick note
      logger.debug('Detected potential quick note', {
        userId: ctx.from.id,
        textLength: text.length,
        hasHashtags: text.includes('#')
      });
      
      try {
        await ctx.reply(
          '💡 This looks like a quick note! Should I save it?',
          Markup.inlineKeyboard([
            [Markup.button.callback('✅ Save as Quick Note', 'save_quick_note')],
            [Markup.button.callback('❌ Cancel', 'main_menu')]
          ])
        );
        
        await sessions.setSession(chatId, 'confirm_quick_note', { text });
        timer.end();
      } catch (error) {
        logger.error('Failed to show quick note confirmation', { userId: ctx.from.id, error: error.message }, error);
        timer.end();
      }
    } else {
      // Show help
      logger.debug('Showing help for unrecognized text', { userId: ctx.from.id, textLength: text.length });
      
      try {
        await ctx.reply(
          '🤔 I\'m not sure what to do with that. Use the menu below:',
          createMainKeyboard()
        );
        timer.end();
      } catch (error) {
        logger.error('Failed to show help message', { userId: ctx.from.id, error: error.message }, error);
        timer.end();
      }
    }
    return;
  }
  
  // Handle based on current session state
  try {
    switch (session.state) {
      case 'quick_note':
        await handleQuickNoteText(ctx, text);
        break;
      
      case 'new_task':
        await handleNewTaskText(ctx, text, session);
        break;
      
      case 'new_event':
        await handleNewEventText(ctx, text, session);
        break;
      
      default:
        logger.warn('Unknown session state', { userId: ctx.from.id, state: session.state });
        await ctx.reply('❌ Unknown state. Starting over.', createMainKeyboard());
        await sessions.clearSession(chatId);
    }
    
    timer.end();
  } catch (error) {
    logger.error('Failed to handle text message', { 
      userId: ctx.from.id, 
      sessionState: session.state,
      error: error.message 
    }, error);
    timer.end();
  }
});

// Handle quick note text
async function handleQuickNoteText(ctx, text) {
  const timer = logger.startTimer('save_quick_note');
  
  try {
    logger.debug('Saving quick note', { 
      userId: ctx.from.id, 
      textLength: text.length,
      hasHashtags: text.includes('#')
    });
    
    const apiTimer = logger.startTimer('quick_note_api');
    await sendToAPI('POST', '/notes/quick', { 
      body: text, 
      source: 'telegram' 
    });
    apiTimer.end();
    
    await sessions.clearSession(ctx.chat.id.toString());
    
    logger.info('Quick note saved via bot', {
      userId: ctx.from.id,
      username: ctx.from.username,
      textLength: text.length
    });
    
    await ctx.reply(
      `✅ *Quick Note Saved!*\n\n📝 "${text}"\n\n🏷️ Tagged with #quick`,
      {
        parse_mode: 'Markdown',
        ...createMainKeyboard()
      }
    );
    
    timer.end();
  } catch (error) {
    logger.error('Failed to save quick note', { userId: ctx.from.id, error: error.message }, error);
    await ctx.reply('❌ Failed to save note. Please try again.', createMainKeyboard());
    timer.end();
  }
}

// Handle new task text input
async function handleNewTaskText(ctx, text, session) {
  const timer = logger.startTimer('handle_task_text');
  const chatId = ctx.chat.id.toString();
  
  if (session.data.step === 'title') {
    logger.debug('Task title received', { userId: ctx.from.id, titleLength: text.length });
    
    try {
      // Got task title, ask for priority
      await sessions.updateSession(chatId, { 
        title: text.trim(),
        step: 'priority'
      });
      
      await ctx.reply(
        `📋 *Task:* "${text}"\n\n🎯 What's the priority?`,
        {
          parse_mode: 'Markdown',
          ...createTaskPriorityKeyboard()
        }
      );
      
      timer.end();
    } catch (error) {
      logger.error('Failed to handle task title', { userId: ctx.from.id, error: error.message }, error);
      timer.end();
    }
  }
}

// Handle new event text input
async function handleNewEventText(ctx, text, session) {
  const timer = logger.startTimer('handle_event_text');
  const chatId = ctx.chat.id.toString();
  
  if (session.data.step === 'title') {
    logger.debug('Event title received', { userId: ctx.from.id, titleLength: text.length });
    
    // For MVP, create 1-hour event starting in next hour
    const now = DateTime.now().setZone('Europe/Moscow');
    const nextHour = now.plus({ hours: 1 }).startOf('hour');
    const startTime = nextHour.toUTC().toISO();
    const endTime = nextHour.plus({ hours: 1 }).toUTC().toISO();
    
    try {
      const eventData = {
        title: text.trim(),
        startsAt: startTime,
        endsAt: endTime,
        allDay: false,
        reminders: [{
          minutesBefore: 5,
          channel: 'TELEGRAM'
        }]
      };
      
      const apiTimer = logger.startTimer('create_event_api');
      const result = await sendToAPI('POST', '/events', eventData);
      apiTimer.end();
      
      await sessions.clearSession(chatId);
      
      const formattedTime = nextHour.toFormat('HH:mm');
      
      logger.info('Event created via bot', {
        userId: ctx.from.id,
        eventId: result.event.id,
        title: text.trim(),
        startTime: formattedTime
      });
      
      await ctx.reply(
        `✅ *Event Created!*\n\n📅 ${text}\n⏰ Today at ${formattedTime} MSK\n🔔 5min reminder set\n\nEvent ID: \`${result.event.id}\``,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📅 New Event', 'new_event')],
            [Markup.button.callback('🏠 Main Menu', 'main_menu')]
          ])
        }
      );
      
      timer.end();
    } catch (error) {
      logger.error('Failed to create event via bot', { userId: ctx.from.id, error: error.message }, error);
      await ctx.reply('❌ Failed to create event. Please try again.', createMainKeyboard());
      timer.end();
    }
  }
}

// Save quick note confirmation
bot.action('save_quick_note', async (ctx) => {
  const timer = logger.startTimer('save_quick_note_confirmation');
  
  await ctx.answerCbQuery();
  const chatId = ctx.chat.id.toString();
  const session = await sessions.getSession(chatId);
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'save_quick_note_confirmed');
  
  if (session && session.state === 'confirm_quick_note') {
    await handleQuickNoteText(ctx, session.data.text);
  } else {
    logger.warn('Invalid session for quick note confirmation', { 
      userId: ctx.from.id, 
      sessionState: session?.state 
    });
    await ctx.reply('❌ Session expired.', createMainKeyboard());
  }
  
  timer.end();
});

// Settings placeholder
bot.action('settings', async (ctx) => {
  await ctx.answerCbQuery();
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'settings');
  
  try {
    await ctx.editMessageText(
      '⚙️ *Settings*\n\nSettings panel coming soon!\n\nFor now, you can:\n• Change notification preferences\n• Adjust timezone settings\n• Configure reminder defaults',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🏠 Main Menu', 'main_menu')]
        ])
      }
    );
  } catch (error) {
    logger.error('Failed to show settings', { userId: ctx.from.id, error: error.message }, error);
  }
});

// === ENHANCED ACTION HANDLERS - Add after existing handlers ===

// Today's Focus - Enhanced with work hours filtering
bot.action('today_focus', async (ctx) => {
  await handleTodaysFocus(ctx, logger, sessions);
});

// Top Tasks - Interactive task management
bot.action('top_tasks', async (ctx) => {
  await handleTopTasks(ctx, logger, sessions);
});

// Calendar View - Month ahead navigation
bot.action('calendar_view', async (ctx) => {
  await handleCalendarView(ctx, logger, sessions);
});

// Calendar navigation - Previous/Next month
bot.action(/^calendar_(prev|next)_(\d{4})_(\d{1,2})$/, async (ctx) => {
  const timer = logger.startTimer('calendar_navigation');
  
  await ctx.answerCbQuery();
  const direction = ctx.match[1];
  const year = parseInt(ctx.match[2]);
  const month = parseInt(ctx.match[3]);
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'calendar_navigation', { direction, year, month });
  
  try {
    let newYear = year;
    let newMonth = month;
    
    if (direction === 'prev') {
      newMonth -= 1;
      if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }
    } else {
      newMonth += 1;
      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }
    }
    
    const message = `📅 *Calendar View*\n\nSelect a date to view details:`;
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...createMonthCalendarKeyboard(newYear, newMonth)
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to navigate calendar', { userId: ctx.from.id, error: error.message }, error);
    timer.end();
  }
});

// Calendar day selection
bot.action(/^calendar_day_(.+)$/, async (ctx) => {
  const timer = logger.startTimer('calendar_day_view');
  
  await ctx.answerCbQuery();
  const dateStr = ctx.match[1];
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'calendar_day_view', { date: dateStr });
  
  try {
    const date = DateTime.fromISO(dateStr).setZone('Europe/Moscow');
    const today = DateTime.now().setZone('Europe/Moscow');
    
    // Get events for this day
    const dayStart = date.startOf('day').toUTC().toISO();
    const dayEnd = date.endOf('day').toUTC().toISO();
    
    const eventsResponse = await sendToAPI('GET', `/events?start=${dayStart}&end=${dayEnd}`);
    const events = eventsResponse || [];
    
    let message = `📅 *${date.toFormat('EEEE, MMMM d')}*\n`;
    
    if (date.hasSame(today, 'day')) {
      message += '(Today)\n';
    } else if (date.hasSame(today.plus({ days: 1 }), 'day')) {
      message += '(Tomorrow)\n';
    }
    
    message += '\n';
    
    if (events.length > 0) {
      message += '*📅 Events:*\n';
      events.forEach(event => {
        const time = event.allDay ? 'All day' : formatTime(event.startsAt);
        message += `• ${time} - ${event.title}\n`;
      });
      message += '\n';
    } else {
      message += '📭 No events scheduled\n\n';
    }
    
    // Show available time slots if it's today or future
    if (!date.startOf('day').diff(today.startOf('day')).as('days') < 0) {
      message += '💡 *Quick Actions:*\n';
      message += '• Add new event\n';
      message += '• View tasks for this day\n';
      message += '• Schedule existing task\n';
    }
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...createDayViewKeyboard(dateStr, events.length > 0)
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show day view', { userId: ctx.from.id, dateStr, error: error.message }, error);
    await ctx.editMessageText('❌ Failed to load day details.', createMainKeyboard());
    timer.end();
  }
});

// Task action menu
bot.action(/^task_action_(.+)$/, async (ctx) => {
  const taskId = ctx.match[1];
  await handleTaskAction(ctx, taskId, logger, sessions);
});

// Task scheduling - Quick schedule now
bot.action(/^task_schedule_(.+)$/, async (ctx) => {
  const timer = logger.startTimer('task_schedule_quick');
  
  await ctx.answerCbQuery();
  const taskId = ctx.match[1];
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'task_schedule_quick', { taskId });
  
  try {
    await ctx.editMessageText(
      '⏰ *Quick Schedule*\n\nHow long will this task take?',
      {
        parse_mode: 'Markdown',
        ...createEventDurationKeyboard(taskId)
      }
    );
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show duration selector', { userId: ctx.from.id, taskId, error: error.message }, error);
    timer.end();
  }
});

// Task scheduling - Schedule for later
bot.action(/^task_schedule_later_(.+)$/, async (ctx) => {
  const timer = logger.startTimer('task_schedule_later');
  
  await ctx.answerCbQuery();
  const taskId = ctx.match[1];
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'task_schedule_later', { taskId });
  
  try {
    const today = DateTime.now().setZone('Europe/Moscow').toISODate();
    
    await ctx.editMessageText(
      '📅 *Schedule for Later*\n\nSelect a time slot for today:',
      {
        parse_mode: 'Markdown',
        ...createTimeSlotKeyboard(taskId, today)
      }
    );
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show time slot selector', { userId: ctx.from.id, taskId, error: error.message }, error);
    timer.end();
  }
});

// Task to event conversion with duration
bot.action(/^schedule_task_(.+)_(\d+)$/, async (ctx) => {
  const timer = logger.startTimer('task_to_event_conversion');
  
  await ctx.answerCbQuery();
  const taskId = ctx.match[1];
  const durationMinutes = parseInt(ctx.match[2]);
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'task_to_event_conversion', { 
    taskId, 
    durationMinutes 
  });
  
  try {
    // Get task details
    const response = await sendToAPI('GET', `/tasks`);
    const task = response.tasks?.find(t => t.id === taskId);
    
    if (!task) {
      await ctx.editMessageText('❌ Task not found.', createMainKeyboard());
      return;
    }
    
    // Create event starting in next available hour
    const now = DateTime.now().setZone('Europe/Moscow');
    const startTime = now.plus({ hours: 1 }).startOf('hour');
    const endTime = startTime.plus({ minutes: durationMinutes });
    
    const eventData = {
      title: task.title,
      description: task.description,
      startsAt: startTime.toUTC().toISO(),
      endsAt: endTime.toUTC().toISO(),
      allDay: false,
      sourceTaskId: taskId,
      tags: task.tags || [],
      reminders: [{
        minutesBefore: 5,
        channel: 'TELEGRAM'
      }]
    };
    
    const eventResult = await sendToAPI('POST', '/events', eventData);
    
    // Update task status to SCHEDULED
    await sendToAPI('PATCH', `/tasks/${taskId}`, { status: 'SCHEDULED' });
    
    const formattedTime = startTime.toFormat('HH:mm');
    const durationText = durationMinutes < 60 ? 
      `${durationMinutes}min` : 
      `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? ` ${durationMinutes % 60}min` : ''}`;
    
    logger.info('Task converted to event', {
      userId: ctx.from.id,
      taskId: task.id,
      eventId: eventResult.event.id,
      startTime: formattedTime,
      duration: durationMinutes
    });
    
    await ctx.editMessageText(
      `✅ *Task Scheduled!*\n\n📋 ${task.title}\n⏰ Today at ${formattedTime}\n⏱️ Duration: ${durationText}\n\n🔔 You'll get a 5min reminder`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📅 View Calendar', callback_data: 'calendar_view' },
              { text: '📋 More Tasks', callback_data: 'top_tasks' }
            ],
            [
              { text: '🏠 Main Menu', callback_data: 'main_menu' }
            ]
          ]
        }
      }
    );
    
    timer.end();
  } catch (error) {
    logger.error('Failed to convert task to event', { 
      userId: ctx.from.id, 
      taskId, 
      durationMinutes, 
      error: error.message 
    }, error);
    
    await ctx.editMessageText(
      '❌ Failed to schedule task. Please try again.',
      createMainKeyboard()
    );
    
    timer.end();
  }
});

// Task scheduling at specific time
bot.action(/^schedule_task_(.+)_at_(.+)$/, async (ctx) => {
  const timer = logger.startTimer('task_schedule_at_time');
  
  await ctx.answerCbQuery();
  const taskId = ctx.match[1];
  const timeISO = ctx.match[2];
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'task_schedule_at_time', { 
    taskId, 
    timeISO 
  });
  
  try {
    // Get task details
    const response = await sendToAPI('GET', `/tasks`);
    const task = response.tasks?.find(t => t.id === taskId);
    
    if (!task) {
      await ctx.editMessageText('❌ Task not found.', createMainKeyboard());
      return;
    }
    
    // Use estimated time or default to 1 hour
    const durationMinutes = task.estimatedMinutes || 60;
    const startTime = DateTime.fromISO(timeISO);
    const endTime = startTime.plus({ minutes: durationMinutes });
    
    const eventData = {
      title: task.title,
      description: task.description,
      startsAt: startTime.toUTC().toISO(),
      endsAt: endTime.toUTC().toISO(),
      allDay: false,
      sourceTaskId: taskId,
      tags: task.tags || [],
      reminders: [{
        minutesBefore: 5,
        channel: 'TELEGRAM'
      }]
    };
    
    const eventResult = await sendToAPI('POST', '/events', eventData);
    
    // Update task status to SCHEDULED
    await sendToAPI('PATCH', `/tasks/${taskId}`, { status: 'SCHEDULED' });
    
    const formattedTime = startTime.toFormat('EEE, MMM d \'at\' HH:mm');
    
    logger.info('Task scheduled at specific time', {
      userId: ctx.from.id,
      taskId: task.id,
      eventId: eventResult.event.id,
      scheduledTime: formattedTime
    });
    
    await ctx.editMessageText(
      `✅ *Task Scheduled!*\n\n📋 ${task.title}\n⏰ ${formattedTime}\n⏱️ Duration: ${durationMinutes}min\n\n🔔 You'll get a 5min reminder`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📅 View Calendar', callback_data: 'calendar_view' },
              { text: '📋 More Tasks', callback_data: 'top_tasks' }
            ],
            [
              { text: '🏠 Main Menu', callback_data: 'main_menu' }
            ]
          ]
        }
      }
    );
    
    timer.end();
  } catch (error) {
    logger.error('Failed to schedule task at time', { 
      userId: ctx.from.id, 
      taskId, 
      timeISO, 
      error: error.message 
    }, error);
    
    await ctx.editMessageText(
      '❌ Failed to schedule task. Please try again.',
      createMainKeyboard()
    );
    
    timer.end();
  }
});

// Mark task as done
bot.action(/^task_done_(.+)$/, async (ctx) => {
  const timer = logger.startTimer('task_mark_done');
  
  await ctx.answerCbQuery();
  const taskId = ctx.match[1];
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'task_mark_done', { taskId });
  
  try {
    await sendToAPI('PATCH', `/tasks/${taskId}`, { status: 'DONE' });
    
    logger.info('Task marked as done', {
      userId: ctx.from.id,
      taskId
    });
    
    await ctx.editMessageText(
      '✅ *Task Completed!*\n\nGreat job! 🎉\n\nThe task has been marked as done.',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 More Tasks', callback_data: 'top_tasks' },
              { text: '🏠 Main Menu', callback_data: 'main_menu' }
            ]
          ]
        }
      }
    );
    
    timer.end();
  } catch (error) {
    logger.error('Failed to mark task as done', { userId: ctx.from.id, taskId, error: error.message }, error);
    await ctx.editMessageText('❌ Failed to update task.', createMainKeyboard());
    timer.end();
  }
});

// Work hours configuration
bot.action('work_hours', async (ctx) => {
  await handleWorkHours(ctx, logger, sessions);
});

// Work hours start time selection
bot.action(/^workhours_start_(\d+)$/, async (ctx) => {
  const timer = logger.startTimer('workhours_start_config');
  
  await ctx.answerCbQuery();
  const startHour = parseInt(ctx.match[1]);
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'workhours_start_config', { startHour });
  
  try {
    // Store in session for now - in production, save to database
    const chatId = ctx.chat.id.toString();
    let session = await sessions.getSession(chatId);
    
    if (!session) {
      session = await sessions.setSession(chatId, 'work_hours_config', {});
    }
    
    await sessions.updateSession(chatId, { workingHoursStart: startHour });
    
    await ctx.answerCbQuery(`✅ Work starts at ${startHour}:00`);
    
    // Refresh the work hours display
    await handleWorkHours(ctx, logger, sessions);
    
    timer.end();
  } catch (error) {
    logger.error('Failed to set work start hour', { userId: ctx.from.id, startHour, error: error.message }, error);
    timer.end();
  }
});

// Work hours end time selection
bot.action(/^workhours_end_(\d+)$/, async (ctx) => {
  const timer = logger.startTimer('workhours_end_config');
  
  await ctx.answerCbQuery();
  const endHour = parseInt(ctx.match[1]);
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'workhours_end_config', { endHour });
  
  try {
    const chatId = ctx.chat.id.toString();
    let session = await sessions.getSession(chatId);
    
    if (!session) {
      session = await sessions.setSession(chatId, 'work_hours_config', {});
    }
    
    await sessions.updateSession(chatId, { workingHoursEnd: endHour });
    
    await ctx.answerCbQuery(`✅ Work ends at ${endHour}:00`);
    
    // Refresh the work hours display
    await handleWorkHours(ctx, logger, sessions);
    
    timer.end();
  } catch (error) {
    logger.error('Failed to set work end hour', { userId: ctx.from.id, endHour, error: error.message }, error);
    timer.end();
  }
});

// No-op handler for display-only buttons
bot.action('noop', async (ctx) => {
  await ctx.answerCbQuery();
});

// Health check endpoint for monitoring
const port = process.env.BOT_PORT || 3002;
import { createServer } from 'http';

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, bot: 'running' }));
  } else if (req.url === '/logs/recent') {
    try {
      const lines = parseInt(new URL(req.url, `http://localhost:${port}`).searchParams.get('lines')) || 50;
      const logs = logger.getRecentLogs(lines);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ logs, total: logs.length }));
    } catch (error) {
      logger.error('Failed to get recent logs via HTTP', { error: error.message }, error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to get logs' }));
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(port, () => {
  logger.info('Bot health check server started', { port });
});

// Start periodic cleanup
startPeriodicCleanup();

// Start bot
bot.launch().then(() => {
  logger.info('NeuroBoost Telegram bot started successfully', {
    botUsername: bot.botInfo?.username,
    apiBase: API_BASE,
    environment: process.env.NODE_ENV || 'development'
  });
}).catch(err => {
  logger.error('Failed to start bot', { error: err.message }, err);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => {
  logger.info('Received SIGINT, shutting down bot gracefully');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down bot gracefully');
  bot.stop('SIGTERM');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in bot', { error: error.message }, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection in bot', { reason: String(reason), promise: String(promise) });
});