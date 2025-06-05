const noteService = require('../services/note.service');
const githubService = require('../services/github.service');
const config = require('../config');
const logger = require('../utils/logger');

const commands = {
  async start(bot, msg) {
    const chatId = msg.chat.id;
    const welcome = `
🧠 Welcome to NeuroBoost Bot!

I'm your personal note-taking assistant, designed to help you capture thoughts quickly and send them directly to your Obsidian vault.

Here are the available commands:
• /note <title> - Create a note with a title
• /quick <content> - Quick note with auto-generated title  
• /tag #tag1 #tag2 <content> - Create note with tags
• /list - Show your 5 most recent notes
• /status - Check bot and connection status
• /help - Show this help message

You can also just send me any text message, and I'll save it as a quick note!

📁 Notes are saved to: ${config.obsidian.fleetingPath}
`;
    
    await bot.sendMessage(chatId, welcome, { parse_mode: 'HTML' });
  },

  async help(bot, msg) {
    const chatId = msg.chat.id;
    const helpText = `
📖 <b>NeuroBoost Bot Commands</b>

<b>Creating Notes:</b>
• /note <title> - Create with custom title
  Example: /note Meeting ideas
  
• /quick <content> - Auto-generated title
  Example: /quick Remember to buy milk
  
• /tag #tag1 #tag2 <content> - Add tags
  Example: /tag #work #urgent Fix login bug

• Or just send text without any command!

<b>Other Commands:</b>
• /list - Show recent notes
• /status - Check connection status
• /help - This message

<b>Tips:</b>
• Keep titles short (under 50 chars)
• Use tags to organize notes
• Notes sync automatically to GitHub
`;
    
    await bot.sendMessage(chatId, helpText, { parse_mode: 'HTML' });
  },

  async createNote(bot, msg, match) {
    const chatId = msg.chat.id;
    const title = match[1];
    
    // Send typing indicator
    bot.sendChatAction(chatId, 'typing');
    
    const result = await noteService.createNote(title, title);
    
    if (result.success) {
      await bot.sendMessage(
        chatId, 
        `✅ Created note: <code>${result.filename}</code>`,
        { parse_mode: 'HTML' }
      );
    } else {
      await bot.sendMessage(
        chatId,
        `❌ Error creating note: ${result.error}`
      );
    }
  },

  async quickNote(bot, msg, match) {
    const chatId = msg.chat.id;
    const content = match[1];
    
    if (!content || content.trim().length === 0) {
      return bot.sendMessage(chatId, '⚠️ Note content cannot be empty');
    }
    
    // Send typing indicator
    bot.sendChatAction(chatId, 'typing');
    
    const result = await noteService.createFromMessage(content);
    
    if (result.success) {
      await bot.sendMessage(
        chatId,
        `✅ Created note: <code>${result.filename}</code>\n💡 Tip: Use /note <title> to set a custom title`,
        { parse_mode: 'HTML' }
      );
    } else {
      await bot.sendMessage(
        chatId,
        `❌ Error creating note: ${result.error}`
      );
    }
  },

  async tagNote(bot, msg, match) {
    const chatId = msg.chat.id;
    const input = match[1];
    
    const { tags, content } = noteService.parseTagCommand(input);
    
    if (!content || content.trim().length === 0) {
      return bot.sendMessage(chatId, '⚠️ Note content cannot be empty');
    }
    
    // Send typing indicator
    bot.sendChatAction(chatId, 'typing');
    
    // Use first 50 chars of content as title
    const title = content.slice(0, 50).replace(/\n/g, ' ');
    const result = await noteService.createNote(title, content, tags);
    
    if (result.success) {
      await bot.sendMessage(
        chatId,
        `✅ Created note: <code>${result.filename}</code>\n🏷️ Tagged with: ${tags.map(t => `#${t}`).join(' ')}`,
        { parse_mode: 'HTML' }
      );
    } else {
      await bot.sendMessage(
        chatId,
        `❌ Error creating note: ${result.error}`
      );
    }
  },

  async listNotes(bot, msg) {
    const chatId = msg.chat.id;
    const recentFiles = githubService.getRecentFiles(5);
    
    if (recentFiles.length === 0) {
      return bot.sendMessage(chatId, '📭 No recent notes found in this session');
    }
    
    let message = '📝 <b>Recent Notes:</b>\n\n';
    recentFiles.forEach((file, index) => {
      const timestamp = new Date(file.timestamp).toLocaleString();
      message += `${index + 1}. <code>${file.filename}</code>\n   📅 ${timestamp}\n\n`;
    });
    
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  },

  async status(bot, msg) {
    const chatId = msg.chat.id;
    
    // Send typing indicator
    bot.sendChatAction(chatId, 'typing');
    
    const isConnected = await githubService.checkConnection();
    
    const status = `
🤖 <b>NeuroBoost Bot Status</b>

<b>Bot:</b> ✅ Online
<b>GitHub:</b> ${isConnected ? '✅ Connected' : '❌ Disconnected'}
<b>Repository:</b> ${config.github.owner}/${config.github.repo}
<b>Branch:</b> ${config.github.branch}
<b>Notes Path:</b> ${config.obsidian.fleetingPath}
<b>Environment:</b> ${config.app.env}
<b>Uptime:</b> ${Math.floor(process.uptime() / 60)} minutes
`;
    
    await bot.sendMessage(chatId, status, { parse_mode: 'HTML' });
  }
};

module.exports = commands;