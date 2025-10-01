import { createMainReplyKeyboard, createWorkHoursKeyboard, createWorkDaysKeyboard } from '../keyboards/index.mjs';

export async function start(ctx) {
  const user = ctx.from;
  const chatId = ctx.chat.id.toString();
  
  await ctx.sessions.clearSession(chatId);
  
  const welcome = `🧠 *NeuroBoost v0.4.x*\n\nHi ${user.first_name}! Your intelligent task management assistant.\n\n✨ *Core Features:*\n• 📋 Task management with priorities\n• 📅 Calendar and event scheduling\n• 📊 Weekly stats and analytics\n• 📝 Quick note capture\n\n*Coming in v0.4.x:*\n• 🤖 Smart task suggestions\n• 🌍 Context-aware filtering\n• 🎨 Calendar layers\n• 🔄 Task routines`;
  
  await ctx.reply(welcome, {
    parse_mode: 'Markdown',
    ...createMainReplyKeyboard()
  });
}

export async function help(ctx) {
  const message = `🧠 *NeuroBoost Help*\n\n*Commands:*\n` +
    `/start - Show main menu\n` +
    `/tasks - View all tasks\n` +
    `/note - Create quick note\n` +
    `/today - Today's plan\n` +
    `/stats - Weekly statistics\n` +
    `/calendar - Calendar view\n` +
    `/cancel - Cancel current action\n\n` +
    `*Quick Actions:*\n` +
    `Use the menu buttons below for quick access to all features!\n\n` +
    `*Need more help?*\n` +
    `Visit the docs or contact support.`;
  
  await ctx.reply(message, {
    parse_mode: 'Markdown',
    ...createMainReplyKeyboard()
  });
}

export async function showMainMenu(ctx) {
  await ctx.sessions.clearSession(ctx.chat.id.toString());
  
  try {
    await ctx.deleteMessage();
  } catch (err) {
  }
  
  await ctx.reply('🧠 *NeuroBoost* - What would you like to do?', {
    parse_mode: 'Markdown',
    ...createMainReplyKeyboard()
  });
}

export async function showSettings(ctx) {
  const isCallback = ctx.updateType === 'callback_query';
  const message = '⚙️ *Settings*\n\n⚠️ Settings panel under construction.\n\nComing soon:\n• Notification preferences\n• Timezone settings\n• Work hours configuration\n• Reminder defaults';
  
  if (isCallback) {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]]
      }
    });
  } else {
    await ctx.reply(message, createMainReplyKeyboard());
  }
}

export async function cancelCurrentFlow(ctx) {
  const chatId = ctx.chat.id.toString();
  await ctx.sessions.clearSession(chatId);
  
  await ctx.reply('❌ Current action cancelled.', createMainReplyKeyboard());
}

export async function handleUnknownSession(ctx) {
  const chatId = ctx.chat.id.toString();
  await ctx.sessions.clearSession(chatId);
  
  await ctx.reply('❌ Session expired. Starting over.', createMainReplyKeyboard());
}

export async function handleTextError(ctx) {
  const chatId = ctx.chat.id.toString();
  await ctx.sessions.clearSession(chatId);
  
  await ctx.reply('❌ Something went wrong. Please try again.', createMainReplyKeyboard());
}

export async function showWorkHours(ctx) {
  try {
    const chatId = ctx.chat.id.toString();
    const session = await ctx.sessions.getSession(chatId) || {};
    
    const startHour = session.data?.workingHoursStart || 9;
    const endHour = session.data?.workingHoursEnd || 17;
    const workDays = session.data?.workingDays || ['mon', 'tue', 'wed', 'thu', 'fri'];
    
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
  } catch (error) {
    await ctx.editMessageText('❌ Failed to load work hours.', {
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
    });
  }
}

export async function setWorkHoursStart(ctx, startHour) {
  const chatId = ctx.chat.id.toString();
  
  try {
    let session = await ctx.sessions.getSession(chatId);
    if (!session) {
      session = await ctx.sessions.setSession(chatId, 'work_hours_config', {});
    }
    
    await ctx.sessions.updateSession(chatId, { workingHoursStart: startHour });
    await ctx.answerCbQuery(`✅ Work starts at ${startHour}:00`);
    await showWorkHours(ctx);
  } catch (error) {
    await ctx.editMessageText('❌ Failed to set work hours.', {
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
    });
  }
}

export async function setWorkHoursEnd(ctx, endHour) {
  const chatId = ctx.chat.id.toString();
  
  try {
    let session = await ctx.sessions.getSession(chatId);
    if (!session) {
      session = await ctx.sessions.setSession(chatId, 'work_hours_config', {});
    }
    
    await ctx.sessions.updateSession(chatId, { workingHoursEnd: endHour });
    await ctx.answerCbQuery(`✅ Work ends at ${endHour}:00`);
    await showWorkHours(ctx);
  } catch (error) {
    await ctx.editMessageText('❌ Failed to set work hours.', {
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
    });
  }
}

export async function showWorkDaysConfig(ctx) {
  const chatId = ctx.chat.id.toString();
  const session = await ctx.sessions.getSession(chatId) || {};
  const selectedDays = session.data?.workingDays || [1, 2, 3, 4, 5];
  
  await ctx.editMessageText('📅 *Work Days Configuration*\n\nSelect your working days:', {
    parse_mode: 'Markdown',
    ...createWorkDaysKeyboard(selectedDays)
  });
}

export async function toggleWorkDay(ctx, dayNumber) {
  await ctx.editMessageText('📅 Work days toggle coming soon!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: 'work_hours' }]
      ]
    }
  });
}

export async function resetWorkDays(ctx) {
  await ctx.editMessageText('🔄 Work days reset coming soon!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: 'work_hours' }]
      ]
    }
  });
}

export async function saveWorkDays(ctx) {
  await ctx.editMessageText('💾 Work days save coming soon!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: 'work_hours' }]
      ]
    }
  });
}