import { sendToAPI } from '../utils/api-client.mjs';
import { createContextsKeyboard, createMainReplyKeyboard } from '../keyboards/index.mjs';

export async function showContexts(ctx) {
  const isCallback = ctx.updateType === 'callback_query';
  
  try {
    const contextsResponse = await sendToAPI('GET', '/api/contexts');
    const contexts = contextsResponse.contexts || [];
    
    const chatId = ctx.chat.id.toString();
    const session = await ctx.sessions.getSession(chatId) || {};
    const currentContext = session.currentContext || '@anywhere';
    
    let message = '🌍 *Task Contexts*\n\n';
    message += `Current: ${currentContext}\n\n`;
    message += 'Select a context to filter your tasks:\n';
    
    if (isCallback) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...createContextsKeyboard(contexts, currentContext)
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...createContextsKeyboard(contexts, currentContext)
      });
    }
  } catch (error) {
    const message = '🌍 *Contexts (v0.4.x)*\n\n⚠️ Context system not yet fully implemented.\n\nComing soon:\n• @home, @office, @computer\n• Context-based filtering\n• Smart suggestions by context';
    
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
}

export async function setContext(ctx, contextName) {
  const chatId = ctx.chat.id.toString();
  
  try {
    await ctx.sessions.setSession(chatId, 'context_filter', { currentContext: contextName });
    
    await ctx.answerCbQuery(`Context set to ${contextName}`);
    await showContexts(ctx);
  } catch (error) {
    await ctx.editMessageText('❌ Failed to set context.', {
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
    });
  }
}

export async function showTasksByContext(ctx) {
  await ctx.editMessageText('📋 Tasks by context coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: 'contexts_menu' }]
      ]
    }
  });
}