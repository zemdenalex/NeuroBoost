// apps/bot/src/constants.mjs
// Shared constants for bot functionality

// Priority emojis (0-5: Buffer, Emergency, ASAP, Must today, Deadline, If possible)
export const PRIORITY_EMOJIS = ['🧊', '🔥', '⚡', '📌', '⏳', '💡'];

// Priority names
export const PRIORITY_NAMES = [
  'Buffer',
  'Emergency', 
  'ASAP',
  'Must today',
  'Deadline soon',
  'If possible'
];

// Display colors for priorities (for visual consistency)
export const PRIORITY_COLORS = ['⚫', '🔴', '🟠', '🟡', '🟢', '⚪'];

// Energy level indicators
export const ENERGY_EMOJIS = ['⚡', '⚡⚡', '⚡⚡⚡', '⚡⚡⚡⚡', '⚡⚡⚡⚡⚡'];
export const ENERGY_NAMES = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

// Context icons
export const CONTEXT_ICONS = {
  '@home': '🏠',
  '@office': '🏢',
  '@computer': '💻',
  '@phone': '📱',
  '@errands': '🚗',
  '@anywhere': '🌍'
};

// Layer/calendar colors
export const LAYER_COLORS = {
  work: '#3B82F6',
  personal: '#10B981',
  home: '#F59E0B',
  health: '#EF4444',
  education: '#8B5CF6',
  social: '#EC4899'
};

// Configuration
export const TIMEZONE = 'Europe/Moscow';
export const PAGE_SIZE = 10;
export const MAX_TITLE_LENGTH = 200;
export const DEFAULT_EVENT_DURATION = 60; // minutes
export const WORK_HOURS_START = 9;
export const WORK_HOURS_END = 17;
export const QUIET_HOURS_START = 22;
export const QUIET_HOURS_END = 8;

// Helper functions
export function getPriorityEmoji(priority) {
  return PRIORITY_EMOJIS[priority] || '❓';
}

export function getPriorityName(priority) {
  return PRIORITY_NAMES[priority] || 'Unknown';
}

export function getPriorityDisplay(priority) {
  return {
    priority,
    emoji: getPriorityEmoji(priority),
    name: getPriorityName(priority),
    color: PRIORITY_COLORS[priority] || '⚪'
  };
}

export function getEnergyDisplay(level) {
  if (level < 1 || level > 5) return { emoji: '❓', name: 'Unknown' };
  return {
    level,
    emoji: ENERGY_EMOJIS[level - 1],
    name: ENERGY_NAMES[level - 1]
  };
}

export function getContextIcon(context) {
  return CONTEXT_ICONS[context] || '📍';
}

export function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    let result = `${days}d`;
    if (hours > 0) result += ` ${hours}h`;
    return result;
  }
}