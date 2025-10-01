import { DateTime } from 'luxon';
import { sendToAPI } from '../utils/api-client.mjs';
import { createMainReplyKeyboard } from '../keyboards/index.mjs';
import { TIMEZONE } from '../constants.mjs';

export async function showStats(ctx) {
  const isCallback = ctx.updateType === 'callback_query';
  
  try {
    const today = DateTime.now().setZone(TIMEZONE).toISODate();
    const statsResponse = await sendToAPI('GET', `/stats/week?start=${today}`);
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
    
    if (isCallback) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '🔄 Refresh', callback_data: 'stats' } ],
            [ { text: '🏠 Main Menu', callback_data: 'main_menu' } ]
          ]
        }
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '🔄 Refresh', callback_data: 'stats' } ],
            [ { text: '🏠 Main Menu', callback_data: 'main_menu' } ]
          ]
        }
      });
    }
  } catch (error) {
    const errorMsg = '❌ Failed to load stats.';
    if (isCallback) {
      await ctx.editMessageText(errorMsg, {
        reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
      });
    } else {
      await ctx.reply(errorMsg, createMainReplyKeyboard());
    }
  }
}

export async function showPlanToday(ctx) {
  try {
    const todayStart = DateTime.now().setZone(TIMEZONE).startOf('day').toUTC().toISO();
    const todayEnd = DateTime.now().setZone(TIMEZONE).endOf('day').toUTC().toISO();
    
    const [eventsResponse, tasksResponse] = await Promise.all([
      sendToAPI('GET', `/events?start=${todayStart}&end=${todayEnd}`),
      sendToAPI('GET', '/tasks?status=TODO&priority=2')
    ]);
    
    const events = eventsResponse || [];
    const urgentTasks = tasksResponse.tasks || [];
    
    let message = '📅 *Today\'s Plan*\n\n';
    
    if (events.length > 0) {
      message += '*📅 Scheduled Events:*\n';
      events.forEach(event => {
        const startTime = DateTime.fromISO(event.startsAt).setZone(TIMEZONE).toFormat('HH:mm');
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
    
    message += `\n🕐 *Moscow Time:* ${DateTime.now().setZone(TIMEZONE).toFormat('HH:mm')}`;
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📋 New Task', callback_data: 'new_task' },
            { text: '📅 New Event', callback_data: 'new_event' }
          ],
          [
            { text: '🔄 Refresh', callback_data: 'plan_today' }
          ],
          [
            { text: '🏠 Main Menu', callback_data: 'main_menu' }
          ]
        ]
      }
    });
  } catch (error) {
    await ctx.editMessageText('❌ Failed to load today\'s plan.', {
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
    });
  }
}

export async function showTodaysFocus(ctx) {
  await ctx.reply('📅 Today\'s Focus view coming soon! Use /today for now.', createMainReplyKeyboard());
}

export async function showWeekView(ctx) {
  await ctx.reply('📅 Week view coming in v0.4.x!', createMainReplyKeyboard());
}