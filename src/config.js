module.exports = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    allowedUserId: process.env.ALLOWED_USER_ID,
  },
  github: {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH || 'main',
  },
  obsidian: {
    fleetingPath: process.env.OBSIDIAN_FLEETING_PATH || '05 - Fleeting/00 - New notes/',
  },
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    maxNoteLength: parseInt(process.env.MAX_NOTE_LENGTH) || 10000,
  }
};