#!/usr/bin/env node
// Log viewer utility for NeuroBoost
// Usage: node view-logs.mjs [service] [lines]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICES = ['api', 'bot'];
const DEFAULT_LINES = 50;

function showHelp() {
  console.log(`
NeuroBoost Log Viewer

Usage:
  node view-logs.mjs [service] [lines]

Services:
  api    - API server logs
  bot    - Telegram bot logs
  all    - All service logs (default)

Options:
  lines  - Number of lines to show (default: ${DEFAULT_LINES})

Examples:
  node view-logs.mjs              # Show last ${DEFAULT_LINES} lines from all services
  node view-logs.mjs api          # Show API logs
  node view-logs.mjs bot 100      # Show last 100 bot logs
  node view-logs.mjs all 20       # Show last 20 lines from all services

Log Levels:
  DEBUG  - Detailed debugging info
  INFO   - General information
  WARN   - Warning messages
  ERROR  - Error messages
`);
}

function parseLogLine(line) {
  try {
    const log = JSON.parse(line);
    const timestamp = new Date(log.timestamp).toLocaleString();
    const level = log.level.padEnd(5);
    const service = log.service.padEnd(3);
    
    // Color coding
    const colors = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m'  // Red
    };
    const reset = '\x1b[0m';
    const color = colors[log.level] || '';
    
    return `${color}[${timestamp}] ${level} [${service}] ${log.message}${reset}`;
  } catch {
    return line; // Return original line if not JSON
  }
}

function readLogFile(filePath, lines = DEFAULT_LINES) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const allLines = content.trim().split('\n');
    return allLines.slice(-lines).filter(line => line.trim());
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

function watchLogFile(filePath) {
  console.log(`\nWatching ${filePath} for changes... (Press Ctrl+C to stop)\n`);
  
  let lastSize = 0;
  
  const checkForUpdates = () => {
    try {
      if (!fs.existsSync(filePath)) return;
      
      const stats = fs.statSync(filePath);
      if (stats.size > lastSize) {
        const content = fs.readFileSync(filePath, 'utf8');
        const newContent = content.slice(lastSize);
        const newLines = newContent.trim().split('\n').filter(line => line.trim());
        
        newLines.forEach(line => {
          console.log(parseLogLine(line));
        });
        
        lastSize = stats.size;
      }
    } catch (error) {
      console.error('Error watching file:', error.message);
    }
  };
  
  // Initial read
  const initialLines = readLogFile(filePath, 10);
  initialLines.forEach(line => console.log(parseLogLine(line)));
  
  try {
    const stats = fs.statSync(filePath);
    lastSize = stats.size;
  } catch {}
  
  // Watch for changes
  const interval = setInterval(checkForUpdates, 1000);
  
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\nStopped watching logs.');
    process.exit(0);
  });
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const service = args[0] || 'all';
  const lines = parseInt(args[1]) || DEFAULT_LINES;
  const watch = args.includes('--watch') || args.includes('-w');
  
  const logsDir = path.resolve('logs');
  
  if (!fs.existsSync(logsDir)) {
    console.log('❌ Logs directory not found. Make sure to run the API or Bot first to generate logs.');
    console.log(`Expected directory: ${logsDir}`);
    return;
  }
  
  if (watch) {
    if (service === 'all') {
      console.log('❌ Cannot watch all services simultaneously. Please specify api or bot.');
      return;
    }
    
    const logFile = path.join(logsDir, `${service}.log`);
    watchLogFile(logFile);
    return;
  }
  
  console.log(`📋 NeuroBoost Logs - ${service.toUpperCase()} (last ${lines} lines)\n`);
  
  if (service === 'all') {
    // Show logs from all services, interleaved by timestamp
    const allLogs = [];
    
    for (const svc of SERVICES) {
      const logFile = path.join(logsDir, `${svc}.log`);
      const logs = readLogFile(logFile, lines * 2); // Get more to account for interleaving
      
      logs.forEach(line => {
        try {
          const parsed = JSON.parse(line);
          allLogs.push({ ...parsed, originalLine: line });
        } catch {
          allLogs.push({ 
            timestamp: new Date().toISOString(), 
            service: svc, 
            level: 'INFO',
            message: line,
            originalLine: line 
          });
        }
      });
    }
    
    // Sort by timestamp and take last N lines
    allLogs
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-lines)
      .forEach(log => {
        console.log(parseLogLine(log.originalLine));
      });
  } else {
    // Show logs from specific service
    if (!SERVICES.includes(service)) {
      console.log(`❌ Unknown service: ${service}`);
      console.log(`Available services: ${SERVICES.join(', ')}`);
      return;
    }
    
    const logFile = path.join(logsDir, `${service}.log`);
    const logs = readLogFile(logFile, lines);
    
    if (logs.length === 0) {
      console.log(`📝 No logs found for ${service}. Make sure the service is running.`);
      return;
    }
    
    logs.forEach(line => {
      console.log(parseLogLine(line));
    });
  }
  
  // Show log file info
  console.log('\n' + '─'.repeat(80));
  
  const services = service === 'all' ? SERVICES : [service];
  services.forEach(svc => {
    const logFile = path.join(logsDir, `${svc}.log`);
    const errorFile = path.join(logsDir, `${svc}.error.log`);
    
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      const size = (stats.size / 1024).toFixed(1);
      const modified = stats.mtime.toLocaleString();
      console.log(`📁 ${svc}.log: ${size}KB (modified: ${modified})`);
    }
    
    if (fs.existsSync(errorFile)) {
      const stats = fs.statSync(errorFile);
      const size = (stats.size / 1024).toFixed(1);
      console.log(`🚨 ${svc}.error.log: ${size}KB`);
    }
  });
  
  console.log('\n💡 Tips:');
  console.log('  • Use --watch or -w to follow logs in real-time');
  console.log('  • Check logs/[service].error.log for error details');
  console.log('  • Logs are automatically rotated when they get large');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}