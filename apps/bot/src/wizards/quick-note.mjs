import { createMainReplyKeyboard } from '../keyboards/index.mjs';

export async function startQuickNoteWizard(ctx, sessions, isInline = false) {
  const chatId = ctx.chat.id.toString();
  
  await sessions.setSession(chatId, 'quick_note', {});
  
  const message = '📝 *Quick Note*\n\nSend me your note. It will be tagged with #quick automatically.\n\n💡 *Tip:* Add your own #tags in the message!';
  
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

export async function handleQuickNoteInput(ctx, text, sessions) {
  const chatId = ctx.chat.id.toString();
  
  const noteData = {
    body: text.trim(),
    source: 'telegram'
  };
  
  await sessions.clearSession(chatId);
  
  return noteData;
}

export async function showQuickNoteSuccess(ctx, noteText) {
  await ctx.reply(
    `✅ *Quick Note Saved!*\n\n📝 "${noteText}"\n\n🏷️ Tagged with #quick`,
    {
      parse_mode: 'Markdown',
      ...createMainReplyKeyboard()
    }
  );
}

export async function cancelQuickNote(ctx, sessions) {
  const chatId = ctx.chat.id.toString();
  await sessions.clearSession(chatId);
  
  await ctx.reply(
    '❌ Note cancelled.',
    createMainReplyKeyboard()
  );
}