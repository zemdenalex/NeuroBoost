import { Markup } from 'telegraf';

export const NOOP_CALLBACK = 'noop';

export function createConfirmKeyboard(confirmAction, confirmText = '✅ Confirm', cancelAction = 'main_menu') {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(confirmText, confirmAction),
      Markup.button.callback('❌ Cancel', cancelAction)
    ]
  ]);
}

export function createBackAndMainMenuKeyboard(backAction = null) {
  const buttons = [];
  
  if (backAction) {
    buttons.push([
      Markup.button.callback('⬅️ Back', backAction),
      Markup.button.callback('🏠 Main Menu', 'main_menu')
    ]);
  } else {
    buttons.push([
      Markup.button.callback('🏠 Main Menu', 'main_menu')
    ]);
  }
  
  return Markup.inlineKeyboard(buttons);
}

export function createPaginationKeyboard(currentPage, totalPages, baseAction, filter = 'all') {
  const buttons = [];
  const navRow = [];
  
  if (currentPage > 0) {
    navRow.push(Markup.button.callback('⬅️ Prev', `${baseAction}_${currentPage - 1}_${filter}`));
  }
  
  navRow.push(Markup.button.callback(`${currentPage + 1}/${totalPages}`, 'noop'));
  
  if (currentPage < totalPages - 1) {
    navRow.push(Markup.button.callback('Next ➡️', `${baseAction}_${currentPage + 1}_${filter}`));
  }
  
  if (navRow.length > 1) {
    buttons.push(navRow);
  }
  
  return buttons;
}

export function createSimpleMessageKeyboard(message, buttons = []) {
  const keyboard = [...buttons];
  
  keyboard.push([
    Markup.button.callback('🏠 Main Menu', 'main_menu')
  ]);
  
  return {
    message,
    keyboard: Markup.inlineKeyboard(keyboard)
  };
}