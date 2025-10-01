// apps/bot/src/index.mjs
// NeuroBoost Telegram Bot - Main Entry Point
// Initializes bot, registers routes, starts health server

import { Telegraf } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createServer } from 'http';
import { createLogger, SessionManager, startPeriodicCleanup } from './utils/index.mjs';
import { registerAllRoutes } from './routes/index.mjs';
import * as handlers from './handlers/index.mjs';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

// Initialize logger
const logger = createLogger('bot', {
  level: process.env.LOG_LEVEL || 'info',
  logToFile: process.env.NODE_ENV !== 'test',
  logToConsole: true
});

// Validate bot token
const raw = process.env.TELEGRAM_BOT_TOKEN || '';
const token = raw.trim();
if (!token) {
  logger.error('TELEGRAM_BOT_TOKEN is missing or empty');
  process.exit(1);
}
if (!/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(token)) {
  logger.warn('TELEGRAM_BOT_TOKEN format looks unusual');
}

// Initialize core services
const bot = new Telegraf(token);
const prisma = new PrismaClient();
const sessions = new SessionManager(prisma);

const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const BOT_PORT = process.env.BOT_PORT || 3002;

logger.info('NeuroBoost Telegram bot initializing', {
  apiBase: API_BASE,
  port: BOT_PORT,
  nodeEnv: process.env.NODE_ENV || 'development'
});

// Attach sessions to context for handlers
bot.use(async (ctx, next) => {
  ctx.sessions = sessions;
  await next();
});

// Global error handler for bot
bot.catch((err, ctx) => {
  logger.error('Bot error', {
    updateType: ctx.updateType,
    userId: ctx.from?.id,
    username: ctx.from?.username,
    chatId: ctx.chat?.id,
    error: err.message
  }, err);
  
  try {
    ctx.reply('❌ Something went wrong. Please try again.').catch(() => {
      logger.error('Failed to send error message to user', { userId: ctx.from?.id });
    });
  } catch (replyError) {
    logger.error('Error in error handler', { error: replyError.message }, replyError);
  }
});

// Register all routes (commands, text handlers, callbacks)
registerAllRoutes(bot, handlers, sessions, logger);

logger.info('All routes registered successfully');

// Health check server
const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${BOT_PORT}`);
  
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      ok: true, 
      bot: 'running',
      timestamp: new Date().toISOString()
    }));
  } else if (url.pathname === '/logs/recent') {
    try {
      const lines = parseInt(url.searchParams.get('lines')) || 50;
      const logs = logger.getRecentLogs(lines);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ logs, total: logs.length }));
    } catch (error) {
      logger.error('Failed to get recent logs via HTTP', { error: error.message }, error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to get logs' }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(BOT_PORT, () => {
  logger.info('Bot health check server started', { port: BOT_PORT });
});

// Start periodic cleanup (sessions, old data)
startPeriodicCleanup();

// Launch bot
bot.launch()
  .then(() => {
    logger.info('NeuroBoost Telegram bot started successfully', {
      botUsername: bot.botInfo?.username,
      apiBase: API_BASE,
      environment: process.env.NODE_ENV || 'development'
    });
  })
  .catch(err => {
    logger.error('Failed to start bot', { error: err.message }, err);
    process.exit(1);
  });

// Graceful shutdown handlers
const shutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down bot gracefully`);
  
  Promise.all([
    bot.stop(signal),
    prisma.$disconnect(),
    new Promise((resolve) => server.close(resolve))
  ])
    .then(() => {
      logger.info('Bot shutdown complete');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error during shutdown', { error: error.message }, error);
      process.exit(1);
    });
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in bot', { error: error.message }, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection in bot', { 
    reason: String(reason), 
    promise: String(promise) 
  });
});

// Export for testing
export { bot, prisma, sessions, logger };