const { Octokit } = require('@octokit/rest');
const config = require('../config');
const logger = require('../utils/logger');

class GitHubService {
  constructor() {
    this.octokit = new Octokit({
      auth: config.github.token,
    });
    
    this.owner = config.github.owner;
    this.repo = config.github.repo;
    this.branch = config.github.branch;
    this.recentFiles = []; // Track recent files for listing
  }

  async createFile(path, content, message) {
    try {
      const contentBase64 = Buffer.from(content).toString('base64');
      
      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: path,
        message: message || `Add note: ${path.split('/').pop()}`,
        content: contentBase64,
        branch: this.branch,
      });
      
      // Track recent files
      this.recentFiles.unshift({
        path: path,
        filename: path.split('/').pop(),
        timestamp: new Date().toISOString(),
      });
      
      // Keep only last 10 files
      if (this.recentFiles.length > 10) {
        this.recentFiles = this.recentFiles.slice(0, 10);
      }
      
      logger.info(`Created file: ${path}`);
      return response;
    } catch (error) {
      logger.error('Error creating file:', error);
      throw error;
    }
  }

  async checkConnection() {
    try {
      await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      return true;
    } catch (error) {
      logger.error('GitHub connection failed:', error.message);
      return false;
    }
  }

  getRecentFiles(limit = 5) {
    return this.recentFiles.slice(0, limit);
  }
}

module.exports = new GitHubService();