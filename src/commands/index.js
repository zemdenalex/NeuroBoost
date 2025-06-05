const noteService = require('../services/note.service');
const githubService = require('../services/github.service');
const config = require('../config');
const logger = require('../utils/logger');

const commands = {
  async start(bot, msg) {
    const chatId = msg.chat.id;
    const welcome = `
🧠 *Welcome to NeuroBoost Bot!*

I'm your personal note-taking assistant, designed to help you capture thoughts quickly and send them directly to your Obsidian vault.

Here are the available commands:
• /note <title> – Create a note with a title  
• /quick <content> – Quick note with auto-generated title  
• /tag #tag1 #tag2 <content> – Create note with tags  
• /list – Show your 5 most recent notes  
• /status – Check bot and connection status  
• /help – Show this help message  

You can also just send me any text message, and I'll save it as a quick note!

📁 _Notes are saved to:_ \`${config.obsidian.fleetingPath}\`
    `;

    await bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown' });
  },

  async help(bot, msg) {
    const chatId = msg.chat.id;
    const helpText = `
📖 *NeuroBoost Bot Commands*

*Creating Notes:*  
• /note <title> – Create with custom title  
  _Example:_ \`/note Meeting ideas\`

• /quick <content> – Auto-generated title  
  _Example:_ \`/quick Remember to buy milk\`

• /tag #tag1 #tag2 <content> – Add tags  
  _Example:_ \`/tag #work #urgent Fix login bug\`

• Or just send text without any command!

*Other Commands:*  
• /list – Show recent notes  
• /status – Check connection status  
• /help – This message  

*Tips:*  
• Keep titles short (under 50 chars)  
• Use tags to organize notes  
• Notes sync automatically to GitHub
    `;

    await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
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
        `✅ Created note: \`${result.filename}\``,
        { parse_mode: 'Markdown' }
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
        `✅ Created note: \`${result.filename}\`  
💡 _Tip: Use /note <title> to set a custom title_`,
        { parse_mode: 'Markdown' }
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
      const formattedTags = tags.map(t => `#${t}`).join(' ');
      await bot.sendMessage(
        chatId,
        `✅ Created note: \`${result.filename}\`  
🏷️ Tagged with: ${formattedTags}`,
        { parse_mode: 'Markdown' }
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

    let message = '📝 *Recent Notes:*\n\n';
    recentFiles.forEach((file, index) => {
      const timestamp = new Date(file.timestamp).toLocaleString();
      message += `${index + 1}. \`${file.filename}\`  
   📅 ${timestamp}\n\n`;
    });

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  },

  async status(bot, msg) {
    const chatId = msg.chat.id;

    // Send typing indicator
    bot.sendChatAction(chatId, 'typing');

    const isConnected = await githubService.checkConnection();

    const status = `
🤖 *NeuroBoost Bot Status*

*Bot:* ✅ Online  
*GitHub:* ${isConnected ? '✅ Connected' : '❌ Disconnected'}  
*Repository:* \`${config.github.owner}/${config.github.repo}\`  
*Branch:* \`${config.github.branch}\`  
*Notes Path:* \`${config.obsidian.fleetingPath}\`  
*Environment:* \`${config.app.env}\`  
*Uptime:* \`${Math.floor(process.uptime() / 60)} minutes\`
    `;

    await bot.sendMessage(chatId, status, { parse_mode: 'Markdown' });
  }
};

module.exports = commands;
