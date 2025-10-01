export function registerCommands(bot, handlers, logger) {
  bot.command('start', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'start_command');
    await handlers.start(ctx);
  });

  bot.command('help', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'help_command');
    await handlers.help(ctx);
  });

  bot.command('tasks', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'tasks_command');
    await handlers.listTasks(ctx, 0, 'all');
  });

  bot.command('newtask', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'newtask_command');
    await handlers.startNewTask(ctx);
  });

  bot.command('note', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'note_command');
    await handlers.startQuickNote(ctx);
  });

  bot.command('today', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'today_command');
    await handlers.showTodaysFocus(ctx);
  });

  bot.command('week', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'week_command');
    await handlers.showWeekView(ctx);
  });

  bot.command('stats', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'stats_command');
    await handlers.showStats(ctx);
  });

  bot.command('calendar', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'calendar_command');
    await handlers.showCalendar(ctx);
  });

  bot.command('contexts', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'contexts_command');
    await handlers.showContexts(ctx);
  });

  bot.command('routines', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'routines_command');
    await handlers.showRoutines(ctx);
  });

  bot.command('cancel', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'cancel_command');
    await handlers.cancelCurrentFlow(ctx);
  });
}