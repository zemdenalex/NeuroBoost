import { sendToAPI } from '../utils/api-client.mjs';
import { createLayersKeyboard, createRoutinesKeyboard, createEnergyLevelKeyboard, createMainReplyKeyboard } from '../keyboards/index.mjs';

export async function showLayers(ctx) {
  const isCallback = ctx.updateType === 'callback_query';
  const message = '🎨 *Calendar Layers (v0.4.x)*\n\n⚠️ Layer system not yet fully implemented.\n\nComing soon:\n• Work, Personal, Health layers\n• Toggle layer visibility\n• Filter calendar by layer';
  
  try {
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
  } catch (error) {
    await ctx.reply('❌ Failed to load layers.', createMainReplyKeyboard());
  }
}

export async function toggleLayer(ctx, layerId) {
  await ctx.editMessageText('🎨 Layer toggle coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: 'layers_menu' }]
      ]
    }
  });
}

export async function showAllLayers(ctx) {
  await ctx.editMessageText('👁️ Show all layers coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: 'layers_menu' }]
      ]
    }
  });
}

export async function hideAllLayers(ctx) {
  await ctx.editMessageText('🙈 Hide all layers coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: 'layers_menu' }]
      ]
    }
  });
}

export async function showRoutines(ctx) {
  const isCallback = ctx.updateType === 'callback_query';
  const message = '🔄 *Task Routines (v0.4.x)*\n\n⚠️ Routine system not yet fully implemented.\n\nComing soon:\n• Morning/Evening routines\n• Home care routines\n• One-click activation\n• Routine analytics';
  
  try {
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
  } catch (error) {
    await ctx.reply('❌ Failed to load routines.', createMainReplyKeyboard());
  }
}

export async function activateRoutine(ctx, routineId) {
  await ctx.editMessageText('▶️ Routine activation coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: 'routines_menu' }]
      ]
    }
  });
}

export async function showRoutineStats(ctx) {
  await ctx.editMessageText('📊 Routine stats coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: 'routines_menu' }]
      ]
    }
  });
}

export async function showManageRoutines(ctx) {
  await ctx.editMessageText('🔧 Routine management coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: 'routines_menu' }]
      ]
    }
  });
}

export async function showSmartSuggestions(ctx) {
  const isCallback = ctx.updateType === 'callback_query';
  const message = '🤖 *Smart Suggestions (v0.4.x)*\n\n⚠️ Smart scheduling not yet fully implemented.\n\nComing soon:\n• AI-powered task suggestions\n• Energy-based scheduling\n• Context-aware recommendations\n• Historical pattern learning';
  
  try {
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
  } catch (error) {
    await ctx.reply('❌ Failed to load suggestions.', createMainReplyKeyboard());
  }
}

export async function showEnergyLevelSelector(ctx) {
  await ctx.editMessageText('⚡ *Set Your Energy Level*\n\nHow energetic do you feel right now?', {
    parse_mode: 'Markdown',
    ...createEnergyLevelKeyboard()
  });
}

export async function setEnergyLevel(ctx, level) {
  const chatId = ctx.chat.id.toString();
  
  try {
    await ctx.sessions.updateSession(chatId, { currentEnergy: level });
    await ctx.answerCbQuery(`Energy set to ${level}/5`);
    await showSmartSuggestions(ctx);
  } catch (error) {
    await ctx.editMessageText('❌ Failed to set energy level.', {
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
    });
  }
}

export async function scheduleByEnergy(ctx, energyType) {
  await ctx.editMessageText(`⚡ Schedule ${energyType} energy tasks coming in v0.4.x!`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: 'smart_suggestions' }]
      ]
    }
  });
}

export async function showTaskTree(ctx, taskId) {
  await ctx.editMessageText('🌳 Task tree view coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: `task_action_${taskId}` }]
      ]
    }
  });
}

export async function showUpdateProgress(ctx, taskId) {
  await ctx.editMessageText('📊 Progress update coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: `task_action_${taskId}` }]
      ]
    }
  });
}