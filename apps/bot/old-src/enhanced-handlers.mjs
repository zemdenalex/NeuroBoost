// apps/bot/src/enhanced-handlers.mjs - New enhanced bot functionality
import { DateTime } from 'luxon';
import { 
  createMainKeyboard, 
  createMonthCalendarKeyboard,
  createTaskActionKeyboard,
  createEventDurationKeyboard,
  createTimeSlotKeyboard,
  createWorkHoursKeyboard,
  createWorkDaysKeyboard,
  createDayViewKeyboard,
  NOOP_CALLBACK
} from './keyboards.mjs';
import { sendToAPI, createQuickEvent, getTodayEvents, getUrgentTasks } from './api-client.mjs';
import { formatTask, formatEvent, formatTime, formatDate } from './formatters.mjs';

// === TODAY'S FOCUS - Enhanced view with top tasks by priority ===
export async function handleTodaysFocus(ctx, logger, sessions) {
  const timer = logger.startTimer('todays_focus');
  
  await ctx.answerCbQuery();
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'todays_focus');
  
  try {
    const now = DateTime.now().setZone('Europe/Moscow');
    const todayStart = now.startOf('day').toUTC().toISO();
    const todayEnd = now.endOf('day').toUTC().toISO();
    
    // Get today's events and top priority tasks in parallel
    const [eventsResponse, tasksResponse, userSettings] = await Promise.all([
      sendToAPI('GET', `/events?start=${todayStart}&end=${todayEnd}`),
      sendToAPI('GET', '/tasks?status=TODO'),
      getUserSettings() // We'll implement this
    ]);
    
    const events = eventsResponse || [];
    const allTasks = tasksResponse.tasks || [];
    
    // Filter tasks for work hours if enabled
    const visibleTasks = filterTasksForWorkHours(allTasks, now, userSettings);
    
    // Get top 5 tasks by priority (lower number = higher priority)
    const topTasks = visibleTasks
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5);
    
    let message = `🎯 *Today's Focus* - ${now.toFormat('EEE, MMM d')}\n\n`;
    
    // Show current time and work status
    const isWorkHours = isCurrentlyWorkHours(now, userSettings);
    message += `🕐 ${now.toFormat('HH:mm')} MSK ${isWorkHours ? '(Work Time)' : '(Free Time)'}\n\n`;
    
    // Today's events summary
    if (events.length > 0) {
      message += `📅 *Today's Events:* ${events.length}\n`;
      const nextEvent = events.find(e => new Date(e.startsAt) > new Date());
      if (nextEvent) {
        const nextTime = formatTime(nextEvent.startsAt);
        message += `⏰ Next: ${nextTime} - ${nextEvent.title}\n`;
      }
      message += '\n';
    }
    
    // Top priority tasks
    if (topTasks.length > 0) {
      message += '*🎯 Priority Tasks:*\n';
      
      topTasks.forEach((task, index) => {
        const priorityEmojis = ['🧊', '🔥', '⚡', '📌', '⏳', '💡'];
        const emoji = priorityEmojis[task.priority] || '❓';
        const truncatedTitle = task.title.length > 30 ? 
          task.title.substring(0, 30) + '...' : task.title;
        
        message += `${emoji} ${truncatedTitle}\n`;
        
        // Show estimated time if available
        if (task.estimatedMinutes) {
          message += `   ⏱️ ~${task.estimatedMinutes}min\n`;
        }
      });
    } else {
      message += '✨ No priority tasks - you\'re all caught up!\n';
    }
    
    // Work hours info
    if (userSettings && userSettings.workingHoursStart) {
      message += `\n⏰ *Work Hours:* ${userSettings.workingHoursStart}:00-${userSettings.workingHoursEnd}:00`;
    }
    
    logger.info('Today\'s focus shown', {
      userId: ctx.from.id,
      eventsCount: events.length,
      tasksCount: topTasks.length,
      isWorkHours
    });
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📋 View All Tasks', callback_data: 'top_tasks' },
            { text: '📅 Today\'s Events', callback_data: 'today_events' }
          ],
          [
            { text: '➕ Quick Task', callback_data: 'new_task' },
            { text: '📅 New Event', callback_data: 'new_event' }
          ],
          [
            { text: '🔄 Refresh', callback_data: 'today_focus' },
            { text: '🏠 Main Menu', callback_data: 'main_menu' }
          ]
        ]
      }
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show today\'s focus', { userId: ctx.from.id, error: error.message }, error);
    await ctx.editMessageText('❌ Failed to load today\'s focus. Please try again.', createMainKeyboard());
    timer.end();
  }
}

// === TOP TASKS - Interactive task list with actions ===
export async function handleTopTasks(ctx, logger, sessions) {
  const timer = logger.startTimer('top_tasks');
  
  await ctx.answerCbQuery();
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'top_tasks');
  
  try {
    const tasksResponse = await sendToAPI('GET', '/tasks?status=TODO');
    const allTasks = tasksResponse.tasks || [];
    
    // Get user settings for work hours filtering
    const userSettings = await getUserSettings();
    const now = DateTime.now().setZone('Europe/Moscow');
    const visibleTasks = filterTasksForWorkHours(allTasks, now, userSettings);
    
    // Group tasks by priority
    const tasksByPriority = visibleTasks.reduce((acc, task) => {
      if (!acc[task.priority]) acc[task.priority] = [];
      acc[task.priority].push(task);
      return acc;
    }, {});
    
    let message = '📋 *Your Tasks*\n\n';
    
    if (visibleTasks.length === 0) {
      message += '✨ No tasks visible right now!\n';
      if (!isCurrentlyWorkHours(now, userSettings)) {
        message += '\n💡 _Some tasks may be hidden outside work hours_';
      }
    } else {
      const priorityOrder = [1, 2, 0, 3, 4, 5]; // Emergency, ASAP, Buffer, Must today, Deadline, If possible
      const priorityNames = ['Buffer', 'Emergency', 'ASAP', 'Must today', 'Deadline soon', 'If possible'];
      const priorityEmojis = ['🧊', '🔥', '⚡', '📌', '⏳', '💡'];
      
      for (const priority of priorityOrder) {
        const tasks = tasksByPriority[priority];
        if (!tasks || tasks.length === 0) continue;
        
        message += `${priorityEmojis[priority]} *${priorityNames[priority]}* (${tasks.length})\n`;
        
        // Show first 3 tasks with buttons
        tasks.slice(0, 3).forEach((task, index) => {
          const truncatedTitle = task.title.length > 25 ? 
            task.title.substring(0, 25) + '...' : task.title;
          message += `• ${truncatedTitle}\n`;
        });
        
        if (tasks.length > 3) {
          message += `... and ${tasks.length - 3} more\n`;
        }
        message += '\n';
      }
    }
    
    // Create interactive buttons for top tasks
    const buttons = [];
    const topTasks = visibleTasks
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 6);
    
    for (let i = 0; i < topTasks.length; i += 2) {
      const task1 = topTasks[i];
      const task2 = topTasks[i + 1];
      
      const row = [];
      
      const title1 = task1.title.length > 15 ? task1.title.substring(0, 15) + '...' : task1.title;
      row.push({ text: `${getPriorityEmoji(task1.priority)} ${title1}`, callback_data: `task_action_${task1.id}` });
      
      if (task2) {
        const title2 = task2.title.length > 15 ? task2.title.substring(0, 15) + '...' : task2.title;
        row.push({ text: `${getPriorityEmoji(task2.priority)} ${title2}`, callback_data: `task_action_${task2.id}` });
      }
      
      buttons.push(row);
    }
    
    buttons.push([
      { text: '➕ New Task', callback_data: 'new_task' },
      { text: '🔄 Refresh', callback_data: 'top_tasks' }
    ]);
    
    buttons.push([
      { text: '⚙️ Work Hours', callback_data: 'work_hours' },
      { text: '🏠 Main Menu', callback_data: 'main_menu' }
    ]);
    
    logger.info('Top tasks shown', {
      userId: ctx.from.id,
      totalTasks: allTasks.length,
      visibleTasks: visibleTasks.length,
      topTasksShown: Math.min(6, topTasks.length)
    });
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show top tasks', { userId: ctx.from.id, error: error.message }, error);
    await ctx.editMessageText('❌ Failed to load tasks. Please try again.', createMainKeyboard());
    timer.end();
  }
}

// === CALENDAR VIEW - Month ahead navigation ===
export async function handleCalendarView(ctx, logger, sessions) {
  const timer = logger.startTimer('calendar_view');
  
  await ctx.answerCbQuery();
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'calendar_view');
  
  try {
    const now = DateTime.now().setZone('Europe/Moscow');
    const year = now.year;
    const month = now.month;
    
    const message = `📅 *Calendar View*\n\nSelect a date to view details:`;
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...createMonthCalendarKeyboard(year, month)
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show calendar view', { userId: ctx.from.id, error: error.message }, error);
    timer.end();
  }
}

// === TASK ACTIONS - Individual task management ===
export async function handleTaskAction(ctx, taskId, logger, sessions) {
  const timer = logger.startTimer('task_action');
  
  await ctx.answerCbQuery();
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'task_action', { taskId });
  
  try {
    // Get task details
    const response = await sendToAPI('GET', `/tasks`);
    const task = response.tasks?.find(t => t.id === taskId);
    
    if (!task) {
      await ctx.editMessageText('❌ Task not found.', createMainKeyboard());
      return;
    }
    
    const priorityNames = ['Buffer', 'Emergency', 'ASAP', 'Must today', 'Deadline soon', 'If possible'];
    const priorityEmoji = getPriorityEmoji(task.priority);
    
    let message = `${priorityEmoji} *Task Details*\n\n`;
    message += `📋 ${task.title}\n`;
    message += `🎯 Priority: ${task.priority} (${priorityNames[task.priority]})\n`;
    
    if (task.description) {
      const desc = task.description.length > 100 ? 
        task.description.substring(0, 100) + '...' : task.description;
      message += `💭 ${desc}\n`;
    }
    
    if (task.estimatedMinutes) {
      message += `⏱️ Estimated: ${task.estimatedMinutes} minutes\n`;
    }
    
    if (task.dueDate) {
      const dueDate = formatDate(task.dueDate);
      message += `📅 Due: ${dueDate}\n`;
    }
    
    if (task.tags && task.tags.length > 0) {
      message += `🏷️ ${task.tags.map(tag => `#${tag}`).join(' ')}\n`;
    }
    
    logger.info('Task action menu shown', {
      userId: ctx.from.id,
      taskId: task.id,
      priority: task.priority
    });
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...createTaskActionKeyboard(taskId)
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show task action', { userId: ctx.from.id, taskId, error: error.message }, error);
    await ctx.editMessageText('❌ Failed to load task details.', createMainKeyboard());
    timer.end();
  }
}

// === WORK HOURS CONFIGURATION ===
export async function handleWorkHours(ctx, logger, sessions) {
  const timer = logger.startTimer('work_hours_config');
  
  await ctx.answerCbQuery();
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'work_hours_config');
  
  try {
    const userSettings = await getUserSettings();
    
    const startHour = userSettings?.workingHoursStart || 9;
    const endHour = userSettings?.workingHoursEnd || 17;
    const workDays = userSettings?.workingDays || ['mon', 'tue', 'wed', 'thu', 'fri'];
    
    let message = '⏰ *Work Hours Configuration*\n\n';
    message += `🕘 Start: ${startHour}:00\n`;
    message += `🕕 End: ${endHour}:00\n`;
    message += `📅 Days: ${workDays.join(', ')}\n\n`;
    message += '💡 Tasks are filtered based on these settings.\n';
    message += 'Only relevant tasks show during work hours.';
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...createWorkHoursKeyboard()
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show work hours config', { userId: ctx.from.id, error: error.message }, error);
    timer.end();
  }
}

// === HELPER FUNCTIONS ===

// Get user settings (with defaults)
async function getUserSettings() {
  try {
    // For MVP, return default settings
    // In production, this would fetch from database
    return {
      workingHoursStart: 9,
      workingHoursEnd: 17,
      workingDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      defaultTimezone: 'Europe/Moscow'
    };
  } catch (error) {
    console.error('Failed to get user settings:', error);
    return null;
  }
}

// Check if current time is within work hours
function isCurrentlyWorkHours(dateTime, userSettings) {
  if (!userSettings) return true;
  
  const hour = dateTime.hour;
  const dayName = dateTime.toFormat('ccc').toLowerCase();
  
  const isWorkDay = userSettings.workingDays.includes(dayName);
  const isWorkTime = hour >= userSettings.workingHoursStart && hour < userSettings.workingHoursEnd;
  
  return isWorkDay && isWorkTime;
}

// Filter tasks based on work hours and visibility rules
function filterTasksForWorkHours(tasks, currentTime, userSettings) {
  if (!userSettings) return tasks;
  
  const isWorkHours = isCurrentlyWorkHours(currentTime, userSettings);
  
  // For now, show all tasks during work hours, but can be enhanced
  // to filter based on task categories or tags
  return tasks.filter(task => {
    // Always show emergency and ASAP tasks
    if (task.priority <= 2) return true;
    
    // During work hours, show work-related tasks
    if (isWorkHours) {
      // Show tasks that don't have 'personal' or 'home' tags
      const personalTags = ['personal', 'home', 'family', 'leisure'];
      const hasPersonalTag = task.tags?.some(tag => 
        personalTags.includes(tag.toLowerCase())
      );
      return !hasPersonalTag;
    } else {
      // Outside work hours, show personal tasks and low-priority tasks
      return true;
    }
  });
}

// Get priority emoji
function getPriorityEmoji(priority) {
  const priorityEmojis = ['🧊', '🔥', '⚡', '📌', '⏳', '💡'];
  return priorityEmojis[priority] || '❓';
}

// Convert day name to number for database storage
function dayNameToNumber(dayName) {
  const dayMap = {
    'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 
    'fri': 5, 'sat': 6, 'sun': 0
  };
  return dayMap[dayName.toLowerCase()];
}

// Convert day number to name
function dayNumberToName(dayNumber) {
  const nameMap = {
    0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed',
    4: 'thu', 5: 'fri', 6: 'sat'
  };
  return nameMap[dayNumber];
}