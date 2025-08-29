import type { NbEvent } from './types';

export const API_BASE =
  (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3001';

export type CreateEventBody = {
  title: string;
  startsAt: string; // UTC ISO
  endsAt: string;   // UTC ISO
  allDay?: boolean;
  rrule?: string | null;
  description?: string;
  location?: string;
  color?: string;
  tags?: string[];
  reminders?: Array<{
    minutesBefore: number;
    channel?: 'TELEGRAM' | 'WEB' | 'DESKTOP' | 'EMAIL';
    message?: string;
  }>;
};

export type CreateTaskBody = {
  title: string;
  description?: string;
  priority?: number; // 0-5
  tags?: string[];
  parentId?: string;
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

export async function getEvents(startISO: string, endISO: string): Promise<NbEvent[]> {
  const r = await fetch(`${API_BASE}/events?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`);
  if (!r.ok) throw new Error('Failed to load events');
  const raw = await r.json();
  
  // Handle both array and object response formats
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

// --- New Task API ---
export async function getTasks(status?: string, priority?: number): Promise<any[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (priority !== undefined) params.append('priority', String(priority));
  
  const r = await fetch(`${API_BASE}/tasks?${params}`);
  if (!r.ok) throw new Error('Failed to load tasks');
  const data = await r.json();
  return data.tasks || [];
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

export async function updateTask(id: string, updates: Partial<CreateTaskBody>): Promise<void> {
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

// --- Reflections API ---
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

// --- Stats API ---
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

// --- Quick Notes API ---
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