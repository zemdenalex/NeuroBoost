import { Markup } from 'telegraf';

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

export function createTaskActionEnhancedKeyboard(taskId, hasSubtasks = false) {
  const buttons = [];

  buttons.push([
    Markup.button.callback('⏰ Schedule Now', `task_schedule_${taskId}`),
    Markup.button.callback('📅 Schedule Later', `task_schedule_later_${taskId}`)
  ]);

  buttons.push([
    Markup.button.callback('✅ Mark Done', `task_done_${taskId}`),
    Markup.button.callback('✏️ Edit', `task_edit_${taskId}`)
  ]);

  if (hasSubtasks) {
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

  return Markup.inlineKeyboard(buttons);
}

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

export function createTimeSlotKeyboard(taskId, timeSlots) {
  const buttons = [];
  
  for (let i = 0; i < timeSlots.length; i += 2) {
    const row = [];
    const slot1 = timeSlots[i];
    
    row.push(Markup.button.callback(
      slot1.display, 
      `schedule_task_${taskId}_at_${slot1.iso}`
    ));
    
    if (timeSlots[i + 1]) {
      const slot2 = timeSlots[i + 1];
      row.push(Markup.button.callback(
        slot2.display, 
        `schedule_task_${taskId}_at_${slot2.iso}`
      ));
    }
    
    buttons.push(row);
  }
  
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

export function createTaskFilterKeyboard() {
  const priorityNames = ['🧊 Buffer', '🔥 Emergency', '⚡ ASAP', '📌 Must Today', '⏳ Deadline', '💡 If Possible'];
  const buttons = [];
  
  for (let i = 0; i < 6; i += 2) {
    const row = [];
    row.push({ text: priorityNames[i], callback_data: `tasks_filter_${i}` });
    if (i + 1 < 6) {
      row.push({ text: priorityNames[i + 1], callback_data: `tasks_filter_${i + 1}` });
    }
    buttons.push(row);
  }
  
  buttons.push([
    { text: '📋 All Tasks', callback_data: 'tasks_filter_all' },
    { text: '❌ Cancel', callback_data: 'tasks_page_0_all' }
  ]);

  return Markup.inlineKeyboard(buttons);
}

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

export function createWorkDaysKeyboard(selectedDays = [1, 2, 3, 4, 5]) {
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
  
  buttons.push(days.slice(0, 3).map(day => 
    Markup.button.callback(
      selectedDays.includes(day.value) ? `✅ ${day.name}` : `⬜ ${day.name}`,
      `workday_toggle_${day.value}`
    )
  ));
  
  buttons.push(days.slice(3, 6).map(day => 
    Markup.button.callback(
      selectedDays.includes(day.value) ? `✅ ${day.name}` : `⬜ ${day.name}`,
      `workday_toggle_${day.value}`
    )
  ));
  
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