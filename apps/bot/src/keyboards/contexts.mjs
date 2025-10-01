import { Markup } from 'telegraf';

export function createContextsKeyboard(contexts, currentContext = '@anywhere') {
  const buttons = [];
  
  const systemContexts = contexts.filter(c => c.isSystem);
  
  for (let i = 0; i < systemContexts.length; i += 2) {
    const row = [];
    const ctx1 = systemContexts[i];
    
    const isActive1 = ctx1.name === currentContext;
    row.push(Markup.button.callback(
      `${isActive1 ? '✅' : '⬜'} ${ctx1.icon || '📍'} ${ctx1.name}`,
      `set_context_${ctx1.name}`
    ));
    
    if (systemContexts[i + 1]) {
      const ctx2 = systemContexts[i + 1];
      const isActive2 = ctx2.name === currentContext;
      row.push(Markup.button.callback(
        `${isActive2 ? '✅' : '⬜'} ${ctx2.icon || '📍'} ${ctx2.name}`,
        `set_context_${ctx2.name}`
      ));
    }
    
    buttons.push(row);
  }
  
  buttons.push([
    Markup.button.callback('📋 Tasks by Context', 'tasks_by_context'),
    Markup.button.callback('🔄 Clear Filter', 'set_context_@anywhere')
  ]);
  
  buttons.push([
    Markup.button.callback('🏠 Main Menu', 'main_menu')
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

export function createLayersKeyboard(layers) {
  const buttons = [];
  
  for (const layer of layers) {
    const icon = layer.isVisible ? '✅' : '⬜';
    const colorDot = getColorDot(layer.color);
    
    buttons.push([
      Markup.button.callback(
        `${icon} ${colorDot} ${layer.name}`,
        `toggle_layer_${layer.id}`
      )
    ]);
  }
  
  buttons.push([
    Markup.button.callback('👁️ Show All', 'layers_show_all'),
    Markup.button.callback('🙈 Hide All', 'layers_hide_all')
  ]);
  
  buttons.push([
    Markup.button.callback('📅 View Calendar', 'calendar_view'),
    Markup.button.callback('🏠 Main Menu', 'main_menu')
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

export function createRoutinesKeyboard(routines) {
  const buttons = [];
  
  for (const routine of routines.slice(0, 5)) {
    buttons.push([
      Markup.button.callback(
        `▶️ ${routine.name}`,
        `activate_routine_${routine.id}`
      )
    ]);
  }
  
  if (routines.length > 0) {
    buttons.push([
      Markup.button.callback('📊 Routine Stats', 'routine_stats'),
      Markup.button.callback('🔧 Manage', 'manage_routines')
    ]);
  }
  
  buttons.push([
    Markup.button.callback('🏠 Main Menu', 'main_menu')
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

export function createEnergyLevelKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('⚡⚡⚡⚡⚡ Very High (5)', 'energy_5'),
      Markup.button.callback('⚡⚡⚡⚡ High (4)', 'energy_4')
    ],
    [
      Markup.button.callback('⚡⚡⚡ Medium (3)', 'energy_3'),
      Markup.button.callback('⚡⚡ Low (2)', 'energy_2')
    ],
    [
      Markup.button.callback('⚡ Very Low (1)', 'energy_1')
    ],
    [
      Markup.button.callback('⬅️ Back', 'smart_suggestions')
    ]
  ]);
}

function getColorDot(hexColor) {
  const colorMap = {
    '#3B82F6': '🔵',
    '#10B981': '🟢',
    '#EF4444': '🔴',
    '#F59E0B': '🟡',
    '#8B5CF6': '🟣',
    '#EC4899': '🩷'
  };
  return colorMap[hexColor] || '⚪';
}