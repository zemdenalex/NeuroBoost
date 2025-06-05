module.exports = {
  sanitizeFilename(title) {
    if (!title) return 'null';
    
    // Remove special characters that might cause issues
    return title
      .replace(/[<>:"\/\\|?*\x00-\x1F]/g, '') // Remove illegal filename chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .slice(0, 100) // Limit length
      || 'null';
  },

  validateNoteContent(content) {
    if (!content || typeof content !== 'string') {
      return { valid: false, error: 'Content must be a non-empty string' };
    }
    
    if (content.length > 10000) {
      return { valid: false, error: 'Content too long (max 10000 characters)' };
    }
    
    return { valid: true };
  },

  parseTags(tagString) {
    if (!tagString) return [];
    
    return tagString
      .split(/\s+/)
      .filter(tag => tag.startsWith('#'))
      .map(tag => tag.slice(1))
      .filter(tag => /^[a-zA-Z0-9_]+$/.test(tag));
  }
};
