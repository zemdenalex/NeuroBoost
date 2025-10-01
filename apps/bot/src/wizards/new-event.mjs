import { DateTime } from 'luxon';
import { createMainReplyKeyboard } from '../keyboards/index.mjs';
import { TIMEZONE } from '../constants.mjs';

export async function startNewEventWizard(ctx, sessions, date = null, isInline = false) {
  const chatId = ctx.chat.id.toString();
  
  await sessions.setSession(chatId, 'new_event', { 
    step: 'title',
    date: date || DateTime.now().setZone(TIMEZONE).toISODate()
  });
  
  const message = '📅 *New Event*\n\nWhat\'s the event title?\n\n💡 *Example:* "Team standup"';
  
  if (isInline) {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Cancel', callback_data: 'main_menu' }]
        ]
      }
    });
  } else {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Cancel', callback_data: 'main_menu' }]
        ]
      }
    });
  }
}

export async function handleEventTitleInput(ctx, text, sessions) {
  const chatId = ctx.chat.id.toString();
  const session = await sessions.getSession(chatId);
  
  if (!session || session.state !== 'new_event') {
    return null;
  }
  
  const now = DateTime.now().setZone(TIMEZONE);
  const targetDate = session.data.date 
    ? DateTime.fromISO(session.data.date).setZone(TIMEZONE)
    : now;
  
  const nextHour = targetDate.hasSame(now, 'day')
    ? now.plus({ hours: 1 }).startOf('hour')
    : targetDate.set({ hour: 9, minute: 0 });
  
  const eventData = {
    title: text.trim(),
    startsAt: nextHour.toUTC().toISO(),
    endsAt: nextHour.plus({ hours: 1 }).toUTC().toISO(),
    allDay: false,
    reminders: [{
      minutesBefore: 5,
      channel: 'TELEGRAM'
    }]
  };
  
  await sessions.clearSession(chatId);
  
  return {
    eventData,
    formattedTime: nextHour.toFormat('HH:mm'),
    formattedDate: nextHour.toFormat('EEE, MMM d')
  };
}

export async function showEventSuccess(ctx, title, formattedTime, formattedDate, eventId) {
  await ctx.reply(
    `✅ *Event Created!*\n\n📅 ${title}\n⏰ ${formattedDate} at ${formattedTime} MSK\n🔔 5min reminder set\n\nEvent ID: \`${eventId}\``,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📅 New Event', callback_data: 'new_event' },
            { text: '🏠 Main Menu', callback_data: 'main_menu' }
          ]
        ]
      }
    }
  );
}

export async function cancelEventWizard(ctx, sessions) {
  const chatId = ctx.chat.id.toString();
  await sessions.clearSession(chatId);
  
  await ctx.reply(
    '❌ Event creation cancelled.',
    createMainReplyKeyboard()
  );
}