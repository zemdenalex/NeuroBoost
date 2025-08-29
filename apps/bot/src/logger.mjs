import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const LOG_LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
const LOG_LEVEL_COLORS = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m',  // Green
  WARN: '\x1b[33m',  // Yellow
  ERROR: '\x1b[31m'  // Red
};
const RESET_COLOR = '\x1b[0m';

class Logger {
  constructor(service = 'app', options = {}) {
    this.service = service;
    this.logLevel = LOG_LEVELS[options.level?.toUpperCase()] ?? LOG_LEVELS.INFO;
    this.logToFile = options.logToFile !== false;
    this.logToConsole = options.logToConsole !== false;
    
    // Create logs directory
    this.logsDir = path.resolve(options.logsDir || 'logs');
    if (this.logToFile) {
      this.ensureLogDirectory();
    }
    
    // File paths
    this.logFile = path.join(this.logsDir, `${service}.log`);
    this.errorFile = path.join(this.logsDir, `${service}.error.log`);
    
    // Max file size for rotation (10MB)
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024;
    
    this.startupLog();
  }
  
  ensureLogDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }
  
  startupLog() {
    this.info('Logger initialized', {
      service: this.service,
      logLevel: LOG_LEVEL_NAMES[this.logLevel],
      logToFile: this.logToFile,
      logToConsole: this.logToConsole,
      logsDir: this.logsDir
    });
  }
  
  formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    
    // Base log entry
    const logEntry = {
      timestamp,
      service: this.service,
      level,
      pid,
      message,
      ...data
    };
    
    // Console format (with colors)
    const color = LOG_LEVEL_COLORS[level] || '';
    const consoleMsg = `${color}[${timestamp}] ${level.padEnd(5)} [${this.service}] ${message}${RESET_COLOR}`;
    
    // File format (JSON)
    const fileMsg = JSON.stringify(logEntry);
    
    return { consoleMsg, fileMsg, logEntry };
  }
  
  writeToFile(filePath, message) {
    if (!this.logToFile) return;
    
    try {
      // Check file size for rotation
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > this.maxFileSize) {
          this.rotateLogFile(filePath);
        }
      }
      
      fs.appendFileSync(filePath, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
  
  rotateLogFile(filePath) {
    try {
      const rotatedPath = `${filePath}.${Date.now()}`;
      fs.renameSync(filePath, rotatedPath);
      
      // Keep only last 5 rotated files
      const dir = path.dirname(filePath);
      const baseName = path.basename(filePath);
      const files = fs.readdirSync(dir)
        .filter(file => file.startsWith(baseName) && file !== baseName)
        .sort()
        .reverse();
      
      if (files.length > 5) {
        files.slice(5).forEach(file => {
          fs.unlinkSync(path.join(dir, file));
        });
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }
  
  log(level, message, data = {}) {
    if (LOG_LEVELS[level] < this.logLevel) return;
    
    const { consoleMsg, fileMsg, logEntry } = this.formatMessage(level, message, data);
    
    // Console output
    if (this.logToConsole) {
      console.log(consoleMsg);
      if (data && Object.keys(data).length > 0) {
        console.log('  Data:', data);
      }
    }
    
    // File output
    if (this.logToFile) {
      this.writeToFile(this.logFile, fileMsg);
      
      // Also write errors to separate error log
      if (level === 'ERROR') {
        this.writeToFile(this.errorFile, fileMsg);
      }
    }
    
    return logEntry;
  }
  
  debug(message, data = {}) {
    return this.log('DEBUG', message, data);
  }
  
  info(message, data = {}) {
    return this.log('INFO', message, data);
  }
  
  warn(message, data = {}) {
    return this.log('WARN', message, data);
  }
  
  error(message, data = {}, error = null) {
    const logData = { ...data };
    
    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    return this.log('ERROR', message, logData);
  }
  
  // Request logging helper
  request(method, url, statusCode, duration, data = {}) {
    const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    return this.log(level, `${method} ${url} ${statusCode} ${duration}ms`, {
      type: 'request',
      method,
      url,
      statusCode,
      duration,
      ...data
    });
  }
  
  // API call logging helper
  apiCall(method, endpoint, success, duration, data = {}) {
    const level = success ? 'INFO' : 'ERROR';
    const status = success ? 'SUCCESS' : 'FAILED';
    return this.log(level, `API ${method} ${endpoint} ${status} ${duration}ms`, {
      type: 'api_call',
      method,
      endpoint,
      success,
      duration,
      ...data
    });
  }
  
  // Bot interaction logging helper  
  botInteraction(userId, username, action, data = {}) {
    return this.log('INFO', `Bot interaction: ${action}`, {
      type: 'bot_interaction',
      userId,
      username,
      action,
      ...data
    });
  }
  
  // Database operation logging helper
  dbOperation(operation, table, success, duration, data = {}) {
    const level = success ? 'DEBUG' : 'ERROR';
    const status = success ? 'SUCCESS' : 'FAILED';
    return this.log(level, `DB ${operation} ${table} ${status} ${duration}ms`, {
      type: 'db_operation',
      operation,
      table,
      success,
      duration,
      ...data
    });
  }
  
  // Performance monitoring
  startTimer(label) {
    const startTime = Date.now();
    return {
      end: (data = {}) => {
        const duration = Date.now() - startTime;
        this.debug(`Timer: ${label} completed in ${duration}ms`, {
          type: 'performance',
          label,
          duration,
          ...data
        });
        return duration;
      }
    };
  }
  
  // Get log stats
  getStats() {
    const stats = {
      service: this.service,
      logLevel: LOG_LEVEL_NAMES[this.logLevel],
      files: {}
    };
    
    if (this.logToFile) {
      try {
        if (fs.existsSync(this.logFile)) {
          const logStats = fs.statSync(this.logFile);
          stats.files.log = {
            size: logStats.size,
            modified: logStats.mtime
          };
        }
        
        if (fs.existsSync(this.errorFile)) {
          const errorStats = fs.statSync(this.errorFile);
          stats.files.error = {
            size: errorStats.size,
            modified: errorStats.mtime
          };
        }
      } catch (error) {
        this.error('Failed to get log stats', {}, error);
      }
    }
    
    return stats;
  }
  
  // Read recent logs
  getRecentLogs(lines = 50, level = null) {
    if (!this.logToFile || !fs.existsSync(this.logFile)) {
      return [];
    }
    
    try {
      const content = fs.readFileSync(this.logFile, 'utf8');
      const logLines = content.trim().split('\n').slice(-lines);
      
      const logs = logLines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      
      if (level) {
        return logs.filter(log => log.level === level.toUpperCase());
      }
      
      return logs;
    } catch (error) {
      this.error('Failed to read recent logs', {}, error);
      return [];
    }
  }
}

// Factory function to create loggers
export function createLogger(service, options = {}) {
  return new Logger(service, {
    level: process.env.LOG_LEVEL || 'info',
    logToFile: process.env.NODE_ENV !== 'test',
    logToConsole: true,
    logsDir: process.env.LOGS_DIR || 'logs',
    ...options
  });
}

export { Logger };
export default createLogger;