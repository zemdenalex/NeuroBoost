# NeuroBoost Bot - Telegram to Obsidian Quick Capture

## 🧠 Project Overview

NeuroBoost Bot is a Telegram bot designed for individuals with ADHD/AuDHD to quickly capture thoughts and notes directly into their Obsidian vault via GitHub. It addresses executive dysfunction and task initiation challenges by providing a frictionless note-taking experience.

### Key Features
- **Quick Capture**: Send a message to Telegram, get a note in Obsidian
- **Automatic Formatting**: Notes follow Obsidian template with metadata
- **GitHub Sync**: Direct integration with your Obsidian vault repository
- **ADHD-Friendly**: Minimal friction, maximum flexibility
- **Tag Support**: Organize notes with hashtags
- **Timestamp Naming**: Automatic chronological ordering

## 🎯 Target User Profile

**Primary User**: Denis Zemtsov
- 19-year-old with ADHD/AuDHD
- Uses Obsidian for knowledge management
- Needs quick, frictionless note capture
- Struggles with task initiation and executive function
- Tech-savvy (full-stack developer)

## 📁 Project Structure

```
neuroboost-bot/
├── src/
│   ├── bot.js              # Main bot entry point
│   ├── config.js           # Configuration management
│   ├── commands/
│   │   └── index.js        # All bot commands
│   ├── services/
│   │   ├── github.service.js   # GitHub API integration
│   │   └── note.service.js     # Note creation logic
│   └── utils/
│       ├── logger.js       # Winston logging setup
│       └── validators.js   # Input validation
├── .env.example            # Environment variables template
├── .gitignore             # Git ignore rules
├── package.json           # Node.js dependencies
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Telegram account
- GitHub account with personal access token
- Obsidian vault in a GitHub repository

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/neuroboost-bot
cd neuroboost-bot
```

2. **Install dependencies**
```bash
npm install
```

3. **Create Telegram Bot**
- Open Telegram and search for @BotFather
- Send `/newbot` and follow instructions
- Save the bot token

4. **Get your Telegram User ID**
- Message @userinfobot on Telegram
- Save your user ID

5. **Create GitHub Personal Access Token**
- Go to GitHub → Settings → Developer settings → Personal access tokens
- Generate new token (classic) with `repo` scope
- Save the token

6. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your values
```

7. **Run the bot**
```bash
# Development
npm run dev

# Production
npm start
```

## 📝 Usage

### Basic Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Show welcome message | `/start` |
| `/help` | Display all commands | `/help` |
| `/note <title>` | Create note with title | `/note Meeting ideas` |
| `/quick <content>` | Quick note, auto title | `/quick Buy milk` |
| `/tag #tag1 #tag2 <content>` | Note with tags | `/tag #work #urgent Fix bug` |
| `/list` | Show 5 recent notes | `/list` |
| `/status` | Check bot status | `/status` |

### Quick Capture
Just send any text without a command, and it becomes a note!

### Note Format
Notes are created in your Obsidian vault with this structure:
```markdown
#### Tags: 
#new #othertags

#### Text:
Your note content here

#### Meta
Links:
[[00 - Fleeting Core]]

Sources:
[[00 - Sources Core]]
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather | `123456:ABC-DEF...` |
| `ALLOWED_USER_ID` | Your Telegram user ID | `123456789` |
| `GITHUB_TOKEN` | GitHub personal access token | `ghp_xxxxx...` |
| `GITHUB_OWNER` | GitHub username | `yourusername` |
| `GITHUB_REPO` | Repository name | `obsidian-vault` |
| `GITHUB_BRANCH` | Branch to commit to | `main` |
| `OBSIDIAN_FLEETING_PATH` | Path to fleeting notes | `05 - Fleeting/00 - New notes/` |

### Obsidian Integration

1. Your Obsidian vault must be in a GitHub repository
2. Install Obsidian Git plugin for automatic syncing
3. Configure plugin to pull changes regularly
4. Notes appear in your fleeting folder after sync

## 🏗️ Architecture

### Core Components

1. **Telegram Bot Service**
   - Handles incoming messages
   - Authenticates users
   - Routes commands

2. **Note Service**
   - Generates timestamps and filenames
   - Formats note content
   - Manages tags

3. **GitHub Service**
   - Creates files via GitHub API
   - Handles commits
   - Tracks recent files

### Data Flow
```
User → Telegram → Bot → Note Service → GitHub Service → GitHub Repo → Obsidian Sync
```

## 🔐 Security

- **Single User**: Only responds to configured Telegram user ID
- **Token Security**: All tokens stored in environment variables
- **No Database**: No user data stored on server
- **Direct GitHub**: Notes go straight to your private repository

## 🚧 Roadmap

### Current MVP Features ✅
- [x] Basic note creation
- [x] Tag support
- [x] Timestamp naming
- [x] GitHub integration
- [x] Error handling
- [x] Logging

### Phase 2 Features 🚀
- [ ] Voice note transcription
- [ ] Image attachments
- [ ] Daily note summaries
- [ ] Task detection (TODO, DONE)
- [ ] Reminder functionality
- [ ] Quick templates

### Phase 3 Features 🌟
- [ ] Web dashboard
- [ ] Analytics
- [ ] Multiple vault support
- [ ] Collaborative features
- [ ] AI-powered categorization

## 🐛 Troubleshooting

### Bot not responding
1. Check bot token is correct
2. Verify your user ID in .env
3. Check logs: `pm2 logs` or console output

### GitHub connection failed
1. Verify personal access token has `repo` scope
2. Check repository name and owner
3. Ensure repository exists and you have access

### Notes not appearing in Obsidian
1. Check Obsidian Git plugin is installed
2. Verify auto-pull is configured
3. Manually pull changes in Obsidian
4. Check GitHub repository for commits

## 🤝 Contributing

This is currently a personal project, but contributions are welcome!

### For LLMs Assisting with Development

**Context**: This bot helps users with ADHD capture thoughts quickly. Key considerations:
- Minimize friction (fewer steps = better)
- Clear feedback (always confirm actions)
- Error tolerance (gracefully handle mistakes)
- Fast response times (avoid timeouts)

**Code Style**:
- Use async/await for all asynchronous operations
- Include comprehensive error handling
- Log all significant events
- Keep functions small and focused
- Comment complex logic

**Testing Approach**:
- Test with various input formats
- Handle edge cases (empty strings, special characters)
- Verify GitHub API limits aren't exceeded
- Test offline scenarios

## 📊 Metrics & Monitoring

### Local Development
- Console logs via Winston
- Error tracking in `logs/` directory

### Production Deployment
- Use PM2 for process management: `pm2 start src/bot.js --name neuroboost`
- Monitor with: `pm2 monit`
- Logs: `pm2 logs neuroboost`

### Recommended Monitoring
- UptimeRobot for availability
- GitHub API rate limit tracking
- Daily note count metrics

## 🆘 Support

For issues or questions:
1. Check existing GitHub issues
2. Review logs for error messages
3. Verify configuration in .env
4. Test GitHub connection with `/status`

## 📜 License

MIT License - Feel free to modify for your own use!

## 🙏 Acknowledgments

- Built for the neurodivergent community
- Inspired by the need for frictionless note-taking
- Obsidian community for the amazing tool
- Telegram for the accessible API

---

**Remember**: The best note-taking system is the one you actually use. This bot removes barriers to capture your thoughts when inspiration strikes.

## 📚 Additional Resources

### For Future LLM Assistants

When helping with this project, consider:

1. **User Context**: ADHD/AuDHD affects executive function. Features should reduce cognitive load, not add to it.

2. **Technical Decisions**: 
   - Chose Telegram for instant access (no app switching)
   - GitHub as backend (already used for vault sync)
   - No database (reduces complexity and maintenance)

3. **Design Philosophy**:
   - Fast is better than perfect
   - Simple is better than complex
   - Working is better than optimal
   - User comfort over technical elegance

4. **Common Enhancement Requests**:
   - Voice notes → Use Telegram's voice API + transcription service
   - Multiple users → Add user management and vault mapping
   - Search → Implement GitHub search API
   - Templates → Add template command with preset formats

5. **Performance Considerations**:
   - GitHub API has rate limits (5000/hour authenticated)
   - Telegram has flood limits (30 messages/second)
   - Keep file operations atomic
   - Cache recent operations in memory

### Obsidian Vault Structure Reference

Based on user's vault:
```
05 - Fleeting/
├── 00 - Fleeting Core.md
├── 00 - New notes/         # Bot saves here
├── 01 - Lists - core.md
└── 02 - thoughts.md
```

Notes should maintain compatibility with this structure and linking system.