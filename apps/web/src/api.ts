import type { NbEvent, CreateEventBody } from './types';

export const API_BASE =
  (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3001';

export type CreateTaskBody = {
  title: string;
  description?: string;
  priority?: number; // 0-5
  tags?: string[];
  parentId?: string;
  dueDate?: string;
  estimatedMinutes?: number;
};

export type UpdateTaskBody = {
  title?: string;
  description?: string;
  priority?: number;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'SCHEDULED';
  tags?: string[];
  dueDate?: string;
  estimatedMinutes?: number;
};

export type ReflectionBody = {
  focusPct: number; // 0-100
  goalPct: number;  // 0-100
  mood: number;     // 1-10
  note?: string;
  actualStartsAt?: string;
  actualEndsAt?: string;
  wasCompleted?: boolean;
  wasOnTime?: boolean;
};

export type UserSettings = {
  id?: string;
  userId?: string;
  defaultTimezone: string;
  workingHoursStart: number;
  workingHoursEnd: number;
  workingDays: number[];
  enableTelegram?: boolean;
  enableWeb?: boolean;
  enableDesktop?: boolean;
  obsidianVaultPath?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type FilteredTasksResponse = {
  tasks: any[];
  tasksByPriority: Record<number, any[]>;
  metadata: {
    totalTasks: number;
    filteredTasks: number;
    isWorkHours: boolean;
    workingHours: {
      start: number;
      end: number;
      days: number[];
    } | null;
    currentTime: string;
    currentHour: number;
    currentDay: number;
  };
};

export type BotTodayFocus = {
  currentTime: string;
  isWorkHours: boolean;
  workHours: {
    start: number;
    end: number;
    days: number[];
  } | null;
  todayEvents: {
    total: number;
    next: {
      id: string;
      title: string;
      startsAt: string;
      timeUntil: number;
    } | null;
    events: Array<{
      id: string;
      title: string;
      startsAt: string;
      endsAt: string;
      allDay: boolean;
    }>;
  };
  priorityTasks: {
    total: number;
    top: Array<{
      id: string;
      title: string;
      priority: number;
      estimatedMinutes?: number;
      tags: string[];
    }>;
  };
};

// --- EVENTS API ---
export async function getEvents(startISO: string, endISO: string): Promise<NbEvent[]> {
  const r = await fetch(`${API_BASE}/events?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`);
  if (!r.ok) throw new Error('Failed to load events');
  const raw = await r.json();
  
  const events = Array.isArray(raw) ? raw : raw.events || [];
  
  return events.map((o: any) => ({
    id: o.id,
    title: o.title,
    startUtc: o.startsAt,
    endUtc: o.endsAt,
    allDay: !!o.allDay,
    masterId: o.masterId ?? o.parentId ?? null,
    rrule: o.rrule ?? null,
    tz: o.tz || 'Europe/Moscow',
    description: o.description,
    location: o.location,
    color: o.color,
    tags: o.tags || [],
    reflections: o.reflections || [],
    reminders: o.reminders || [],
    task: o.task
  })) as NbEvent[];
}

export async function createEventUTC(body: CreateEventBody): Promise<{ id: string; event: any }> {
  const r = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const error = await r.json().catch(() => ({ error: 'Failed to create event' }));
    throw new Error(error.error || 'Failed to create event');
  }
  return r.json();
}

export async function patchEventUTC(id: string, patch: Partial<CreateEventBody> & { title?: string }): Promise<void> {
  const r = await fetch(`${API_BASE}/events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!r.ok) {
    const error = await r.json().catch(() => ({ error: 'Failed to update event' }));
    throw new Error(error.error || 'Failed to update event');
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const r = await fetch(`${API_BASE}/events/${id}`, { method: 'DELETE' });
  if (!r.ok) {
    const error = await r.json().catch(() => ({ error: 'Failed to delete event' }));
    throw new Error(error.error || 'Failed to delete event');
  }
}

// --- TASKS API ---
export async function getTasks(status?: string, priority?: number): Promise<any[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (priority !== undefined) params.append('priority', String(priority));
  
  const r = await fetch(`${API_BASE}/tasks?${params}`);
  if (!r.ok) throw new Error('Failed to load tasks');
  const data = await r.json();
  return data.tasks || [];
}

export async function getFilteredTasks(forceAll = false): Promise<FilteredTasksResponse> {
  const params = new URLSearchParams();
  if (forceAll) params.append('all', 'true');
  
  const r = await fetch(`${API_BASE}/tasks/filtered?${params}`);
  if (!r.ok) throw new Error('Failed to load filtered tasks');
  return r.json();
}

export async function getTaskPriorities(): Promise<any> {
  const r = await fetch(`${API_BASE}/tasks/priorities`);
  if (!r.ok) throw new Error('Failed to load task priorities');
  return r.json();
}

export async function createTask(body: CreateTaskBody): Promise<{ id: string; task: any }> {
  const r = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const error = await r.json().catch(() => ({ error: 'Failed to create task' }));
    throw new Error(error.error || 'Failed to create task');
  }
  return r.json();
}

export async function updateTask(id: string, updates: UpdateTaskBody): Promise<void> {
  const r = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!r.ok) {
    const error = await r.json().catch(() => ({ error: 'Failed to update task' }));
    throw new Error(error.error || 'Failed to update task');
  }
}

export async function deleteTask(id: string): Promise<void> {
  const r = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
  if (!r.ok) {
    const error = await r.json().catch(() => ({ error: 'Failed to delete task' }));
    throw new Error(error.error || 'Failed to delete task');
  }
}

export async function scheduleTask(
  taskId: string, 
  startsAt: string, 
  duration?: number, 
  keepTaskOpen?: boolean
): Promise<{ event: any; message: string }> {
  const r = await fetch(`${API_BASE}/tasks/${taskId}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startsAt, duration, keepTaskOpen }),
  });
  if (!r.ok) {
    const error = await r.json().catch(() => ({ error: 'Failed to schedule task' }));
    throw new Error(error.error || 'Failed to schedule task');
  }
  return r.json();
}

export async function bulkTaskOperation(
  taskIds: string[], 
  operation: 'mark_done' | 'set_priority' | 'add_tags' | 'hide_during_workhours',
  data?: any
): Promise<{ tasksAffected: number; message: string }> {
  const r = await fetch(`${API_BASE}/tasks/bulk`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskIds, operation, data }),
  });
  if (!r.ok) {
    const error = await r.json().catch(() => ({ error: 'Failed to perform bulk operation' }));
    throw new Error(error.error || 'Failed to perform bulk operation');
  }
  return r.json();
}

// --- REFLECTIONS API ---
export async function saveReflection(eventId: string, reflection: ReflectionBody): Promise<void> {
  const r = await fetch(`${API_BASE}/events/${eventId}/reflection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reflection),
  });
  if (!r.ok) {
    const error = await r.json().catch(() => ({ error: 'Failed to save reflection' }));
    throw new Error(error.error || 'Failed to save reflection');
  }
}

// --- STATS API ---
export async function getWeekStats(startDate: string): Promise<{
  startOfWeek: string;
  endOfWeek: string;
  plannedMinutes: number;
  completedMinutes: number;
  adherencePct: number;
  eventCount: number;
  reflectionCount: number;
}> {
  const r = await fetch(`${API_BASE}/stats/week?start=${encodeURIComponent(startDate)}`);
  if (!r.ok) throw new Error('Failed to load week stats');
  return r.json();
}

// --- USER SETTINGS API ---
export async function getUserSettings(): Promise<{ settings: UserSettings }> {
  const r = await fetch(`${API_BASE}/settings`);
  if (!r.ok) throw new Error('Failed to load user settings');
  return r.json();
}

export async function updateUserSettings(updates: Partial<UserSettings>): Promise<{ settings: UserSettings }> {
  const r = await fetch(`${API_BASE}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!r.ok) {
    const error = await r.json().catch(() => ({ error: 'Failed to update settings' }));
    throw new Error(error.error || 'Failed to update settings');
  }
  return r.json();
}

// --- BOT/DAILY FOCUS API ---
export async function getBotTodayFocus(timezone = 'Europe/Moscow'): Promise<BotTodayFocus> {
  const r = await fetch(`${API_BASE}/bot/today-focus?timezone=${encodeURIComponent(timezone)}`);
  if (!r.ok) throw new Error('Failed to load today focus');
  return r.json();
}

// --- QUICK NOTES API ---
export async function saveQuickNote(body: string, source = 'web'): Promise<{ id: string }> {
  const r = await fetch(`${API_BASE}/notes/quick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, source }),
  });
  if (!r.ok) throw new Error('Failed to save quick note');
  return r.json();
}

export async function getQuickNotes(limit = 20): Promise<any[]> {
  const r = await fetch(`${API_BASE}/notes/quick?limit=${limit}`);
  if (!r.ok) throw new Error('Failed to load quick notes');
  const data = await r.json();
  return data.notes || [];
}

// --- HEALTH/STATUS API ---
export async function checkHealth(): Promise<{ ok: boolean; db?: string; error?: string }> {
  const r = await fetch(`${API_BASE}/health`);
  if (!r.ok) throw new Error('Health check failed');
  return r.json();
}

export async function getRouteStatus(): Promise<any> {
  const r = await fetch(`${API_BASE}/status/route`);
  if (!r.ok) throw new Error('Failed to get route status');
  return r.json();
}

// --- LOGS API (for debugging) ---
export async function getRecentLogs(lines = 50, level?: string): Promise<any> {
  const params = new URLSearchParams();
  params.append('lines', String(lines));
  if (level) params.append('level', level);
  
  const r = await fetch(`${API_BASE}/logs/recent?${params}`);
  if (!r.ok) throw new Error('Failed to load logs');
  return r.json();
}