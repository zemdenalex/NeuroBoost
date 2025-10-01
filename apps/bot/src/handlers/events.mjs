import { DateTime } from 'luxon';
import { sendToAPI } from '../utils/api-client.mjs';
import { formatTime, formatEvent } from '../utils/formatters.mjs';
import { createMainReplyKeyboard, createEventDurationKeyboard, createTimeSlotKeyboard } from '../keyboards/index.mjs';
import { startNewEventWizard, handleEventTitleInput, showEventSuccess } from '../wizards/index.mjs';
import { TIMEZONE } from '../constants.mjs';

export async function startNewEvent(ctx) {
  await startNewEventWizard(ctx, ctx.sessions, null, true);
}

export async function startNewEventForDate(ctx, date) {
  await startNewEventWizard(ctx, ctx.sessions, date, true);
}

export async function handleNewEventText(ctx, text, session) {
  if (session.data.step === 'title') {
    const result = await handleEventTitleInput(ctx, text, ctx.sessions);
    
    if (!result) {
      await ctx.reply('❌ Session expired. Please start over.', createMainReplyKeyboard());
      return;
    }
    
    try {
      const apiResult = await sendToAPI('POST', '/events', result.eventData);
      await showEventSuccess(ctx, result.eventData.title, result.formattedTime, result.formattedDate, apiResult.event.id);
    } catch (error) {
      await ctx.reply('❌ Failed to create event. Please try again.', createMainReplyKeyboard());
    }
  }
}

export async function showScheduleOptions(ctx, taskId) {
  await ctx.editMessageText('⏰ *Quick Schedule*\n\nHow long will this task take?', {
    parse_mode: 'Markdown',
    ...createEventDurationKeyboard(taskId)
  });
}

export async function showTimeSlots(ctx, taskId) {
  const now = DateTime.now().setZone(TIMEZONE);
  const today = now.toISODate();
  
  const workStart = now.set({ hour: 9, minute: 0 });
  const workEnd = now.set({ hour: 17, minute: 0 });
  
  const timeSlots = [];
  let currentTime = workStart;
  
  while (currentTime <= workEnd) {
    if (currentTime > now) {
      timeSlots.push({
        display: currentTime.toFormat('HH:mm'),
        iso: currentTime.toISO()
      });
    }
    currentTime = currentTime.plus({ hours: 1 });
  }
  
  await ctx.editMessageText('📅 *Schedule for Later*\n\nSelect a time slot for today:', {
    parse_mode: 'Markdown',
    ...createTimeSlotKeyboard(taskId, timeSlots)
  });
}

export async function scheduleTaskWithDuration(ctx, taskId, durationMinutes) {
  try {
    const response = await sendToAPI('GET', `/tasks`);
    const task = response.tasks?.find(t => t.id === taskId);
    
    if (!task) {
      await ctx.editMessageText('❌ Task not found.', createMainReplyKeyboard());
      return;
    }
    
    const now = DateTime.now().setZone(TIMEZONE);
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
  } catch (error) {
    await ctx.editMessageText('❌ Failed to schedule task. Please try again.', {
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
    });
  }
}

export async function scheduleTaskAtTime(ctx, taskId, timeISO) {
  try {
    const response = await sendToAPI('GET', `/tasks`);
    const task = response.tasks?.find(t => t.id === taskId);
    
    if (!task) {
      await ctx.editMessageText('❌ Task not found.', createMainReplyKeyboard());
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
  } catch (error) {
    await ctx.editMessageText('❌ Failed to schedule task. Please try again.', {
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
    });
  }
}