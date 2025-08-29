import { DateTime } from 'luxon';

// Format time for display (Moscow timezone)
export function formatTime(utcISOString) {
  const dt = DateTime.fromISO(utcISOString).setZone('Europe/Moscow');
  return dt.toFormat('HH:mm');
}

// Format date for display (Moscow timezone)
export function formatDate(utcISOString) {
  const dt = DateTime.fromISO(utcISOString).setZone('Europe/Moscow');
  const today = DateTime.now().setZone('Europe/Moscow');
  
  if (dt.hasSame(today, 'day')) {
    return 'Today';
  } else if (dt.hasSame(today.plus({ days: 1 }), 'day')) {
    return 'Tomorrow';
  } else if (dt.hasSame(today.minus({ days: 1 }), 'day')) {
    return 'Yesterday';
  } else {
    return dt.toFormat('MMM d');
  }
}

// Format datetime range for display
export function formatDateTimeRange(startUTC, endUTC) {
  const start = DateTime.fromISO(startUTC).setZone('Europe/Moscow');
  const end = DateTime.fromISO(endUTC).setZone('Europe/Moscow');
  
  const dateStr = formatDate(startUTC);
  const timeStr = `${start.toFormat('HH:mm')}–${end.toFormat('HH:mm')}`;
  
  return `${dateStr} ${timeStr}`;
}

// Format event for display
export function formatEvent(event) {
  const timeRange = formatDateTimeRange(event.startsAt, event.endsAt);
  let text = `📅 *${escapeMarkdown(event.title)}*\n⏰ ${timeRange}`;
  
  if (event.location) {
    text += `\n📍 ${escapeMarkdown(event.location)}`;
  }
  
  if (event.description) {
    const desc = event.description.length > 100 
      ? event.description.substring(0, 100) + '...' 
      : event.description;
    text += `\n💭 ${escapeMarkdown(desc)}`;
  }
  
  if (event.tags && event.tags.length > 0) {
    text += `\n🏷️ ${event.tags.map(tag => `#${tag}`).join(' ')}`;
  }
  
  return text;
}

// Format task for display
export function formatTask(task) {
  const priorityEmojis = ['🧊', '🔥', '⚡', '📌', '⏳', '💡'];
  const priorityNames = ['Buffer', 'Emergency', 'ASAP', 'Must today', 'Deadline soon', 'If possible'];
  
  const emoji = priorityEmojis[task.priority] || '❓';
  const priorityName = priorityNames[task.priority] || 'Unknown';
  
  let text = `${emoji} *${escapeMarkdown(task.title)}*\n🎯 Priority ${task.priority}: ${priorityName}`;
  
  if (task.description) {
    const desc = task.description.length > 100 
      ? task.description.substring(0, 100) + '...' 
      : task.description;
    text += `\n💭 ${escapeMarkdown(desc)}`;
  }
  
  if (task.estimatedMinutes) {
    text += `\n⏱️ ~${task.estimatedMinutes} min`;
  }
  
  if (task.dueDate) {
    const dueDate = formatDate(task.dueDate);
    text += `\n📅 Due: ${dueDate}`;
  }
  
  if (task.tags && task.tags.length > 0) {
    text += `\n🏷️ ${task.tags.map(tag => `#${tag}`).join(' ')}`;
  }
  
  return text;
}

// Format task list for display
export function formatTaskList(tasks, title = 'Tasks') {
  if (!tasks || tasks.length === 0) {
    return `📋 *${title}*\n\n_No tasks found_`;
  }
  
  let text = `📋 *${title}*\n`;
  
  // Group by priority
  const tasksByPriority = tasks.reduce((acc, task) => {
    if (!acc[task.priority]) acc[task.priority] = [];
    acc[task.priority].push(task);
    return acc;
  }, {});
  
  // Sort priorities (0-5)
  const priorityOrder = [1, 2, 0, 3, 4, 5]; // Emergency, ASAP, Buffer, Must today, Deadline soon, If possible
  
  for (const priority of priorityOrder) {
    const priorityTasks = tasksByPriority[priority];
    if (!priorityTasks) continue;
    
    const priorityEmojis = ['🧊', '🔥', '⚡', '📌', '⏳', '💡'];
    const priorityNames = ['Buffer', 'Emergency', 'ASAP', 'Must today', 'Deadline soon', 'If possible'];
    
    const emoji = priorityEmojis[priority];
    const name = priorityNames[priority];
    
    text += `\n${emoji} *${name}* (${priorityTasks.length})\n`;
    
    for (const task of priorityTasks.slice(0, 3)) { // Show max 3 per priority
      text += `• ${escapeMarkdown(task.title)}\n`;
    }
    
    if (priorityTasks.length > 3) {
      text += `... and ${priorityTasks.length - 3} more\n`;
    }
  }
  
  return text;
}

// Format event list for display
export function formatEventList(events, title = 'Events') {
  if (!events || events.length === 0) {
    return `📅 *${title}*\n\n_No events found_`;
  }
  
  let text = `📅 *${title}*\n`;
  
  // Group by date
  const eventsByDate = events.reduce((acc, event) => {
    const date = formatDate(event.startsAt);
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});
  
  for (const [date, dayEvents] of Object.entries(eventsByDate)) {
    text += `\n*${date}*\n`;
    
    // Sort by start time
    dayEvents.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
    
    for (const event of dayEvents) {
      const timeStr = event.allDay ? 'All day' : formatTime(event.startsAt);
      text += `• ${timeStr} - ${escapeMarkdown(event.title)}\n`;
    }
  }
  
  return text;
}

// Format weekly stats for display
export function formatWeekStats(stats) {
  const plannedHours = Math.round(stats.plannedMinutes / 60 * 10) / 10;
  const completedHours = Math.round(stats.completedMinutes / 60 * 10) / 10;
  const adherence = stats.adherencePct || 0;
  
  let adherenceEmoji = '🔴';
  if (adherence >= 80) adherenceEmoji = '🟢';
  else if (adherence >= 60) adherenceEmoji = '🟡';
  
  return `📊 *Week Stats*\n\n` +
    `⏱️ *Planned:* ${plannedHours}h\n` +
    `✅ *Completed:* ${completedHours}h\n` +
    `${adherenceEmoji} *Adherence:* ${adherence}%\n\n` +
    `📅 *Events:* ${stats.eventCount || 0}\n` +
    `💭 *Reflections:* ${stats.reflectionCount || 0}`;
}

// Format duration in human readable format
export function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  } else if (minutes < 1440) { // Less than 24 hours
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    let result = `${days}d`;
    if (hours > 0) result += ` ${hours}h`;
    return result;
  }
}

// Format relative time (ago/in)
export function formatRelativeTime(utcISOString) {
  const dt = DateTime.fromISO(utcISOString);
  const now = DateTime.now();
  const diff = dt.diff(now, 'minutes').minutes;
  
  if (Math.abs(diff) < 1) {
    return 'now';
  } else if (diff > 0) {
    // Future
    if (diff < 60) {
      return `in ${Math.round(diff)}m`;
    } else if (diff < 1440) {
      return `in ${Math.round(diff / 60)}h`;
    } else {
      return `in ${Math.round(diff / 1440)}d`;
    }
  } else {
    // Past
    const absDiff = Math.abs(diff);
    if (absDiff < 60) {
      return `${Math.round(absDiff)}m ago`;
    } else if (absDiff < 1440) {
      return `${Math.round(absDiff / 60)}h ago`;
    } else {
      return `${Math.round(absDiff / 1440)}d ago`;
    }
  }
}

// Format notification message
export function formatNotification(event, minutesBefore) {
  const eventTime = formatTime(event.startsAt);
  const eventDate = formatDate(event.startsAt);
  
  let message = `🔔 *Reminder*\n\n`;
  message += `📅 ${escapeMarkdown(event.title)}\n`;
  message += `⏰ ${eventDate} at ${eventTime}\n`;
  
  if (minutesBefore === 0) {
    message += `\n🚀 *Starting now!*`;
  } else {
    message += `\n⏳ Starting in ${minutesBefore} minutes`;
  }
  
  if (event.location) {
    message += `\n📍 ${escapeMarkdown(event.location)}`;
  }
  
  return message;
}

// Format reflection prompt
export function formatReflectionPrompt(event) {
  const timeRange = formatDateTimeRange(event.startsAt, event.endsAt);
  
  return `💭 *Reflection Time*\n\n` +
    `📅 ${escapeMarkdown(event.title)}\n` +
    `⏰ ${timeRange}\n\n` +
    `How did it go?`;
}

// Format quick note confirmation
export function formatQuickNoteConfirmation(note) {
  const truncatedNote = note.length > 200 ? note.substring(0, 200) + '...' : note;
  
  return `📝 *Quick Note*\n\n"${escapeMarkdown(truncatedNote)}"\n\n💡 Save this note?`;
}

// Escape markdown special characters
function escapeMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Format error message
export function formatError(error, context = '') {
  const contextStr = context ? ` (${context})` : '';
  return `❌ *Error${contextStr}*\n\nSomething went wrong. Please try again.`;
}

// Format success message
export function formatSuccess(message, details = '') {
  let text = `✅ *Success!*\n\n${message}`;
  if (details) {
    text += `\n\n${details}`;
  }
  return text;
}