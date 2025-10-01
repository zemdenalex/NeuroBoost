export function registerTextHandlers(bot, handlers, sessions, logger) {
  
  bot.hears('📋 Tasks', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'tasks_button');
    await handlers.listTasks(ctx, 0, 'all');
  });

  bot.hears('📝 Quick Note', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'quick_note_button');
    await handlers.startQuickNote(ctx);
  });

  bot.hears('➕ New Task', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'new_task_button');
    await handlers.startNewTask(ctx);
  });

  bot.hears('📊 Stats', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'stats_button');
    await handlers.showStats(ctx);
  });

  bot.hears('🤖 Smart Suggestions', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'smart_suggestions_button');
    await handlers.showSmartSuggestions(ctx);
  });

  bot.hears('🌍 Contexts', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'contexts_button');
    await handlers.showContexts(ctx);
  });

  bot.hears('🔄 Routines', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'routines_button');
    await handlers.showRoutines(ctx);
  });

  bot.hears('🎨 Layers', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'layers_button');
    await handlers.showLayers(ctx);
  });

  bot.hears('📅 Calendar', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'calendar_button');
    await handlers.showCalendar(ctx);
  });

  bot.hears('⚙️ Settings', async (ctx) => {
    logger.botInteraction(ctx.from.id, ctx.from.username, 'settings_button');
    await handlers.showSettings(ctx);
  });

  bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const text = ctx.message.text;
    const session = await sessions.getSession(chatId);
    
    logger.botInteraction(ctx.from.id, ctx.from.username, 'text_message', {
      textLength: text.length,
      hasSession: !!session,
      sessionState: session?.state
    });
    
    if (!session) {
      logger.debug('No session, starting New Task wizard', { 
        userId: ctx.from.id, 
        textLength: text.length 
      });
      await handlers.startNewTaskFromText(ctx, text.trim());
      return;
    }
    
    try {
      switch (session.state) {
        case 'quick_note':
          await handlers.handleQuickNoteText(ctx, text, session);
          break;
        
        case 'new_task':
          await handlers.handleNewTaskText(ctx, text, session);
          break;
        
        case 'new_event':
          await handlers.handleNewEventText(ctx, text, session);
          break;
        
        default:
          logger.warn('Unknown session state', { 
            userId: ctx.from.id, 
            state: session.state 
          });
          await handlers.handleUnknownSession(ctx);
      }
    } catch (error) {
      logger.error('Failed to handle text in session', { 
        userId: ctx.from.id, 
        sessionState: session.state, 
        error: error.message 
      }, error);
      await handlers.handleTextError(ctx);
    }
  });
}