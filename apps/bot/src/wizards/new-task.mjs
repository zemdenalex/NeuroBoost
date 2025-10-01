import { createTaskPriorityKeyboard } from '../keyboards/index.mjs';
import { createMainReplyKeyboard } from '../keyboards/index.mjs';

export async function startNewTaskWizard(ctx, sessions, initialTitle = null, isInline = false) {
  const chatId = ctx.chat.id.toString();
  
  if (initialTitle) {
    await sessions.setSession(chatId, 'new_task', { 
      title: initialTitle.trim(), 
      step: 'priority' 
    });
    
    const message = `📋 *New Task*\n\n"${initialTitle.trim()}"\n\n🎯 What's the priority?`;
    
    if (isInline) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...createTaskPriorityKeyboard()
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...createTaskPriorityKeyboard()
      });
    }
  } else {
    await sessions.setSession(chatId, 'new_task', { step: 'title' });
    
    const message = '📋 *New Task*\n\nWhat\'s the task title?\n\n💡 *Example:* "Review Q4 budget"';
    
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
}

export async function handleTaskTitleInput(ctx, text, sessions) {
  const chatId = ctx.chat.id.toString();
  
  await sessions.updateSession(chatId, { 
    title: text.trim(),
    step: 'priority'
  });
  
  await ctx.reply(
    `📋 *Task:* "${text.trim()}"\n\n🎯 What's the priority?`,
    {
      parse_mode: 'Markdown',
      ...createTaskPriorityKeyboard()
    }
  );
}

export async function handleTaskPrioritySelection(ctx, priority, sessions, taskHandlers) {
  const chatId = ctx.chat.id.toString();
  const session = await sessions.getSession(chatId);
  
  if (!session || session.state !== 'new_task') {
    await ctx.reply('❌ Session expired. Please start over.', createMainReplyKeyboard());
    return null;
  }
  
  const taskData = {
    title: session.data.title,
    priority
  };
  
  await sessions.clearSession(chatId);
  
  return taskData;
}

export async function cancelTaskWizard(ctx, sessions) {
  const chatId = ctx.chat.id.toString();
  await sessions.clearSession(chatId);
  
  await ctx.reply(
    '❌ Task creation cancelled.',
    createMainReplyKeyboard()
  );
}