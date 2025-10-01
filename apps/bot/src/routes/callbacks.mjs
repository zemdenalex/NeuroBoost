export function registerCallbacks(bot, handlers, logger) {
  
  bot.action('noop', async (ctx) => {
    await ctx.answerCbQuery();
  });

  bot.action('main_menu', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'main_menu_callback');
    await handlers.showMainMenu(ctx);
  });

  bot.action('quick_note', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'quick_note_callback');
    await handlers.startQuickNote(ctx, true);
  });

  bot.action('new_task', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'new_task_callback');
    await handlers.startNewTask(ctx, true);
  });

  bot.action('new_event', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'new_event_callback');
    await handlers.startNewEvent(ctx);
  });

  bot.action(/^task_priority_(\d)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const priority = parseInt(ctx.match[1]);
    logger.botInteraction(ctx.from.id, ctx.from.username, 'task_priority_selected', { priority });
    await handlers.selectTaskPriority(ctx, priority);
  });

  bot.action('save_quick_note', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'save_quick_note_callback');
    await handlers.confirmQuickNote(ctx);
  });

  bot.action('plan_today', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'plan_today_callback');
    await handlers.showPlanToday(ctx);
  });

  bot.action('stats', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'stats_callback');
    await handlers.showStats(ctx);
  });

  bot.action('settings', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'settings_callback');
    await handlers.showSettings(ctx);
  });

  bot.action('today_focus', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'today_focus_callback');
    await handlers.showTodaysFocus(ctx);
  });

  bot.action('top_tasks', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'top_tasks_callback');
    await handlers.showTopTasks(ctx);
  });

  bot.action('calendar_view', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'calendar_view_callback');
    await handlers.showCalendar(ctx);
  });

  bot.action(/^calendar_(prev|next)_(\d{4})_(\d{1,2})$/, async (ctx) => {
    await ctx.answerCbQuery();
    const direction = ctx.match[1];
    const year = parseInt(ctx.match[2]);
    const month = parseInt(ctx.match[3]);
    logger.botInteraction(ctx.from.id, ctx.from.username, 'calendar_navigation', { direction, year, month });
    await handlers.navigateCalendar(ctx, direction, year, month);
  });

  bot.action(/^calendar_day_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const dateStr = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'calendar_day_view', { date: dateStr });
    await handlers.showDayView(ctx, dateStr);
  });

  bot.action(/^task_action_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const taskId = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'task_action', { taskId });
    await handlers.showTaskAction(ctx, taskId);
  });

  bot.action(/^task_schedule_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const taskId = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'task_schedule', { taskId });
    await handlers.showScheduleOptions(ctx, taskId);
  });

  bot.action(/^task_schedule_later_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const taskId = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'task_schedule_later', { taskId });
    await handlers.showTimeSlots(ctx, taskId);
  });

  bot.action(/^schedule_task_(.+)_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const taskId = ctx.match[1];
    const durationMinutes = parseInt(ctx.match[2]);
    logger.botInteraction(ctx.from.id, ctx.from.username, 'schedule_task_duration', { taskId, durationMinutes });
    await handlers.scheduleTaskWithDuration(ctx, taskId, durationMinutes);
  });

  bot.action(/^schedule_task_(.+)_at_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const taskId = ctx.match[1];
    const timeISO = ctx.match[2];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'schedule_task_at_time', { taskId, timeISO });
    await handlers.scheduleTaskAtTime(ctx, taskId, timeISO);
  });

  bot.action(/^task_done_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const taskId = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'task_done', { taskId });
    await handlers.markTaskDone(ctx, taskId);
  });

  bot.action(/^task_edit_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const taskId = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'task_edit', { taskId });
    await handlers.startEditTask(ctx, taskId);
  });

  bot.action(/^task_hide_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const taskId = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'task_hide', { taskId });
    await handlers.hideTask(ctx, taskId);
  });

  bot.action(/^task_delete_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const taskId = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'task_delete', { taskId });
    await handlers.confirmDeleteTask(ctx, taskId);
  });

  bot.action(/^tasks_page_(\d+)_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const page = parseInt(ctx.match[1]);
    const filter = ctx.match[2];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'tasks_page', { page, filter });
    await handlers.listTasks(ctx, page, filter);
  });

  bot.action('tasks_filter', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'tasks_filter');
    await handlers.showTasksFilter(ctx);
  });

  bot.action(/^tasks_filter_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const filter = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'tasks_filter_selected', { filter });
    await handlers.listTasks(ctx, 0, filter);
  });

  bot.action('work_hours', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'work_hours');
    await handlers.showWorkHours(ctx);
  });

  bot.action(/^workhours_start_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const startHour = parseInt(ctx.match[1]);
    logger.botInteraction(ctx.from.id, ctx.from.username, 'workhours_start', { startHour });
    await handlers.setWorkHoursStart(ctx, startHour);
  });

  bot.action(/^workhours_end_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const endHour = parseInt(ctx.match[1]);
    logger.botInteraction(ctx.from.id, ctx.from.username, 'workhours_end', { endHour });
    await handlers.setWorkHoursEnd(ctx, endHour);
  });

  bot.action('work_days_config', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'work_days_config');
    await handlers.showWorkDaysConfig(ctx);
  });

  bot.action(/^workday_toggle_(\d)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const dayNumber = parseInt(ctx.match[1]);
    logger.botInteraction(ctx.from.id, ctx.from.username, 'workday_toggle', { dayNumber });
    await handlers.toggleWorkDay(ctx, dayNumber);
  });

  bot.action('workdays_reset', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'workdays_reset');
    await handlers.resetWorkDays(ctx);
  });

  bot.action('workdays_save', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'workdays_save');
    await handlers.saveWorkDays(ctx);
  });

  bot.action('contexts_menu', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'contexts_menu');
    await handlers.showContexts(ctx);
  });

  bot.action(/^set_context_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const contextName = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'set_context', { contextName });
    await handlers.setContext(ctx, contextName);
  });

  bot.action('tasks_by_context', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'tasks_by_context');
    await handlers.showTasksByContext(ctx);
  });

  bot.action('layers_menu', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'layers_menu');
    await handlers.showLayers(ctx);
  });

  bot.action(/^toggle_layer_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const layerId = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'toggle_layer', { layerId });
    await handlers.toggleLayer(ctx, layerId);
  });

  bot.action('layers_show_all', async (ctx) => {
    await ctx.answerCbQuery('Showing all layers');
    logger.botInteraction(ctx.from.id, ctx.from.username, 'layers_show_all');
    await handlers.showAllLayers(ctx);
  });

  bot.action('layers_hide_all', async (ctx) => {
    await ctx.answerCbQuery('Hiding all layers');
    logger.botInteraction(ctx.from.id, ctx.from.username, 'layers_hide_all');
    await handlers.hideAllLayers(ctx);
  });

  bot.action('routines_menu', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'routines_menu');
    await handlers.showRoutines(ctx);
  });

  bot.action(/^activate_routine_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const routineId = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'activate_routine', { routineId });
    await handlers.activateRoutine(ctx, routineId);
  });

  bot.action('routine_stats', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'routine_stats');
    await handlers.showRoutineStats(ctx);
  });

  bot.action('manage_routines', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'manage_routines');
    await handlers.showManageRoutines(ctx);
  });

  bot.action(/^view_tree_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const taskId = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'view_tree', { taskId });
    await handlers.showTaskTree(ctx, taskId);
  });

  bot.action(/^update_progress_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const taskId = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'update_progress', { taskId });
    await handlers.showUpdateProgress(ctx, taskId);
  });

  bot.action('smart_suggestions', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'smart_suggestions');
    await handlers.showSmartSuggestions(ctx);
  });

  bot.action('set_energy_level', async (ctx) => {
    await ctx.answerCbQuery();
    logger.botInteraction(ctx.from.id, ctx.from.username, 'set_energy_level');
    await handlers.showEnergyLevelSelector(ctx);
  });

  bot.action(/^energy_(\d)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const level = parseInt(ctx.match[1]);
    logger.botInteraction(ctx.from.id, ctx.from.username, 'energy_selected', { level });
    await handlers.setEnergyLevel(ctx, level);
  });

  bot.action(/^schedule_by_energy_(high|low)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const energyType = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'schedule_by_energy', { energyType });
    await handlers.scheduleByEnergy(ctx, energyType);
  });

  bot.action(/^new_event_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const date = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'new_event_date', { date });
    await handlers.startNewEventForDate(ctx, date);
  });

  bot.action(/^day_tasks_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const date = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'day_tasks', { date });
    await handlers.showDayTasks(ctx, date);
  });

  bot.action(/^day_events_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const date = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'day_events', { date });
    await handlers.showDayEvents(ctx, date);
  });

  bot.action(/^day_stats_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const date = ctx.match[1];
    logger.botInteraction(ctx.from.id, ctx.from.username, 'day_stats', { date });
    await handlers.showDayStats(ctx, date);
  });
}