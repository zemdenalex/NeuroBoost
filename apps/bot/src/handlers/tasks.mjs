import { sendToAPI } from '../utils/api-client.mjs';
import { formatTask } from '../utils/formatters.mjs';
import { createMainReplyKeyboard, createTaskFilterKeyboard, createTaskActionEnhancedKeyboard } from '../keyboards/index.mjs';
import { startNewTaskWizard, handleTaskTitleInput, handleTaskPrioritySelection } from '../wizards/index.mjs';
import { PRIORITY_EMOJIS, PRIORITY_NAMES, PAGE_SIZE, getPriorityDisplay } from '../constants.mjs';

export async function listTasks(ctx, page = 0, filter = 'all') {
  const isCallback = ctx.updateType === 'callback_query';
  
  try {
    const tasksResponse = await sendToAPI('GET', '/tasks?status=TODO');
    let tasks = tasksResponse.tasks || [];

    if (filter !== 'all') {
      const pr = parseInt(filter);
      tasks = tasks.filter(t => t.priority === pr);
    }

    tasks.sort((a, b) => a.priority - b.priority || (a.createdAt || '').localeCompare(b.createdAt || ''));

    const total = tasks.length;
    const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;
    const currentPage = Math.max(0, Math.min(page, totalPages - 1));
    const startIndex = currentPage * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, total);
    const pageTasks = tasks.slice(startIndex, endIndex);

    let message = `📋 *Tasks* (${total} total`;
    if (filter !== 'all') {
      const priorityInfo = getPriorityDisplay(parseInt(filter));
      message += ` — ${priorityInfo.emoji} ${priorityInfo.name}`;
    }
    message += `)\nPage ${currentPage + 1}/${totalPages}\n\n`;

    if (total === 0) {
      message += '✨ No tasks found!\n';
    } else {
      let lastPriority = null;
      for (const task of pageTasks) {
        if (task.priority !== lastPriority) {
          lastPriority = task.priority;
          const totalInThisPriority = tasks.filter(t => t.priority === task.priority).length;
          const priorityInfo = getPriorityDisplay(task.priority);
          message += `\n${priorityInfo.emoji} *${priorityInfo.name}* (${totalInThisPriority})\n`;
        }
        const title = task.title.length > 35 ? task.title.substring(0, 35) + '…' : task.title;
        message += `• ${title}\n`;
      }
    }

    const buttons = [];

    if (pageTasks.length > 0) {
      for (let i = 0; i < Math.min(5, pageTasks.length); i++) {
        const task = pageTasks[i];
        const priorityInfo = getPriorityDisplay(task.priority);
        const title = task.title.length > 25 ? task.title.substring(0, 25) + '…' : task.title;
        buttons.push([
          { text: `${priorityInfo.emoji} ${title}`, callback_data: `task_action_${task.id}` }
        ]);
      }
    }

    const navRow = [];
    if (currentPage > 0) {
      navRow.push({ text: '⬅️ Prev', callback_data: `tasks_page_${currentPage - 1}_${filter}` });
    }
    if (endIndex < total) {
      navRow.push({ text: '➡️ Next', callback_data: `tasks_page_${currentPage + 1}_${filter}` });
    }
    if (navRow.length > 0) {
      buttons.push(navRow);
    }

    buttons.push([
      { text: '🎯 Filter', callback_data: 'tasks_filter' },
      { text: '➕ New Task', callback_data: 'new_task' }
    ]);

    buttons.push([
      { text: '🏠 Main Menu', callback_data: 'main_menu' }
    ]);

    if (isCallback) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    }
  } catch (error) {
    const errorMsg = '❌ Failed to load tasks.';
    if (isCallback) {
      await ctx.editMessageText(errorMsg, {
        reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
      });
    } else {
      await ctx.reply(errorMsg, createMainReplyKeyboard());
    }
  }
}

export async function showTasksFilter(ctx) {
  await ctx.editMessageText('🎯 *Filter Tasks by Priority*', {
    parse_mode: 'Markdown',
    ...createTaskFilterKeyboard()
  });
}

export async function showTaskAction(ctx, taskId) {
  try {
    const response = await sendToAPI('GET', `/tasks`);
    const task = response.tasks?.find(t => t.id === taskId);

    if (!task) {
      await ctx.editMessageText('❌ Task not found.', {
        reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
      });
      return;
    }

    const priorityInfo = getPriorityDisplay(task.priority);

    let message = `${priorityInfo.emoji} *Task Details*\n\n`;
    message += `📋 ${task.title}\n`;
    message += `🎯 Priority: ${task.priority} (${priorityInfo.name})\n`;

    if (task.energy) {
      message += `⚡ Energy: ${'⚡'.repeat(task.energy)} (${task.energy}/5)\n`;
    }

    if (task.contexts && task.contexts.length > 0) {
      message += `🌍 Contexts: ${task.contexts.join(', ')}\n`;
    }

    if (task.description) {
      const desc = task.description.length > 100 ? task.description.substring(0, 100) + '...' : task.description;
      message += `\n💭 ${desc}\n`;
    }

    if (task.estimatedMinutes) {
      message += `⏱️ Estimated: ${task.estimatedMinutes} minutes\n`;
    }

    if (task.tags && task.tags.length > 0) {
      message += `🏷️ ${task.tags.map(tag => '#' + tag).join(' ')}\n`;
    }

    const hasSubtasks = (task.subtasks && task.subtasks.length > 0) || task.parentTaskId;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...createTaskActionEnhancedKeyboard(taskId, hasSubtasks)
    });
  } catch (error) {
    await ctx.editMessageText('❌ Failed to load task details.', {
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
    });
  }
}

export async function startNewTask(ctx, isInline = false) {
  await startNewTaskWizard(ctx, ctx.sessions, null, isInline);
}

export async function startNewTaskFromText(ctx, text) {
  await startNewTaskWizard(ctx, ctx.sessions, text, false);
}

export async function handleNewTaskText(ctx, text, session) {
  if (session.data.step === 'title') {
    await handleTaskTitleInput(ctx, text, ctx.sessions);
  }
}

export async function selectTaskPriority(ctx, priority) {
  const taskData = await handleTaskPrioritySelection(ctx, priority, ctx.sessions);
  
  if (!taskData) {
    return;
  }
  
  try {
    const result = await sendToAPI('POST', '/tasks', taskData);
    
    const priorityInfo = getPriorityDisplay(priority);
    
    await ctx.editMessageText(
      `✅ *Task Created!*\n\n📋 ${taskData.title}\n🎯 Priority: ${priority} (${priorityInfo.name})\n\nTask ID: \`${result.task.id}\``,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 New Task', callback_data: 'new_task' }],
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
          ]
        }
      }
    );
  } catch (error) {
    await ctx.editMessageText('❌ Failed to create task. Please try again.', {
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
    });
  }
}

export async function markTaskDone(ctx, taskId) {
  try {
    await sendToAPI('PATCH', `/tasks/${taskId}`, { status: 'DONE' });
    
    await ctx.editMessageText(
      '✅ *Task Completed!*\n\nGreat job! 🎉\n\nThe task has been marked as done.',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 More Tasks', callback_data: 'top_tasks' },
              { text: '🏠 Main Menu', callback_data: 'main_menu' }
            ]
          ]
        }
      }
    );
  } catch (error) {
    await ctx.editMessageText('❌ Failed to update task.', {
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
    });
  }
}

export async function showTopTasks(ctx) {
  await ctx.reply('📋 Top tasks feature coming soon! Use /tasks to see all tasks.', createMainReplyKeyboard());
}

export async function startEditTask(ctx, taskId) {
  await ctx.editMessageText('✏️ Task editing coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: `task_action_${taskId}` }]
      ]
    }
  });
}

export async function hideTask(ctx, taskId) {
  await ctx.editMessageText('👁️ Task hiding coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: `task_action_${taskId}` }]
      ]
    }
  });
}

export async function confirmDeleteTask(ctx, taskId) {
  await ctx.editMessageText('🗑️ Task deletion coming in v0.4.x!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: `task_action_${taskId}` }]
      ]
    }
  });
}