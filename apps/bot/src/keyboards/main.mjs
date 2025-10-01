import { Markup } from 'telegraf';

export function createMainReplyKeyboard() {
  return Markup.keyboard([
    ['🤖 Smart Suggestions', '📋 Tasks'],
    ['🌍 Contexts', '🔄 Routines'],
    ['🎨 Layers', '📅 Calendar'],
    ['📝 Quick Note', '➕ New Task'],
    ['📊 Stats', '⚙️ Settings']
  ]).resize();
}

export function createMainInlineKeyboard() {
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