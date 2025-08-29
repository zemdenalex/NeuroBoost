export type NbEvent = {
  id: string;
  title: string;
  startUtc: string;   // UI naming for backwards compatibility
  endUtc: string;
  allDay?: boolean;
  masterId?: string | null;
  rrule?: string | null;
  tz?: string | null;
  
  // Enhanced fields from v0.2.1
  description?: string;
  location?: string;
  color?: string;
  tags?: string[];
  reflections?: Reflection[];
  reminders?: Reminder[];
  task?: Task | null;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  priority: number; // 0-5: Buffer, Emergency, ASAP, Must today, Deadline soon, If possible
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'SCHEDULED';
  tags: string[];
  dueDate?: string;
  estimatedMinutes?: number;
  parentId?: string;
  parent?: Task | null;
  subtasks?: Task[];
  createdAt: string;
  updatedAt: string;
};

export type Reminder = {
  id: string;
  minutesBefore: number;
  channel: 'TELEGRAM' | 'WEB' | 'DESKTOP' | 'EMAIL';
  message?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  isAcknowledged: boolean;
  acknowledgedAt?: string;
};

export type Reflection = {
  id: string;
  eventId: string;
  focusPct: number; // 0-100
  goalPct: number;  // 0-100
  mood: number;     // 1-10
  note?: string;
  actualStartsAt?: string;
  actualEndsAt?: string;
  wasCompleted: boolean;
  wasOnTime: boolean;
  createdAt: string;
};

export type QuickNote = {
  id: string;
  body: string;
  tags: string[];
  source: string; // 'telegram', 'web', 'api'
  createdAt: string;
};

// API Request/Response types
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

export type WeekStats = {
  startOfWeek: string;
  endOfWeek: string;
  plannedMinutes: number;
  completedMinutes: number;
  adherencePct: number;
  eventCount: number;
  reflectionCount: number;
};

// Priority system reference
export const TASK_PRIORITIES = {
  0: { name: 'Buffer', description: 'Low-priority fill tasks' },
  1: { name: 'Emergency', description: 'Override everything' },
  2: { name: 'ASAP', description: 'Urgent, high-impact' },
  3: { name: 'Must today', description: 'Default priority' },
  4: { name: 'Deadline soon', description: 'Important but not urgent' },
  5: { name: 'If possible', description: 'Nice to have' }
} as const;

export type TaskPriority = keyof typeof TASK_PRIORITIES;

// Helper function to get priority info
export function getPriorityInfo(priority: number) {
  return TASK_PRIORITIES[priority as TaskPriority] || TASK_PRIORITIES[3];
}