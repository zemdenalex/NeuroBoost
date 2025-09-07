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
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  rrule?: string | null;
  description?: string;
  location?: string;
  color?: string;
  tags?: string[];
  taskId?: string;  // ADD THIS LINE
  sourceTaskId?: string;  // ADD THIS LINE
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

// apps/web/src/types.ts - Add to existing file

export type DeadlineTask = Task & {
  deadline: string; // ISO date string
  warningMinutesBefore?: number; // When to show warning
  criticalMinutesBefore?: number; // When it becomes critical
};

// Add helper to determine task urgency
export function getTaskUrgency(task: DeadlineTask): 'overdue' | 'critical' | 'warning' | 'normal' {
  if (!task.deadline) return 'normal';
  
  const now = new Date().getTime();
  const deadline = new Date(task.deadline).getTime();
  const diff = deadline - now;
  
  if (diff < 0) return 'overdue';
  if (task.criticalMinutesBefore && diff < task.criticalMinutesBefore * 60000) return 'critical';
  if (task.warningMinutesBefore && diff < task.warningMinutesBefore * 60000) return 'warning';
  return 'normal';
}

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