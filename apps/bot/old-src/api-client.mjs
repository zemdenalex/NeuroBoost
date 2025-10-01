import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

// Generic API request handler
export async function sendToAPI(method, endpoint, data = null) {
  const url = `${API_BASE}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'NeuroBoost-Bot/0.2.1'
    }
  };

  if (data && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    console.log(`[API] ${method} ${endpoint}`);
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`API ${method} ${endpoint} failed: ${response.status} ${errorText}`);
    }

    const result = await response.json().catch(() => ({}));
    console.log(`[API] ✅ ${method} ${endpoint} - Success`);
    
    return result;
  } catch (error) {
    console.error(`[API] ❌ ${method} ${endpoint} - Error:`, error.message);
    throw error;
  }
}

// Specific API endpoints with proper typing

// === EVENTS ===
export async function createEvent(eventData) {
  return sendToAPI('POST', '/events', eventData);
}

export async function getEvents(startISO, endISO) {
  return sendToAPI('GET', `/events?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`);
}

export async function updateEvent(eventId, updates) {
  return sendToAPI('PATCH', `/events/${eventId}`, updates);
}

export async function deleteEvent(eventId) {
  return sendToAPI('DELETE', `/events/${eventId}`);
}

// === TASKS ===
export async function createTask(taskData) {
  return sendToAPI('POST', '/tasks', taskData);
}

export async function getTasks(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.priority !== undefined) params.append('priority', filters.priority);
  
  const queryString = params.toString() ? `?${params}` : '';
  return sendToAPI('GET', `/tasks${queryString}`);
}

export async function updateTask(taskId, updates) {
  return sendToAPI('PATCH', `/tasks/${taskId}`, updates);
}

export async function deleteTask(taskId) {
  return sendToAPI('DELETE', `/tasks/${taskId}`);
}

// === REFLECTIONS ===
export async function saveReflection(eventId, reflectionData) {
  return sendToAPI('POST', `/events/${eventId}/reflection`, reflectionData);
}

// === QUICK NOTES ===
export async function saveQuickNote(body, source = 'telegram') {
  return sendToAPI('POST', '/notes/quick', { body, source });
}

export async function getQuickNotes(limit = 10) {
  return sendToAPI('GET', `/notes/quick?limit=${limit}`);
}

// === STATS ===
export async function getWeekStats(startDate) {
  return sendToAPI('GET', `/stats/week?start=${encodeURIComponent(startDate)}`);
}

// === HEALTH ===
export async function checkAPIHealth() {
  try {
    const result = await sendToAPI('GET', '/health');
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// === UTILITY FUNCTIONS ===

// Get today's events in Moscow timezone
export async function getTodayEvents() {
  const { DateTime } = await import('luxon');
  
  const todayStart = DateTime.now().setZone('Europe/Moscow').startOf('day').toUTC().toISO();
  const todayEnd = DateTime.now().setZone('Europe/Moscow').endOf('day').toUTC().toISO();
  
  return getEvents(todayStart, todayEnd);
}

// Get urgent tasks (priority 0-2)
export async function getUrgentTasks() {
  const allTasks = await getTasks({ status: 'TODO' });
  return allTasks.tasks?.filter(task => task.priority <= 2) || [];
}

// Get this week's stats
export async function getThisWeekStats() {
  const { DateTime } = await import('luxon');
  
  // Get Monday of current week
  const monday = DateTime.now().setZone('Europe/Moscow').startOf('week').toISODate();
  return getWeekStats(monday);
}

// Create a quick event (1 hour, starting next hour)
export async function createQuickEvent(title, options = {}) {
  const { DateTime } = await import('luxon');
  
  const now = DateTime.now().setZone('Europe/Moscow');
  const startTime = options.startTime || now.plus({ hours: 1 }).startOf('hour');
  const duration = options.duration || 60; // minutes
  const endTime = startTime.plus({ minutes: duration });
  
  const eventData = {
    title,
    startsAt: startTime.toUTC().toISO(),
    endsAt: endTime.toUTC().toISO(),
    allDay: false,
    tags: options.tags || [],
    reminders: options.reminders || [{
      minutesBefore: 5,
      channel: 'TELEGRAM'
    }],
    ...options
  };
  
  return createEvent(eventData);
}

// Batch operations
export async function getFullContext() {
  try {
    const [todayEvents, urgentTasks, weekStats] = await Promise.all([
      getTodayEvents(),
      getUrgentTasks(),
      getThisWeekStats()
    ]);
    
    return {
      todayEvents: todayEvents || [],
      urgentTasks: urgentTasks || [],
      weekStats: weekStats || { plannedMinutes: 0, completedMinutes: 0, adherencePct: 0 }
    };
  } catch (error) {
    console.error('Failed to get full context:', error);
    return {
      todayEvents: [],
      urgentTasks: [],
      weekStats: { plannedMinutes: 0, completedMinutes: 0, adherencePct: 0 }
    };
  }
}

// API status check with retries
export async function waitForAPI(maxRetries = 5, delayMs = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const health = await checkAPIHealth();
      if (health.ok) {
        console.log(`[API] ✅ Connected to ${API_BASE}`);
        return true;
      }
    } catch (error) {
      console.log(`[API] ⚠️  Attempt ${i + 1}/${maxRetries} failed: ${error.message}`);
    }
    
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.error(`[API] ❌ Failed to connect to ${API_BASE} after ${maxRetries} attempts`);
  return false;
}