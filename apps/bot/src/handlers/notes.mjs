import { sendToAPI } from '../utils/api-client.mjs';
import { createMainReplyKeyboard } from '../keyboards/index.mjs';
import { startQuickNoteWizard, handleQuickNoteInput, showQuickNoteSuccess } from '../wizards/index.mjs';

export async function startQuickNote(ctx, isInline = false) {
  await startQuickNoteWizard(ctx, ctx.sessions, isInline);
}

export async function handleQuickNoteText(ctx, text, session) {
  const noteData = await handleQuickNoteInput(ctx, text, ctx.sessions);
  
  try {
    await sendToAPI('POST', '/notes/quick', noteData);
    await showQuickNoteSuccess(ctx, text);
  } catch (error) {
    await ctx.reply('❌ Failed to save note. Please try again.', createMainReplyKeyboard());
  }
}

export async function confirmQuickNote(ctx) {
  const chatId = ctx.chat.id.toString();
  const session = await ctx.sessions.getSession(chatId);
  
  if (session && session.state === 'confirm_quick_note') {
    await handleQuickNoteText(ctx, session.data.text, session);
  } else {
    await ctx.reply('❌ Session expired.', createMainReplyKeyboard());
  }
}