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
  createDayViewKeyboard,
  createMainKeyboardV04x
} from './keyboards.mjs';

import { createMainReplyKeyboardV04x } from './keyboards.mjs';

import {
  handleContextsMenu,
  handleSetContext,
  handleLayersMenu,
  handleToggleLayer,
  handleRoutinesMenu,
  handleActivateRoutine,
  handleTaskTree,
  handleSmartSuggestions,
  handleSetEnergyLevel,
  handleEnergySelection
} from './v04-handlers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const logger = createLogger('bot');
const raw = process.env.TELEGRAM_BOT_TOKEN || '';
const token = raw.trim();
if (!token) {
  logger.error('TELEGRAM_BOT_TOKEN is missing/empty after trim');
  process.exit(1);
}
if (!/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(token)) {
  logger.warn('TELEGRAM_BOT_TOKEN format looks unusual');
}
const bot = new Telegraf(token);
const prisma = new PrismaClient();
const sessions = new SessionManager(prisma);

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

logger.info('NeuroBoost Telegram bot initializing', {
  apiBase: API_BASE,
  botToken: process.env.TELEGRAM_BOT_TOKEN ? '***' : 'MISSING'
});

bot.catch((err, ctx) => {
  logger.error('Bot error', {
    updateType: ctx.updateType,
    userId: ctx.from?.id,
    username: ctx.from?.username,
    chatId: ctx.chat?.id,
    error: err.message
  }, err);
  
  ctx.reply('❌ Something went wrong. Please try again.', createMainReplyKeyboardV04x()).catch(() => {
    logger.error('Failed to send error message to user', { userId: ctx.from?.id });
  });
});

bot.start(async (ctx) => {
  const user = ctx.from;
  const chatId = ctx.chat.id.toString();
  
  logger.botInteraction(user.id, user.username, 'start', {
    firstName: user.first_name,
    lastName: user.last_name,
    languageCode: user.language_code
  });
  
  await sessions.clearSession(chatId);
  
  const welcome = `🧠 *NeuroBoost v0.4.x*\n\nHi ${user.first_name}! Your intelligent task management assistant.\n\n✨ *New v0.4.x Features:*\n• 🤖 Smart task suggestions based on energy & context\n• 🌍 Context-aware task filtering (@home, @office, etc.)\n• 🎨 Calendar layers for better organization\n• 🔄 Task routines and templates\n• 🌳 Task dependencies and subtasks\n• ⚡ Energy-based scheduling (1-5 scale)`;
  
  try {
    const keyboard = createMainReplyKeyboardV04x();
    await ctx.reply(welcome, {
      parse_mode: 'Markdown',
      reply_markup: keyboard.reply_markup
    });
    
    logger.info('v0.4.x enhanced menu shown', { userId: user.id, username: user.username });
  } catch (error) {
    logger.error('Failed to show enhanced start menu', { userId: user.id, error: error.message }, error);
  }
});

bot.action('main_menu', async (ctx) => {
  const timer = logger.startTimer('main_menu_action');
  
  await ctx.answerCbQuery();
  await sessions.clearSession(ctx.chat.id.toString());
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'main_menu');
  
  try {
    try {
      await ctx.deleteMessage();
    } catch (err) {
    }
    const keyboard = createMainReplyKeyboardV04x();
    await ctx.reply('🧠 *NeuroBoost v0.4.x* - What would you like to do?', {
      parse_mode: 'Markdown',
      reply_markup: keyboard.reply_markup
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show main menu', { userId: ctx.from.id, error: error.message }, error);
    timer.end();
  }
});

bot.hears('📋 Tasks', async (ctx) => {
  logger.botInteraction(ctx.from.id, ctx.from.username, 'tasks_text');
  await renderTasksList(ctx, 0, 'all');
});

bot.hears('📝 Quick Note', async (ctx) => {
  const chatId = ctx.chat.id.toString();
  logger.botInteraction(ctx.from.id, ctx.from.username, 'quick_note_text_start');
  try {
    await sessions.setSession(chatId, 'quick_note', {});
    await ctx.reply(
      '📝 *Quick Note*\n\nSend me your note. It will be tagged with #quick automatically.\n\n💡 *Tip:* Add your own #tags in the message!',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '❌ Cancel', callback_data: 'main_menu' } ]
          ]
        }
      }
    );
  } catch (error) {
    logger.error('Failed to start quick note via text', { userId: ctx.from.id, error: error.message }, error);
    await ctx.reply('❌ Failed to start quick note. Please try again.', createMainReplyKeyboardV04x());
  }
});

bot.hears('➕ New Task', async (ctx) => {
  const chatId = ctx.chat.id.toString();
  logger.botInteraction(ctx.from.id, ctx.from.username, 'new_task_text_start');
  try {
    await sessions.setSession(chatId, 'new_task', { step: 'title' });
    await ctx.reply(
      '📋 *New Task*\n\nWhat\'s the task title?\n\n💡 *Example:* "Review Q4 budget"',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '❌ Cancel', callback_data: 'main_menu' } ]
          ]
        }
      }
    );
  } catch (error) {
    logger.error('Failed to start new task via text', { userId: ctx.from.id, error: error.message }, error);
    await ctx.reply('❌ Failed to start new task. Please try again.', createMainReplyKeyboardV04x());
  }
});

bot.hears('📊 Stats', async (ctx) => {
  logger.botInteraction(ctx.from.id, ctx.from.username, 'stats_text');
  await showStats(ctx);
});

const unimplementedButtons = {
  '🤖 Smart Suggestions': '💡 Smart Suggestions are coming soon! For now, use /tasks to see your tasks.',
  '🌍 Contexts': '🌍 Context filtering is in development. Use /tasks to see all tasks.',
  '🔄 Routines': '🔄 Routine management is coming soon!',
  '🎨 Layers': '🎨 Calendar layers feature is in development.',
  '📅 Calendar': '📅 Calendar view is coming soon! Use /tasks for now.',
  '⚙️ Settings': '⚙️ Settings panel is under construction.'
};

for (const [buttonText, message] of Object.entries(unimplementedButtons)) {
  bot.hears(buttonText, async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'unimplemented_button', { button: buttonText });
    await ctx.reply(message, createMainReplyKeyboardV04x());
  });
}

bot.command('tasks', async (ctx) => {
  logger.botInteraction(ctx.from.id, ctx.from.username, 'tasks_command');
  await renderTasksList(ctx, 0, 'all');
});

bot.command('stats', async (ctx) => {
  logger.botInteraction(ctx.from.id, ctx.from.username, 'stats_command');
  await showStats(ctx);
});

bot.command('note', async (ctx) => {
  const chatId = ctx.chat.id.toString();
  logger.botInteraction(ctx.from.id, ctx.from.username, 'note_command');
  try {
    await sessions.setSession(chatId, 'quick_note', {});
    await ctx.reply(
      '📝 *Quick Note*\n\nSend me your note now.',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '❌ Cancel', callback_data: 'main_menu' } ]
          ]
        }
      }
    );
  } catch (error) {
    logger.error('Failed to start /note', { userId: ctx.from.id, error: error.message }, error);
    await ctx.reply('❌ Failed to start note. Try again.', createMainReplyKeyboardV04x());
  }
});

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
    logger.debug('No session, starting New Task wizard', { userId: ctx.from.id, textLength: text.length });
    
    try {
      await sessions.setSession(chatId, 'new_task', { title: text.trim(), step: 'priority' });
      
      await ctx.reply(
        `📋 *New Task*\n\n"${text.trim()}"\n\n🎯 What's the priority?`,
        {
          parse_mode: 'Markdown',
          ...createTaskPriorityKeyboard()
        }
      );
      
      timer.end();
      return;
    } catch (error) {
      logger.error('Failed to start task from free text', { userId: ctx.from.id, error: error.message }, error);
      await ctx.reply('❌ Failed to create task. Please try /tasks or use the menu.', createMainReplyKeyboardV04x());
      timer.end();
      return;
    }
  }
  
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
        await ctx.reply('❌ Session expired. Starting over.', createMainReplyKeyboardV04x());
        await sessions.clearSession(chatId);
    }
    
    timer.end();
  } catch (error) {
    logger.error('Failed to handle text in session', { userId: ctx.from.id, sessionState: session.state, error: error.message }, error);
    await ctx.reply('❌ Something went wrong. Please try again.', createMainReplyKeyboardV04x());
    await sessions.clearSession(chatId);
    timer.end();
  }
});

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
    return ctx.reply('❌ Session expired. Please start over.', createMainReplyKeyboardV04x());
  }
  
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
      createMainKeyboardV04x()
    );
    
    timer.end();
  }
});

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

bot.action('plan_today', async (ctx) => {
  const timer = logger.startTimer('plan_today');
  
  await ctx.answerCbQuery();
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'plan_today');
  
  try {
    const todayStart = DateTime.now().setZone('Europe/Moscow').startOf('day').toUTC().toISO();
    const todayEnd = DateTime.now().setZone('Europe/Moscow').endOf('day').toUTC().toISO();
    
    const apiTimer1 = logger.startTimer('get_events_api');
    const eventsResponse = await sendToAPI('GET', `/events?start=${todayStart}&end=${todayEnd}`);
    apiTimer1.end();
    
    const events = eventsResponse || [];
    
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
        ...createMainReplyKeyboardV04x()
      }
    );
    
    timer.end();
  } catch (error) {
    logger.error('Failed to save quick note', { userId: ctx.from.id, error: error.message }, error);
    await ctx.reply('❌ Failed to save note. Please try again.', createMainReplyKeyboardV04x());
    timer.end();
  }
}

async function handleNewTaskText(ctx, text, session) {
  const timer = logger.startTimer('handle_task_text');
  const chatId = ctx.chat.id.toString();
  
  if (session.data.step === 'title') {
    logger.debug('Task title received', { userId: ctx.from.id, titleLength: text.length });
    
    try {
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
      await ctx.reply('❌ Error processing task. Please try again.', createMainReplyKeyboardV04x());
      timer.end();
    }
  }
}

async function handleNewEventText(ctx, text, session) {
  const timer = logger.startTimer('handle_event_text');
  const chatId = ctx.chat.id.toString();
  
  if (session.data.step === 'title') {
    logger.debug('Event title received', { userId: ctx.from.id, titleLength: text.length });
    
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
      await ctx.reply('❌ Failed to create event. Please try again.', createMainReplyKeyboardV04x());
      timer.end();
    }
  }
}

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
    await ctx.reply('❌ Session expired.', createMainReplyKeyboardV04x());
  }
  
  timer.end();
});

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

bot.action('today_focus', async (ctx) => {
  await handleTodaysFocus(ctx, logger, sessions);
});

bot.action('top_tasks', async (ctx) => {
  await handleTopTasks(ctx, logger, sessions);
});

bot.action('calendar_view', async (ctx) => {
  await handleCalendarView(ctx, logger, sessions);
});

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

bot.action(/^calendar_day_(.+)$/, async (ctx) => {
  const timer = logger.startTimer('calendar_day_view');
  
  await ctx.answerCbQuery();
  const dateStr = ctx.match[1];
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'calendar_day_view', { date: dateStr });
  
  try {
    const date = DateTime.fromISO(dateStr).setZone('Europe/Moscow');
    const today = DateTime.now().setZone('Europe/Moscow');
    
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
      message += '🔭 No events scheduled\n\n';
    }
    
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

bot.action(/^task_action_(.+)$/, async (ctx) => {
  const taskId = ctx.match[1];
  await handleTaskActionEnhanced(ctx, taskId, logger, sessions);
});

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
    const response = await sendToAPI('GET', `/tasks`);
    const task = response.tasks?.find(t => t.id === taskId);
    
    if (!task) {
      await ctx.editMessageText('❌ Task not found.', createMainKeyboard());
      return;
    }
    
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
    const response = await sendToAPI('GET', `/tasks`);
    const task = response.tasks?.find(t => t.id === taskId);
    
    if (!task) {
      await ctx.editMessageText('❌ Task not found.', createMainKeyboard());
      return;
    }
    
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

bot.action('work_hours', async (ctx) => {
  await handleWorkHours(ctx, logger, sessions);
});

bot.action(/^workhours_start_(\d+)$/, async (ctx) => {
  const timer = logger.startTimer('workhours_start_config');
  
  await ctx.answerCbQuery();
  const startHour = parseInt(ctx.match[1]);
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'workhours_start_config', { startHour });
  
  try {
    const chatId = ctx.chat.id.toString();
    let session = await sessions.getSession(chatId);
    
    if (!session) {
      session = await sessions.setSession(chatId, 'work_hours_config', {});
    }
    
    await sessions.updateSession(chatId, { workingHoursStart: startHour });
    
    await ctx.answerCbQuery(`✅ Work starts at ${startHour}:00`);
    
    await handleWorkHours(ctx, logger, sessions);
    
    timer.end();
  } catch (error) {
    logger.error('Failed to set work start hour', { userId: ctx.from.id, startHour, error: error.message }, error);
    timer.end();
  }
});

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
    
    await handleWorkHours(ctx, logger, sessions);
    
    timer.end();
  } catch (error) {
    logger.error('Failed to set work end hour', { userId: ctx.from.id, endHour, error: error.message }, error);
    timer.end();
  }
});

bot.action('noop', async (ctx) => {
  await ctx.answerCbQuery();
});

bot.action('contexts_menu', async (ctx) => {
  await handleContextsMenu(ctx, logger, sessions);
});

bot.action(/^set_context_(.+)$/, async (ctx) => {
  const contextName = ctx.match[1];
  await handleSetContext(ctx, contextName, logger, sessions);
});

bot.action('tasks_by_context', async (ctx) => {
  await ctx.answerCbQuery();
  const chatId = ctx.chat.id.toString();
  const session = await sessions.getSession(chatId) || {};
  const currentContext = session.currentContext || '@anywhere';
  await handleSetContext(ctx, currentContext, logger, sessions);
});

bot.action('layers_menu', async (ctx) => {
  await handleLayersMenu(ctx, logger, sessions);
});

bot.action(/^toggle_layer_(.+)$/, async (ctx) => {
  const layerId = ctx.match[1];
  await handleToggleLayer(ctx, layerId, logger);
});

bot.action('layers_show_all', async (ctx) => {
  await ctx.answerCbQuery('Showing all layers');
  const layersResponse = await sendToAPI('GET', '/api/layers');
  for (const layer of layersResponse.layers || []) {
    if (!layer.isVisible) {
      await sendToAPI('PATCH', `/api/layers/${layer.id}/visibility`, { isVisible: true });
    }
  }
  await handleLayersMenu(ctx, logger, sessions);
});

bot.action('layers_hide_all', async (ctx) => {
  await ctx.answerCbQuery('Hiding all layers');
  const layersResponse = await sendToAPI('GET', '/api/layers');
  for (const layer of layersResponse.layers || []) {
    if (layer.isVisible) {
      await sendToAPI('PATCH', `/api/layers/${layer.id}/visibility`, { isVisible: false });
    }
  }
  await handleLayersMenu(ctx, logger, sessions);
});

bot.action('routines_menu', async (ctx) => {
  await handleRoutinesMenu(ctx, logger, sessions);
});

bot.action(/^activate_routine_(.+)$/, async (ctx) => {
  const routineId = ctx.match[1];
  await handleActivateRoutine(ctx, routineId, logger);
});

bot.action('routine_stats', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('📊 Routine statistics coming soon!', {
    reply_markup: {
      inline_keyboard: [
        [
          Markup.button.callback('⬅️ Back', 'routines_menu'),
          Markup.button.callback('🏠 Main Menu', 'main_menu')
        ]
      ]
    }
  });
});

bot.action('manage_routines', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('🔧 Routine management coming soon!', {
    reply_markup: {
      inline_keyboard: [
        [
          Markup.button.callback('⬅️ Back', 'routines_menu'),
          Markup.button.callback('🏠 Main Menu', 'main_menu')
        ]
      ]
    }
  });
});

bot.action(/^view_tree_(.+)$/, async (ctx) => {
  const taskId = ctx.match[1];
  await handleTaskTree(ctx, taskId, logger);
});

bot.action('smart_suggestions', async (ctx) => {
  await handleSmartSuggestions(ctx, logger, sessions);
});

bot.action('set_energy_level', async (ctx) => {
  await handleSetEnergyLevel(ctx, logger, sessions);
});

bot.action(/^energy_(\d)$/, async (ctx) => {
  const level = parseInt(ctx.match[1]);
  await handleEnergySelection(ctx, level, logger, sessions);
});

bot.action(/^schedule_by_energy_(high|low)$/, async (ctx) => {
  const energyType = ctx.match[1];
  await ctx.answerCbQuery(`Scheduling ${energyType} energy tasks`);

  const chatId = ctx.chat.id.toString();
  const session = await sessions.getSession(chatId) || {};
  const currentContext = session.currentContext || '@anywhere';

  const tasksResponse = await sendToAPI('GET', `/api/tasks/by-context?context=${encodeURIComponent(currentContext)}`);
  const tasks = tasksResponse.tasks || [];

  const energyRange = energyType === 'high' ? [4, 5] : [1, 2];
  const energyTasks = tasks.filter(t => t.energy && energyRange.includes(t.energy));

  if (energyTasks.length === 0) {
    await ctx.editMessageText(`No ${energyType} energy tasks found in ${currentContext}`, {
      reply_markup: {
        inline_keyboard: [
          [
            Markup.button.callback('⬅️ Back', `set_context_${currentContext}`),
            Markup.button.callback('🏠 Main Menu', 'main_menu')
          ]
        ]
      }
    });
    return;
  }

  let message = `⚡ *Schedule ${energyType === 'high' ? 'High' : 'Low'} Energy Tasks*\n\n`;
  message += `Found ${energyTasks.length} tasks:\n\n`;

  energyTasks.slice(0, 5).forEach((task, index) => {
    message += `${index + 1}. ${task.title}\n`;
    if (task.estimatedMinutes) {
      message += `   ⏱️ ~${task.estimatedMinutes}min\n`;
    }
  });

  const buttons = [
    [
      Markup.button.callback('⏰ Schedule All Now', `batch_schedule_${energyType}`),
      Markup.button.callback('📅 Schedule for Tomorrow', `batch_schedule_tomorrow_${energyType}`)
    ],
    [
      Markup.button.callback('⬅️ Back', `set_context_${currentContext}`),
      Markup.button.callback('🏠 Main Menu', 'main_menu')
    ]
  ];

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
});

async function handleTaskActionEnhanced(ctx, taskId, logger, sessions) {
  const timer = logger.startTimer('task_action_enhanced');

  await ctx.answerCbQuery();
  logger.botInteraction(ctx.from.id, ctx.from.username, 'task_action_enhanced', { taskId });

  try {
    const response = await sendToAPI('GET', `/tasks`);
    const task = response.tasks?.find(t => t.id === taskId);

    if (!task) {
      await ctx.editMessageText('❌ Task not found.', createMainKeyboardV04x());
      return;
    }

    const priorityNames = ['Buffer', 'Emergency', 'ASAP', 'Must today', 'Deadline soon', 'If possible'];
    const priorityEmojiList = ['🧊', '🔥', '⚡', '📌', '⏳', '💡'];
    const priorityEmoji = priorityEmojiList[task.priority] || '❓';

    let message = `${priorityEmoji} *Task Details*\n\n`;
    message += `📋 ${task.title}\n`;
    message += `🎯 Priority: ${task.priority} (${priorityNames[task.priority]})\n`;

    if (task.energy) {
      message += `⚡ Energy: ${'⚡'.repeat(task.energy)} (${task.energy}/5)\n`;
    }

    if (task.contexts && task.contexts.length > 0) {
      message += `🌍 Contexts: ${task.contexts.join(', ')}\n`;
    }

    if (task.parentTaskId) {
      message += `🌳 Part of a larger task\n`;
    }

    if (task.postponeCount > 0) {
      message += `🔄 Postponed: ${task.postponeCount} times\n`;
    }

    if (task.progressPercentage > 0) {
      const filled = Math.floor(task.progressPercentage / 10);
      const progressBar = '▓'.repeat(filled) + '░'.repeat(10 - filled);
      message += `📊 Progress: ${progressBar} ${task.progressPercentage}%\n`;
    }

    if (task.description) {
      const desc = task.description.length > 100 ? task.description.substring(0, 100) + '...' : task.description;
      message += `\n💭 ${desc}\n`;
    }

    if (task.estimatedMinutes) {
      message += `⏱️ Estimated: ${task.estimatedMinutes} minutes\n`;
    }

    if (task.dueDate) {
      const dueDate = DateTime.fromISO(task.dueDate).setZone('Europe/Moscow');
      message += `📅 Due: ${dueDate.toFormat('MMM d, HH:mm')}\n`;
    }

    if (task.tags && task.tags.length > 0) {
      message += `🏷️ ${task.tags.map(tag => '#' + tag).join(' ')}\n`;
    }

    logger.info('Enhanced task action menu shown', {
      userId: ctx.from.id,
      taskId: task.id,
      priority: task.priority,
      energy: task.energy,
      contexts: task.contexts
    });

    const buttons = [];

    buttons.push([
      Markup.button.callback('⏰ Schedule Now', `task_schedule_${taskId}`),
      Markup.button.callback('📅 Schedule Later', `task_schedule_later_${taskId}`)
    ]);

    buttons.push([
      Markup.button.callback('✅ Mark Done', `task_done_${taskId}`),
      Markup.button.callback('✏️ Edit', `task_edit_${taskId}`)
    ]);

    if (task.parentTaskId || (task.subtasks && task.subtasks.length > 0)) {
      buttons.push([
        Markup.button.callback('🌳 View Tree', `view_tree_${taskId}`),
        Markup.button.callback('📊 Update Progress', `update_progress_${taskId}`)
      ]);
    }

    buttons.push([
      Markup.button.callback('👁️ Hide Today', `task_hide_${taskId}`),
      Markup.button.callback('🗑️ Delete', `task_delete_${taskId}`)
    ]);

    buttons.push([
      Markup.button.callback('⬅️ Back', 'top_tasks'),
      Markup.button.callback('🏠 Main Menu', 'main_menu')
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });

    timer.end();
  } catch (error) {
    logger.error('Failed to show enhanced task action', { 
      userId: ctx.from.id, 
      taskId, 
      error: error.message 
    }, error);
    await ctx.editMessageText('❌ Failed to load task details.', createMainKeyboardV04x());
    timer.end();
  }
}

async function renderTasksList(ctx, page = 0, filter = 'all') {
  const timer = logger.startTimer('tasks_list');

  try {
    const tasksResponse = await sendToAPI('GET', '/tasks?status=TODO');
    let tasks = tasksResponse.tasks || [];

    if (filter !== 'all') {
      const pr = parseInt(filter);
      tasks = tasks.filter(t => t.priority === pr);
    }

    tasks.sort((a, b) => a.priority - b.priority || (a.createdAt || '').localeCompare(b.createdAt || ''));

    const total = tasks.length;
    const pageSize = 10;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
    const currentPage = Math.max(0, Math.min(page, totalPages - 1));
    const startIndex = currentPage * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    const pageTasks = tasks.slice(startIndex, endIndex);

    const priorityNames = ['⚫ Someday', '🔴 Emergency', '🟠 High', '🟡 Medium', '🟢 Low', '⚪ Very Low'];
    const priorityEmojis = ['⚫', '🔴', '🟠', '🟡', '🟢', '⚪'];

    let message = `📋 *Tasks* (${total} total`;
    if (filter !== 'all') {
      message += ` — ${priorityNames[parseInt(filter)]}`;
    }
    message += `)\nPage ${currentPage + 1}/${totalPages}\n\n`;

    if (total === 0) {
      message += '✨ No tasks found!\n';
    } else {
      let lastPriority = null;
      for (const task of pageTasks) {
        if (task.priority !== lastPriority) {
          lastPriority = task.priority;
          const totalInThisPriority = tasks.filter(t => t.priority === task.priority).length;
          message += `\n${priorityEmojis[task.priority]} *${priorityNames[task.priority]}* (${totalInThisPriority})\n`;
        }
        const title = task.title.length > 35 ? task.title.substring(0, 35) + '…' : task.title;
        message += `• ${title}\n`;
      }
    }

    const buttons = [];

    if (pageTasks.length > 0) {
      for (let i = 0; i < Math.min(5, pageTasks.length); i++) {
        const task = pageTasks[i];
        const title = task.title.length > 25 ? task.title.substring(0, 25) + '…' : task.title;
        buttons.push([
          { text: `${priorityEmojis[task.priority]} ${title}`, callback_data: `task_action_${task.id}` }
        ]);
      }
    }

    const navRow = [];
    if (currentPage > 0) {
      navRow.push({ text: '⬅️ Prev', callback_data: `tasks_page_${currentPage - 1}_${filter}` });
    }
    if (endIndex < total) {
      navRow.push({ text: '➡️ Next', callback_data: `tasks_page_${currentPage + 1}_${filter}` });
    }
    if (navRow.length > 0) {
      buttons.push(navRow);
    }

    buttons.push([
      { text: '🎯 Filter', callback_data: 'tasks_filter' },
      { text: '➕ New Task', callback_data: 'new_task' }
    ]);

    buttons.push([
      { text: '🏠 Main Menu', callback_data: 'main_menu' }
    ]);

    if (ctx.updateType === 'callback_query') {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    }

    timer.end();
  } catch (error) {
    logger.error('Failed to render tasks list', { userId: ctx.from?.id, error: error.message }, error);
    if (ctx.updateType === 'callback_query') {
      await ctx.editMessageText('❌ Failed to load tasks.', {
        reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
      });
    } else {
      await ctx.reply('❌ Failed to load tasks. Please try again.', {
        reply_markup: createMainReplyKeyboardV04x().reply_markup
      });
    }
    timer.end();
  }
}

async function showTasksFilterMenu(ctx) {
  await ctx.answerCbQuery();
  const priorityNames = ['⚫ Someday', '🔴 Emergency', '🟠 High', '🟡 Medium', '🟢 Low', '⚪ Very Low'];
  const filterButtons = [];
  
  for (let i = 0; i < 6; i += 2) {
    const row = [];
    row.push({ text: priorityNames[i], callback_data: `tasks_filter_${i}` });
    if (i + 1 < 6) row.push({ text: priorityNames[i + 1], callback_data: `tasks_filter_${i + 1}` });
    filterButtons.push(row);
  }
  
  filterButtons.push([
    { text: '📋 All', callback_data: 'tasks_filter_all' },
    { text: '❌ Cancel', callback_data: 'tasks_page_0_all' }
  ]);

  await ctx.editMessageText('🎯 *Filter Tasks by Priority*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: filterButtons
    }
  });
}

bot.action(/^tasks_page_(\d+)_(.+)$/, async (ctx) => {
  const page = parseInt(ctx.match[1]);
  const filter = ctx.match[2];
  await renderTasksList(ctx, page, filter);
});

bot.action('tasks_filter', async (ctx) => {
  await showTasksFilterMenu(ctx);
});

bot.action(/^tasks_filter_(.+)$/, async (ctx) => {
  const filter = ctx.match[1];
  await renderTasksList(ctx, 0, filter);
});

async function showStats(ctx) {
  const timer = logger.startTimer('stats_flow_text');
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
    logger.info('Stats shown (text)', {
      userId: ctx.from.id,
      plannedHours,
      completedHours,
      adherence,
      eventCount: stats.eventCount
    });
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [ { text: '🔄 Refresh', callback_data: 'stats' } ],
          [ { text: '🏠 Main Menu', callback_data: 'main_menu' } ]
        ]
      }
    });
    timer.end();
  } catch (error) {
    logger.error('Failed to show stats via text', { userId: ctx.from.id, error: error.message }, error);
    await ctx.reply('❌ Failed to load stats.', {
      reply_markup: createMainReplyKeyboardV04x().reply_markup
    });
    timer.end();
  }
}

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

startPeriodicCleanup();

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