require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const logger = require('./utils/logger');
const commands = require('./commands');
const githubService = require('./services/github.service');

// Initialize bot
const bot = new TelegramBot(config.telegram.token, { polling: true });

// Authentication middleware
const authenticate = (msg) => {
  const userId = msg.from.id.toString();
  if (userId !== config.telegram.allowedUserId) {
    bot.sendMessage(msg.chat.id, '❌ Unauthorized access. This bot is private.');
    return false;
  }
  return true;
};

// Command registration
bot.onText(/\/start/, (msg) => {
  if (!authenticate(msg)) return;
  commands.start(bot, msg);
});

bot.onText(/\/help/, (msg) => {
  if (!authenticate(msg)) return;
  commands.help(bot, msg);
});

bot.onText(/\/note (.+)/, (msg, match) => {
  if (!authenticate(msg)) return;
  commands.createNote(bot, msg, match);
});

bot.onText(/\/quick (.+)/, (msg, match) => {
  if (!authenticate(msg)) return;
  commands.quickNote(bot, msg, match);
});

bot.onText(/\/tag (.+)/, (msg, match) => {
  if (!authenticate(msg)) return;
  commands.tagNote(bot, msg, match);
});

bot.onText(/\/list/, (msg) => {
  if (!authenticate(msg)) return;
  commands.listNotes(bot, msg);
});

bot.onText(/\/status/, (msg) => {
  if (!authenticate(msg)) return;
  commands.status(bot, msg);
});

// Handle non-command messages
bot.on('message', (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  if (!authenticate(msg)) return;
  
  // Treat non-command messages as quick notes
  commands.quickNote(bot, msg, [null, msg.text]);
});

// Error handling
bot.on('polling_error', (error) => {
  logger.error('Polling error:', error);
});

bot.on('error', (error) => {
  logger.error('Bot error:', error);
});

// Startup
async function start() {
  try {
    logger.info('🚀 Starting NeuroBoost Bot...');
    
    // Test GitHub connection
    const isConnected = await githubService.checkConnection();
    if (!isConnected) {
      logger.error('Failed to connect to GitHub. Check your credentials.');
      process.exit(1);
    }
    
    logger.info('✅ GitHub connection successful');
    logger.info('🤖 NeuroBoost Bot is running!');
    logger.info(`📝 Notes will be saved to: ${config.github.repo}/${config.obsidian.fleetingPath}`);
  } catch (error) {
    logger.error('Startup error:', error);
    process.exit(1);
  }
}

start();