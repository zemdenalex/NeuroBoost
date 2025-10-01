import { DateTime } from 'luxon';
import { sendToAPI } from '../utils/api-client.mjs';
import { formatTime } from '../utils/formatters.mjs';
import { createMonthCalendarKeyboard, createDayViewKeyboard, createMainReplyKeyboard } from '../keyboards/index.mjs';
import { TIMEZONE } from '../constants.mjs';

export async function showCalendar(ctx) {
  const isCallback = ctx.updateType === 'callback_query';
  const now = DateTime.now().setZone(TIMEZONE);
  const year = now.year;
  const month = now.month;
  
  const message = `📅 *Calendar View*\n\nSelect a date to view details:`;
  
  try {
    if (isCallback) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...createMonthCalendarKeyboard(year, month)
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...createMonthCalendarKeyboard(year, month)
      });
    }
  } catch (error) {
    const errorMsg = '❌ Failed to load calendar.';
    if (isCallback) {
      await ctx.editMessageText(errorMsg, {
        reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
      });
    } else {
      await ctx.reply(errorMsg, createMainReplyKeyboard());
    }
  }
}

export async function navigateCalendar(ctx, direction, year, month) {
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
}

export async function showDayView(ctx, dateStr) {
  try {
    const date = DateTime.fromISO(dateStr).setZone(TIMEZONE);
    const today = DateTime.now().setZone(TIMEZONE);
    
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
  } catch (error) {
    await ctx.editMessageText('❌ Failed to load day details.', {
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
    });
  }
}

export async function showDayTasks(ctx, date) {
  await ctx.editMessageText('📋 Day tasks view coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: `calendar_day_${date}` }]
      ]
    }
  });
}

export async function showDayEvents(ctx, date) {
  await ctx.editMessageText('📅 Day events detail view coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: `calendar_day_${date}` }]
      ]
    }
  });
}

export async function showDayStats(ctx, date) {
  await ctx.editMessageText('📊 Day stats coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: `calendar_day_${date}` }]
      ]
    }
  });
}