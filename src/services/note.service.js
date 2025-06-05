const dayjs = require('dayjs');
const githubService = require('./github.service');
const config = require('../config');
const logger = require('../utils/logger');
const validators = require('../utils/validators');

class NoteService {
  generateFilename(title = null) {
    const timestamp = dayjs().format('YYYYMMDDHHmmss');
    const sanitizedTitle = validators.sanitizeFilename(title || 'null');
    return `${timestamp} ${sanitizedTitle}.md`;
  }

  formatContent(text, tags = ['new']) {
    // Ensure text is not too long
    const truncatedText = text.slice(0, config.app.maxNoteLength);
    
    return `#### Tags: 
#${tags.join(' #')}

#### Text:
${truncatedText}

#### Meta
Links:
[[00 - Fleeting Core]]

Sources:
[[00 - Sources Core]]
`;
  }

  async createNote(title, content, tags = ['new']) {
    try {
      const filename = this.generateFilename(title);
      const formattedContent = this.formatContent(content, tags);
      const fullPath = `${config.obsidian.fleetingPath}${filename}`;
      
      await githubService.createFile(
        fullPath,
        formattedContent,
        `Add fleeting note: ${filename}`
      );
      
      logger.info(`Note created: ${filename}`);
      return { 
        success: true, 
        filename,
        path: fullPath 
      };
    } catch (error) {
      logger.error('Error creating note:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async createFromMessage(text, customTitle = null) {
    // Extract title from first line if not provided
    let title = customTitle;
    let content = text;
    
    if (!title && text.length > 0) {
      const lines = text.split('\n');
      if (lines[0].length <= 50) {
        title = lines[0];
        content = lines.slice(1).join('\n').trim() || text;
      }
    }
    
    return this.createNote(title, content);
  }

  parseTagCommand(text) {
    // Parse format: #tag1 #tag2 Note content
    const tagRegex = /#(\w+)/g;
    const tags = [];
    let match;
    
    while ((match = tagRegex.exec(text)) !== null) {
      tags.push(match[1]);
    }
    
    // Remove tags from text to get content
    const content = text.replace(tagRegex, '').trim();
    
    return {
      tags: tags.length > 0 ? tags : ['new'],
      content
    };
  }
}

module.exports = new NoteService();