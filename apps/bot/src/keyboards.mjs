// apps/bot/src/keyboards.mjs - Enhanced with calendar navigation
import { Markup } from 'telegraf';
import { DateTime } from 'luxon';

// Main menu keyboard - enhanced with better today view
export function createMainKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📅 Today\'s Focus', 'today_focus'),
      Markup.button.callback('📋 Top Tasks', 'top_tasks')
    ],
    [
      Markup.button.callback('📝 Quick Note', 'quick_note'),
      Markup.button.callback('➕ New Task', 'new_task')
    ],
    [
      Markup.button.callback('🗓️ Calendar View', 'calendar_view'),
      Markup.button.callback('📊 Stats', 'stats')
    ],
    [
      Markup.button.callback('⚙️ Work Hours', 'work_hours'),
      Markup.button.callback('⚙️ Settings', 'settings')
    ]
  ]);
}

// Task priority selection keyboard (existing)
export function createTaskPriorityKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔥 1: Emergency', 'task_priority_1'),
      Markup.button.callback('⚡ 2: ASAP', 'task_priority_2')
    ],
    [
      Markup.button.callback('📌 3: Must Today', 'task_priority_3'),
      Markup.button.callback('⏳ 4: Deadline Soon', 'task_priority_4')
    ],
    [
      Markup.button.callback('💡 5: If Possible', 'task_priority_5'),
      Markup.button.callback('🧊 0: Buffer', 'task_priority_0')
    ],
    [
      Markup.button.callback('❌ Cancel', 'main_menu')
    ]
  ]);
}

// Month calendar view keyboard (6x7 grid)
export function createMonthCalendarKeyboard(year, month) {
  const today = DateTime.now().setZone('Europe/Moscow');
  const firstDay = DateTime.fromObject({ year, month, day: 1 }, { zone: 'Europe/Moscow' });
  const lastDay = firstDay.endOf('month');
  const startOfCalendar = firstDay.startOf('week'); // Monday
  
  const buttons = [];
  
  // Header row with month navigation
  buttons.push([
    Markup.button.callback('⬅️', `calendar_prev_${year}_${month}`),
    Markup.button.callback(`${firstDay.toFormat('MMMM yyyy')}`, 'noop'),
    Markup.button.callback('➡️', `calendar_next_${year}_${month}`)
  ]);
  
  // Weekday headers
  const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  buttons.push(weekdays.map(day => 
    Markup.button.callback(day, 'noop')
  ));
  
  // Calendar grid (6 rows x 7 days)
  let currentDate = startOfCalendar;
  for (let week = 0; week < 6; week++) {
    const weekRow = [];
    for (let day = 0; day < 7; day++) {
      const dayNum = currentDate.day;
      const isCurrentMonth = currentDate.month === month;
      const isToday = currentDate.hasSame(today, 'day');
      const isPast = currentDate < today.startOf('day');
      
      let displayText = dayNum.toString();
      if (isToday) displayText = `🔸${dayNum}`;
      else if (!isCurrentMonth) displayText = `·${dayNum}·`;
      else if (isPast) displayText = `${dayNum}`;
      
      const callbackData = `calendar_day_${currentDate.toISODate()}`;
      weekRow.push(Markup.button.callback(displayText, callbackData));
      
      currentDate = currentDate.plus({ days: 1 });
    }
    buttons.push(weekRow);
  }
  
  // Navigation buttons
  buttons.push([
    Markup.button.callback('📅 Today', `calendar_day_${today.toISODate()}`),
    Markup.button.callback('🏠 Main Menu', 'main_menu')
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

// Task action keyboard with quick conversion to event
export function createTaskActionKeyboard(taskId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('⏰ Schedule Now', `task_schedule_${taskId}`),
      Markup.button.callback('📅 Schedule Later', `task_schedule_later_${taskId}`)
    ],
    [
      Markup.button.callback('✅ Mark Done', `task_done_${taskId}`),
      Markup.button.callback('✏️ Edit', `task_edit_${taskId}`)
    ],
    [
      Markup.button.callback('👁️ Hide Today', `task_hide_${taskId}`),
      Markup.button.callback('🗑️ Delete', `task_delete_${taskId}`)
    ],
    [
      Markup.button.callback('⬅️ Back', 'top_tasks')
    ]
  ]);
}

// Quick event duration selector for task-to-event conversion
export function createEventDurationKeyboard(taskId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('⏱️ 15min', `schedule_task_${taskId}_15`),
      Markup.button.callback('⏰ 30min', `schedule_task_${taskId}_30`)
    ],
    [
      Markup.button.callback('⏰ 1hr', `schedule_task_${taskId}_60`),
      Markup.button.callback('⏰ 2hrs', `schedule_task_${taskId}_120`)
    ],
    [
      Markup.button.callback('✏️ Custom', `schedule_task_${taskId}_custom`),
      Markup.button.callback('❌ Cancel', `task_action_${taskId}`)
    ]
  ]);
}

// Time slot selection for "Schedule Later"
export function createTimeSlotKeyboard(taskId, date) {
  const targetDate = DateTime.fromISO(date).setZone('Europe/Moscow');
  const now = DateTime.now().setZone('Europe/Moscow');
  const buttons = [];
  
  // Generate time slots based on work hours (9-17 by default)
  const workStart = targetDate.set({ hour: 9, minute: 0 });
  const workEnd = targetDate.set({ hour: 17, minute: 0 });
  
  const timeSlots = [];
  let currentTime = workStart;
  
  while (currentTime <= workEnd) {
    // Skip past times if it's today
    if (!targetDate.hasSame(now, 'day') || currentTime > now) {
      timeSlots.push(currentTime);
    }
    currentTime = currentTime.plus({ hours: 1 });
  }
  
  // Create button rows (2 buttons per row)
  for (let i = 0; i < timeSlots.length; i += 2) {
    const row = [];
    const slot1 = timeSlots[i];
    const slot2 = timeSlots[i + 1];
    
    row.push(Markup.button.callback(
      slot1.toFormat('HH:mm'), 
      `schedule_task_${taskId}_at_${slot1.toISO()}`
    ));
    
    if (slot2) {
      row.push(Markup.button.callback(
        slot2.toFormat('HH:mm'), 
        `schedule_task_${taskId}_at_${slot2.toISO()}`
      ));
    }
    
    buttons.push(row);
  }
  
  // Add evening slots if needed
  if (timeSlots.length === 0) {
    buttons.push([
      Markup.button.callback('🌅 Tomorrow 9:00', `schedule_task_${taskId}_tomorrow_9`),
      Markup.button.callback('🌅 Tomorrow 14:00', `schedule_task_${taskId}_tomorrow_14`)
    ]);
  }
  
  buttons.push([
    Markup.button.callback('⬅️ Back', `task_action_${taskId}`),
    Markup.button.callback('🏠 Main Menu', 'main_menu')
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

// Work hours configuration keyboard
export function createWorkHoursKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🕘 Start: 8:00', 'workhours_start_8'),
      Markup.button.callback('🕘 Start: 9:00', 'workhours_start_9')
    ],
    [
      Markup.button.callback('🕘 Start: 10:00', 'workhours_start_10'),
      Markup.button.callback('🕕 End: 17:00', 'workhours_end_17')
    ],
    [
      Markup.button.callback('🕕 End: 18:00', 'workhours_end_18'),
      Markup.button.callback('🕕 End: 19:00', 'workhours_end_19')
    ],
    [
      Markup.button.callback('📅 Work Days', 'work_days_config'),
      Markup.button.callback('💾 Save', 'workhours_save')
    ],
    [
      Markup.button.callback('🏠 Main Menu', 'main_menu')
    ]
  ]);
}

// Work days selection keyboard
export function createWorkDaysKeyboard(selectedDays = [1,2,3,4,5]) {
  const days = [
    { name: 'Mon', value: 1 },
    { name: 'Tue', value: 2 },
    { name: 'Wed', value: 3 },
    { name: 'Thu', value: 4 },
    { name: 'Fri', value: 5 },
    { name: 'Sat', value: 6 },
    { name: 'Sun', value: 0 }
  ];
  
  const buttons = [];
  
  // First row: Mon-Wed
  buttons.push(days.slice(0, 3).map(day => 
    Markup.button.callback(
      selectedDays.includes(day.value) ? `✅ ${day.name}` : `⬜ ${day.name}`,
      `workday_toggle_${day.value}`
    )
  ));
  
  // Second row: Thu-Sat
  buttons.push(days.slice(3, 6).map(day => 
    Markup.button.callback(
      selectedDays.includes(day.value) ? `✅ ${day.name}` : `⬜ ${day.name}`,
      `workday_toggle_${day.value}`
    )
  ));
  
  // Third row: Sunday + controls
  buttons.push([
    Markup.button.callback(
      selectedDays.includes(0) ? '✅ Sun' : '⬜ Sun',
      'workday_toggle_0'
    ),
    Markup.button.callback('🔄 Reset', 'workdays_reset')
  ]);
  
  buttons.push([
    Markup.button.callback('💾 Save', 'workdays_save'),
    Markup.button.callback('⬅️ Back', 'work_hours')
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

// Day view keyboard showing events and available slots
export function createDayViewKeyboard(date, hasEvents = false) {
  const buttons = [];
  const targetDate = DateTime.fromISO(date);
  const today = DateTime.now().setZone('Europe/Moscow');
  
  // Navigation
  const prevDay = targetDate.minus({ days: 1 }).toISODate();
  const nextDay = targetDate.plus({ days: 1 }).toISODate();
  
  buttons.push([
    Markup.button.callback('⬅️ Prev', `calendar_day_${prevDay}`),
    Markup.button.callback(targetDate.toFormat('EEE, MMM d'), 'noop'),
    Markup.button.callback('Next ➡️', `calendar_day_${nextDay}`)
  ]);
  
  // Quick actions for the day
  buttons.push([
    Markup.button.callback('➕ New Event', `new_event_${date}`),
    Markup.button.callback('📋 Tasks for Day', `day_tasks_${date}`)
  ]);
  
  if (hasEvents) {
    buttons.push([
      Markup.button.callback('📅 Show Events', `day_events_${date}`),
      Markup.button.callback('📊 Day Stats', `day_stats_${date}`)
    ]);
  }
  
  // Return navigation
  buttons.push([
    Markup.button.callback('📅 Calendar', 'calendar_view'),
    Markup.button.callback('🏠 Main Menu', 'main_menu')
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

// Confirmation keyboard (generic)
export function createConfirmKeyboard(confirmAction, confirmText = '✅ Confirm', cancelAction = 'main_menu') {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(confirmText, confirmAction),
      Markup.button.callback('❌ Cancel', cancelAction)
    ]
  ]);
}

// No-op callback for display-only buttons
export const NOOP_CALLBACK = 'noop';