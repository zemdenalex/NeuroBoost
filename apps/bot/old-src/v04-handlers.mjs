// apps/bot/src/v04x-handlers.mjs - v0.4.x Task Management Revolution Bot Handlers
import { DateTime } from 'luxon';
import { Markup } from 'telegraf';
import { sendToAPI } from './api-client.mjs';
import { formatTask, formatTime, formatDuration } from './formatters.mjs';

// === CONTEXTS MANAGEMENT ===
export async function handleContextsMenu(ctx, logger, sessions) {
  const timer = logger.startTimer('contexts_menu');
  
  await ctx.answerCbQuery();
  logger.botInteraction(ctx.from.id, ctx.from.username, 'contexts_menu');
  
  try {
    // Get available contexts
    const contextsResponse = await sendToAPI('GET', '/api/contexts');
    const contexts = contextsResponse.contexts || [];
    
    // Get current context from session or default
    const chatId = ctx.chat.id.toString();
    const session = await sessions.getSession(chatId) || {};
    const currentContext = session.currentContext || '@anywhere';
    
    let message = '🌍 *Task Contexts*\n\n';
    message += `Current: ${currentContext}\n\n`;
    message += 'Select a context to filter your tasks:\n';
    
    // Create context buttons
    const buttons = [];
    const systemContexts = contexts.filter(c => c.isSystem);
    
    // Group contexts in rows of 2
    for (let i = 0; i < systemContexts.length; i += 2) {
      const row = [];
      const ctx1 = systemContexts[i];
      row.push(Markup.button.callback(
        `${ctx1.icon || '📍'} ${ctx1.name}`,
        `set_context_${ctx1.name}`
      ));
      
      if (systemContexts[i + 1]) {
        const ctx2 = systemContexts[i + 1];
        row.push(Markup.button.callback(
          `${ctx2.icon || '📍'} ${ctx2.name}`,
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
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons
      }
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show contexts menu', { 
      userId: ctx.from.id, 
      error: error.message 
    }, error);
    timer.end();
  }
}

// Set current context
export async function handleSetContext(ctx, contextName, logger, sessions) {
  const timer = logger.startTimer('set_context');
  
  await ctx.answerCbQuery(`Context set to ${contextName}`);
  
  const chatId = ctx.chat.id.toString();
  logger.botInteraction(ctx.from.id, ctx.from.username, 'set_context', { context: contextName });
  
  try {
    // Update session with current context
    await sessions.setSession(chatId, 'context_filter', { currentContext: contextName });
    
    // Get filtered tasks
    const tasksResponse = await sendToAPI('GET', `/api/tasks/by-context?context=${encodeURIComponent(contextName)}`);
    const tasks = tasksResponse.tasks || [];
    
    let message = `📍 *Context: ${contextName}*\n\n`;
    
    if (tasks.length === 0) {
      message += '✨ No tasks in this context\n';
    } else {
      message += `Found ${tasks.length} tasks:\n\n`;
      
      // Group by energy level
      const byEnergy = tasks.reduce((acc, task) => {
        const energy = task.energy || 0;
        if (!acc[energy]) acc[energy] = [];
        acc[energy].push(task);
        return acc;
      }, {});
      
      const energyLevels = ['⚡ High Energy (4-5)', '🔋 Medium Energy (3)', '💤 Low Energy (1-2)'];
      const energyGroups = [
        { range: [4, 5], label: energyLevels[0] },
        { range: [3, 3], label: energyLevels[1] },
        { range: [1, 2], label: energyLevels[2] }
      ];
      
      for (const group of energyGroups) {
        const tasksInGroup = [];
        for (let e = group.range[0]; e <= group.range[1]; e++) {
          if (byEnergy[e]) tasksInGroup.push(...byEnergy[e]);
        }
        
        if (tasksInGroup.length > 0) {
          message += `\n${group.label} (${tasksInGroup.length})\n`;
          tasksInGroup.slice(0, 3).forEach(task => {
            const time = task.estimatedMinutes ? ` ~${task.estimatedMinutes}min` : '';
            message += `• ${task.title}${time}\n`;
          });
          if (tasksInGroup.length > 3) {
            message += `... and ${tasksInGroup.length - 3} more\n`;
          }
        }
      }
    }
    
    // Create action buttons
    const buttons = [];
    if (tasks.length > 0) {
      buttons.push([
        Markup.button.callback('⚡ Schedule High Energy', `schedule_by_energy_high`),
        Markup.button.callback('💤 Schedule Low Energy', `schedule_by_energy_low`)
      ]);
    }
    
    buttons.push([
      Markup.button.callback('🌍 Change Context', 'contexts_menu'),
      Markup.button.callback('🏠 Main Menu', 'main_menu')
    ]);
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons
      }
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to set context', { 
      userId: ctx.from.id,
      context: contextName,
      error: error.message 
    }, error);
    timer.end();
  }
}

// === CALENDAR LAYERS ===
export async function handleLayersMenu(ctx, logger, sessions) {
  const timer = logger.startTimer('layers_menu');
  
  await ctx.answerCbQuery();
  logger.botInteraction(ctx.from.id, ctx.from.username, 'layers_menu');
  
  try {
    // Get calendar layers
    const layersResponse = await sendToAPI('GET', '/api/layers');
    const layers = layersResponse.layers || [];
    
    let message = '🎨 *Calendar Layers*\n\n';
    message += 'Toggle visibility of calendar layers:\n\n';
    
    const buttons = [];
    
    for (const layer of layers) {
      const icon = layer.isVisible ? '✅' : '⬜';
      const colorDot = '🔵🟢🔴🟡🟣🩷'.split('')[
        ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899']
          .indexOf(layer.color)
      ] || '⚪';
      
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
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons
      }
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show layers menu', { 
      userId: ctx.from.id,
      error: error.message 
    }, error);
    timer.end();
  }
}

// Toggle layer visibility
export async function handleToggleLayer(ctx, layerId, logger) {
  const timer = logger.startTimer('toggle_layer');
  
  logger.botInteraction(ctx.from.id, ctx.from.username, 'toggle_layer', { layerId });
  
  try {
    // Get current layer state
    const layersResponse = await sendToAPI('GET', '/api/layers');
    const layer = layersResponse.layers?.find(l => l.id === layerId);
    
    if (!layer) {
      await ctx.answerCbQuery('Layer not found');
      return;
    }
    
    // Toggle visibility
    const newVisibility = !layer.isVisible;
    await sendToAPI('PATCH', `/api/layers/${layerId}/visibility`, {
      isVisible: newVisibility
    });
    
    await ctx.answerCbQuery(`${layer.name} ${newVisibility ? 'shown' : 'hidden'}`);
    
    // Refresh the layers menu
    await handleLayersMenu(ctx, logger, { getSession: () => null });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to toggle layer', { 
      userId: ctx.from.id,
      layerId,
      error: error.message 
    }, error);
    await ctx.answerCbQuery('Failed to toggle layer');
    timer.end();
  }
}

// === ROUTINES ===
export async function handleRoutinesMenu(ctx, logger, sessions) {
  const timer = logger.startTimer('routines_menu');
  
  await ctx.answerCbQuery();
  logger.botInteraction(ctx.from.id, ctx.from.username, 'routines_menu');
  
  try {
    // Get available routines
    const routinesResponse = await sendToAPI('GET', '/api/routines');
    const routines = routinesResponse.routines || [];
    
    let message = '🔄 *Task Routines*\n\n';
    
    if (routines.length === 0) {
      message += 'No routines configured yet.\n\n';
      message += 'Routines help you batch recurring tasks like:\n';
      message += '• Morning routine (exercise, meditation)\n';
      message += '• Home care (pets, plants, cleaning)\n';
      message += '• Work startup (email, planning)\n';
    } else {
      message += 'Available routines:\n\n';
      
      for (const routine of routines) {
        const taskCount = routine.tasks?.tasks?.length || 0;
        const duration = routine.estimatedDuration || 0;
        
        message += `📋 *${routine.name}*\n`;
        if (routine.description) {
          message += `   ${routine.description}\n`;
        }
        message += `   ${taskCount} tasks • ~${duration} min\n\n`;
      }
    }
    
    // Create routine buttons
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
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons
      }
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show routines menu', { 
      userId: ctx.from.id,
      error: error.message 
    }, error);
    timer.end();
  }
}

// Activate a routine
export async function handleActivateRoutine(ctx, routineId, logger) {
  const timer = logger.startTimer('activate_routine');
  
  await ctx.answerCbQuery('Activating routine...');
  logger.botInteraction(ctx.from.id, ctx.from.username, 'activate_routine', { routineId });
  
  try {
    // Activate the routine
    const result = await sendToAPI('POST', `/api/routines/${routineId}/activate`);
    
    const tasksCreated = result.tasks?.length || 0;
    const routineName = result.message?.match(/"(.+?)"/)?.[1] || 'Routine';
    
    let message = `✅ *${routineName} Activated!*\n\n`;
    message += `Created ${tasksCreated} tasks:\n\n`;
    
    if (result.tasks) {
      result.tasks.forEach((task, index) => {
        const time = task.estimatedMinutes ? ` (${task.estimatedMinutes}min)` : '';
        message += `${index + 1}. ${task.title}${time}\n`;
      });
    }
    
    message += '\n💡 Tasks are now in your task list.\n';
    message += 'You can schedule them individually or as a batch.';
    
    const buttons = [
      [
        Markup.button.callback('📋 View Tasks', 'top_tasks'),
        Markup.button.callback('⏰ Schedule All', `schedule_routine_tasks_${routineId}`)
      ],
      [
        Markup.button.callback('🔄 More Routines', 'routines_menu'),
        Markup.button.callback('🏠 Main Menu', 'main_menu')
      ]
    ];
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons
      }
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to activate routine', { 
      userId: ctx.from.id,
      routineId,
      error: error.message 
    }, error);
    await ctx.editMessageText('❌ Failed to activate routine', {
      reply_markup: {
        inline_keyboard: [[
          Markup.button.callback('🔄 Try Again', `activate_routine_${routineId}`),
          Markup.button.callback('🏠 Main Menu', 'main_menu')
        ]]
      }
    });
    timer.end();
  }
}

// === TASK DEPENDENCIES VIEW ===
export async function handleTaskTree(ctx, taskId, logger) {
  const timer = logger.startTimer('task_tree_view');
  
  await ctx.answerCbQuery();
  logger.botInteraction(ctx.from.id, ctx.from.username, 'task_tree', { taskId });
  
  try {
    // Get task tree
    const treeResponse = await sendToAPI('GET', `/api/tasks/${taskId}/tree`);
    const task = treeResponse.task;
    
    if (!task) {
      await ctx.editMessageText('❌ Task not found');
      return;
    }
    
    let message = '🌳 *Task Tree View*\n\n';
    
    // Show parent if exists
    if (task.parent) {
      message += `⬆️ Parent: ${task.parent.title}\n\n`;
    }
    
    // Current task
    const progress = task.progressPercentage || 0;
    const progressBar = '▓'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
    
    message += `📌 *${task.title}*\n`;
    message += `Progress: ${progressBar} ${progress}%\n`;
    
    if (task.estimatedMinutes) {
      message += `Time: ~${task.estimatedMinutes}min\n`;
    }
    
    if (task.energy) {
      const energyBar = '⚡'.repeat(task.energy);
      message += `Energy: ${energyBar} (${task.energy}/5)\n`;
    }
    
    // Show subtasks
    if (task.subtasks && task.subtasks.length > 0) {
      message += `\n📋 Subtasks (${task.subtasks.length}):\n`;
      
      task.subtasks.forEach((subtask, index) => {
        const check = subtask.status === 'DONE' ? '✅' : '⬜';
        const indent = '  ';
        message += `${indent}${check} ${index + 1}. ${subtask.title}`;
        
        if (subtask.progressPercentage) {
          message += ` (${subtask.progressPercentage}%)`;
        }
        message += '\n';
        
        // Show sub-subtasks if any
        if (subtask.subtasks && subtask.subtasks.length > 0) {
          subtask.subtasks.forEach(sst => {
            const scheck = sst.status === 'DONE' ? '✅' : '⬜';
            message += `${indent}${indent}${scheck} - ${sst.title}\n`;
          });
        }
      });
    }
    
    // Show dependencies if any
    if (task.dependencies && task.dependencies.length > 0) {
      message += `\n🔗 Dependencies: ${task.dependencies.length} tasks\n`;
    }
    
    const buttons = [
      [
        Markup.button.callback('✏️ Update Progress', `update_progress_${taskId}`),
        Markup.button.callback('➕ Add Subtask', `add_subtask_${taskId}`)
      ],
      [
        Markup.button.callback('⬅️ Back', `task_action_${taskId}`),
        Markup.button.callback('🏠 Main Menu', 'main_menu')
      ]
    ];
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons
      }
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show task tree', { 
      userId: ctx.from.id,
      taskId,
      error: error.message 
    }, error);
    timer.end();
  }
}

// === SMART SUGGESTIONS (Basic S_simple) ===
export async function handleSmartSuggestions(ctx, logger, sessions) {
  const timer = logger.startTimer('smart_suggestions');
  
  await ctx.answerCbQuery();
  logger.botInteraction(ctx.from.id, ctx.from.username, 'smart_suggestions');
  
  try {
    // Get user's current energy level (from session or ask)
    const chatId = ctx.chat.id.toString();
    const session = await sessions.getSession(chatId) || {};
    const currentEnergy = session.currentEnergy || 3;
    const currentContext = session.currentContext || '@anywhere';
    
    // Get tasks
    const tasksResponse = await sendToAPI('GET', '/tasks?status=TODO');
    const allTasks = tasksResponse.tasks || [];
    
    // Simple scoring based on SoT formula
    const now = DateTime.now();
    const scoredTasks = allTasks.map(task => {
      let score = 0;
      
      // D: Deadline proximity (simplified)
      if (task.dueDate) {
        const hoursUntilDue = DateTime.fromISO(task.dueDate).diff(now, 'hours').hours;
        if (hoursUntilDue < 24) score += 10;
        else if (hoursUntilDue < 72) score += 5;
        else if (hoursUntilDue < 168) score += 2;
      }
      
      // Priority multiplier
      score *= (6 - task.priority); // Invert since lower priority number = higher importance
      
      // C: Context fit
      if (task.contexts?.includes(currentContext)) score += 1;
      else if (task.contexts?.some(c => c.includes('anywhere'))) score += 0.5;
      
      // E: Energy fit
      if (task.energy && Math.abs(task.energy - currentEnergy) <= 1) score += 1;
      
      // R: Risk/penalties (simplified - just postpone count)
      score -= (task.postponeCount || 0) * 0.5;
      
      return { ...task, score };
    });
    
    // Sort by score and get top 5
    const topTasks = scoredTasks
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    let message = '🤖 *Smart Task Suggestions*\n\n';
    message += `Energy Level: ${'⚡'.repeat(currentEnergy)}${'💤'.repeat(5 - currentEnergy)} (${currentEnergy}/5)\n`;
    message += `Context: ${currentContext}\n\n`;
    
    if (topTasks.length === 0) {
      message += 'No tasks to suggest right now!\n';
    } else {
      message += 'Based on your current state:\n\n';
      
      topTasks.forEach((task, index) => {
        const emoji = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
        message += `${emoji} *${task.title}*\n`;
        
        // Show rationale
        const reasons = [];
        if (task.dueDate) {
          const hours = DateTime.fromISO(task.dueDate).diff(now, 'hours').hours;
          if (hours < 24) reasons.push('⏰ Due soon!');
          else if (hours < 72) reasons.push('📅 Due this week');
        }
        if (task.contexts?.includes(currentContext)) {
          reasons.push(`📍 Fits ${currentContext}`);
        }
        if (task.energy && Math.abs(task.energy - currentEnergy) <= 1) {
          reasons.push('⚡ Energy match');
        }
        if (task.postponeCount > 0) {
          reasons.push(`🔄 Postponed ${task.postponeCount}x`);
        }
        
        if (reasons.length > 0) {
          message += `   ${reasons.join(' • ')}\n`;
        }
        
        if (task.estimatedMinutes) {
          message += `   ⏱️ ~${task.estimatedMinutes}min\n`;
        }
        message += '\n';
      });
    }
    
    const buttons = [
      [
        Markup.button.callback('⚡ Change Energy', 'set_energy_level'),
        Markup.button.callback('🌍 Change Context', 'contexts_menu')
      ],
      [
        Markup.button.callback('🔄 Refresh', 'smart_suggestions'),
        Markup.button.callback('🏠 Main Menu', 'main_menu')
      ]
    ];
    
    if (topTasks.length > 0) {
      // Add quick schedule button for top task
      buttons.unshift([
        Markup.button.callback(
          `⏰ Schedule "${topTasks[0].title.substring(0, 20)}..."`,
          `task_schedule_${topTasks[0].id}`
        )
      ]);
    }
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons
      }
    });
    
    timer.end();
  } catch (error) {
    logger.error('Failed to show smart suggestions', { 
      userId: ctx.from.id,
      error: error.message 
    }, error);
    timer.end();
  }
}

// Set energy level
export async function handleSetEnergyLevel(ctx, logger, sessions) {
  const timer = logger.startTimer('set_energy_level');
  
  await ctx.answerCbQuery();
  logger.botInteraction(ctx.from.id, ctx.from.username, 'set_energy_level');
  
  const message = '⚡ *Set Your Energy Level*\n\nHow energetic do you feel right now?';
  
  const buttons = [
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
  ];
  
  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: buttons
    }
  });
  
  timer.end();
}

// Handle energy level selection
export async function handleEnergySelection(ctx, level, logger, sessions) {
  const timer = logger.startTimer('energy_selection');
  
  await ctx.answerCbQuery(`Energy set to ${level}/5`);
  
  const chatId = ctx.chat.id.toString();
  logger.botInteraction(ctx.from.id, ctx.from.username, 'energy_selected', { level });
  
  // Update session
  await sessions.updateSession(chatId, { currentEnergy: level });
  
  // Go back to smart suggestions with new energy
  await handleSmartSuggestions(ctx, logger, sessions);
  
  timer.end();
}