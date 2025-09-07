// apps/web/src/components/DeadlineTasks.tsx - Enhanced version with visual timeline

import { useMemo, useState } from 'react';
import type { Task } from '../types';
import { getTaskUrgency } from '../types';

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const HOUR_PX = 44;
const TASK_ROW_HEIGHT = 30;
const TIMELINE_HEIGHT = 150;

type DeadlineTasksProps = {
  tasks: Task[];
  mondayUtc0: number;
  days: Array<{ dayUtc0: number; dayMsk: Date; key: string }>;
  onTaskClick: (task: Task) => void;
  onTaskDragToSchedule: (task: Task, startTime: Date) => void;
};

export function DeadlineTasks({ 
  tasks, 
  mondayUtc0, 
  days, 
  onTaskClick,
  onTaskDragToSchedule 
}: DeadlineTasksProps) {
  
  const [expandedView, setExpandedView] = useState(false);
  const [selectedUrgency, setSelectedUrgency] = useState<'all' | 'overdue' | 'critical' | 'warning'>('all');
  
  // Filter and sort tasks by deadline
  const deadlineTasks = useMemo(() => {
    return tasks.filter(task => 
      task.dueDate && 
      task.status !== 'SCHEDULED' && 
      task.status !== 'DONE' &&
      task.status !== 'CANCELLED'
    ).map(task => ({
      ...task,
      deadline: task.dueDate!,
      urgency: getTaskUrgency({
        ...task,
        deadline: task.dueDate!,
        warningMinutesBefore: 24 * 60, // 24 hours warning
        criticalMinutesBefore: 4 * 60   // 4 hours critical
      })
    })).sort((a, b) => {
      // Sort by urgency first, then by deadline
      const urgencyOrder = { overdue: 0, critical: 1, warning: 2, normal: 3 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [tasks]);

  // Filter by selected urgency
  const filteredTasks = useMemo(() => {
    if (selectedUrgency === 'all') return deadlineTasks;
    return deadlineTasks.filter(task => task.urgency === selectedUrgency);
  }, [deadlineTasks, selectedUrgency]);

  // Group tasks by day for timeline view
  const tasksByDay = useMemo(() => {
    const map = new Map<string, typeof filteredTasks>();
    
    days.forEach(day => {
      map.set(day.key, []);
    });

    filteredTasks.forEach(task => {
      const deadlineDate = new Date(task.deadline);
      const deadlineMsk = new Date(deadlineDate.getTime() + MSK_OFFSET_MS);
      const dayKey = deadlineMsk.toISOString().slice(0, 10);
      
      if (map.has(dayKey)) {
        map.get(dayKey)!.push(task);
      }
    });

    return map;
  }, [filteredTasks, days]);

  // Calculate timeline positions for tasks
  const getTimelinePosition = (deadline: string, dayUtc0: number) => {
    const deadlineDate = new Date(deadline);
    const deadlineMsk = new Date(deadlineDate.getTime() + MSK_OFFSET_MS);
    const dayStart = new Date(dayUtc0 + MSK_OFFSET_MS);
    dayStart.setHours(0, 0, 0, 0);
    
    const minutesFromDayStart = (deadlineMsk.getTime() - dayStart.getTime()) / 60000;
    const positionPercent = (minutesFromDayStart / 1440) * 100; // 1440 minutes in a day
    
    return {
      percent: Math.max(0, Math.min(100, positionPercent)),
      time: deadlineMsk.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return {
        bg: 'bg-red-600',
        border: 'border-red-500',
        text: 'text-red-100',
        pulse: 'animate-pulse'
      };
      case 'critical': return {
        bg: 'bg-orange-600',
        border: 'border-orange-500',
        text: 'text-orange-100',
        pulse: ''
      };
      case 'warning': return {
        bg: 'bg-yellow-600',
        border: 'border-yellow-500',
        text: 'text-yellow-100',
        pulse: ''
      };
      default: return {
        bg: 'bg-zinc-700',
        border: 'border-zinc-600',
        text: 'text-zinc-100',
        pulse: ''
      };
    }
  };

  const urgencyCounts = useMemo(() => ({
    all: deadlineTasks.length,
    overdue: deadlineTasks.filter(t => t.urgency === 'overdue').length,
    critical: deadlineTasks.filter(t => t.urgency === 'critical').length,
    warning: deadlineTasks.filter(t => t.urgency === 'warning').length
  }), [deadlineTasks]);

  if (deadlineTasks.length === 0) return null;

  return (
    <div className="border-t-2 border-zinc-600 bg-zinc-900/95">
      {/* Header with controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-zinc-300">
            Deadline Tasks ({filteredTasks.length})
          </h3>
          
          {/* Urgency filter tabs */}
          <div className="flex items-center gap-1">
            {(['all', 'overdue', 'critical', 'warning'] as const).map(urgency => {
              const count = urgencyCounts[urgency];
              const isActive = selectedUrgency === urgency;
              
              return (
                <button
                  key={urgency}
                  onClick={() => setSelectedUrgency(urgency)}
                  className={`px-2 py-0.5 text-xs rounded transition-all ${
                    isActive 
                      ? 'bg-zinc-600 text-white' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  } ${urgency === 'overdue' && count > 0 ? 'animate-pulse' : ''}`}
                >
                  {urgency === 'all' ? 'All' : urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                  {count > 0 && (
                    <span className="ml-1 font-semibold">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        <button
          onClick={() => setExpandedView(!expandedView)}
          className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-zinc-800"
        >
          {expandedView ? 'Collapse ↑' : 'Expand ↓'}
        </button>
      </div>

      {/* Timeline View */}
      <div 
        className="relative overflow-hidden transition-all duration-300"
        style={{ height: expandedView ? TIMELINE_HEIGHT : 80 }}
      >
        {/* Day columns */}
        <div className="grid grid-cols-7 h-full">
          {days.map((day, dayIndex) => {
            const dayTasks = tasksByDay.get(day.key) || [];
            
            return (
              <div 
                key={day.key} 
                className="relative border-r border-zinc-700 last:border-r-0"
              >
                {/* Day header */}
                <div className="absolute top-0 left-0 right-0 px-1 py-0.5 text-[10px] text-zinc-500 bg-zinc-900/80 z-10">
                  {day.dayMsk.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' })}
                </div>
                
                {/* Timeline with hour marks */}
                {expandedView && (
                  <div className="absolute inset-x-0 top-6 bottom-0">
                    {/* Hour marks */}
                    {[6, 12, 18].map(hour => (
                      <div
                        key={hour}
                        className="absolute w-full border-t border-zinc-800/50"
                        style={{ top: `${(hour / 24) * 100}%` }}
                      >
                        <span className="absolute -top-2 left-0 text-[8px] text-zinc-600 bg-zinc-900 px-0.5">
                          {hour}:00
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Tasks in this day */}
                {dayTasks.map((task, taskIndex) => {
                  const position = getTimelinePosition(task.deadline, day.dayUtc0);
                  const colors = getUrgencyColor(task.urgency);
                  
                  return (
                    <div key={task.id} className="absolute inset-x-0">
                      {/* Deadline line */}
                      <div 
                        className={`absolute w-full h-0.5 ${colors.bg} ${colors.pulse} opacity-60`}
                        style={{ 
                          top: expandedView 
                            ? `${24 + (position.percent * 0.76 * (TIMELINE_HEIGHT - 24) / 100)}px`
                            : `${30 + taskIndex * 20}px`
                        }}
                      >
                        {/* Time marker */}
                        <div className={`absolute -top-2 right-0 text-[9px] ${colors.text} bg-zinc-900 px-1 rounded`}>
                          {position.time}
                        </div>
                      </div>
                      
                      {/* Task card */}
                      <div
                        className={`absolute left-1 right-1 px-1 py-0.5 rounded text-xs cursor-pointer
                          ${colors.bg} ${colors.text} ${colors.border} border ${colors.pulse}
                          hover:opacity-90 transition-all group`}
                        style={{ 
                          top: expandedView 
                            ? `${24 + (position.percent * 0.76 * (TIMELINE_HEIGHT - 24) / 100) + 8}px`
                            : `${35 + taskIndex * 20}px`,
                          zIndex: 20 - taskIndex
                        }}
                        draggable
                        onClick={() => onTaskClick(task)}
                        onDragStart={(e) => {
                          const dragData = JSON.stringify({ type: 'task', task });
                          e.dataTransfer.setData('application/json', dragData);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        title={`${task.title}\nDeadline: ${new Date(task.deadline).toLocaleString()}\nPriority: ${task.priority}\n${task.estimatedMinutes ? `Estimated: ${task.estimatedMinutes}m` : ''}`}
                      >
                        <div className="flex items-center justify-between gap-0.5">
                          <span className="font-medium truncate flex-1 text-[10px]">
                            {task.title}
                          </span>
                          <span className="text-[9px] opacity-90 whitespace-nowrap">
                            {task.urgency === 'overdue' 
                              ? 'LATE!' 
                              : `${Math.floor(
                                  (new Date(task.deadline).getTime() - Date.now()) / (60 * 60 * 1000)
                                )}h`
                            }
                          </span>
                        </div>
                        
                        {expandedView && task.estimatedMinutes && (
                          <div className="text-[9px] opacity-80 mt-0.5">
                            ~{task.estimatedMinutes}m • P{task.priority}
                          </div>
                        )}
                        
                        {/* Quick schedule button */}
                        <button
                          className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-600 
                            opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center
                            hover:bg-blue-600 hover:border-blue-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Schedule 2 hours before deadline
                            const scheduleTime = new Date(task.deadline);
                            scheduleTime.setHours(scheduleTime.getHours() - 2);
                            onTaskDragToSchedule(task, scheduleTime);
                          }}
                          title="Quick schedule 2h before deadline"
                        >
                          <span className="text-[8px] text-white">+</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary stats */}
      {expandedView && (
        <div className="px-3 py-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <span>Total time needed: <strong className="text-zinc-300">
              {Math.round(filteredTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 60), 0) / 60)}h
            </strong></span>
            <span>Next deadline: <strong className="text-zinc-300">
              {filteredTasks[0] ? new Date(filteredTasks[0].deadline).toLocaleString('ru-RU', { 
                day: 'numeric', 
                month: 'short', 
                hour: '2-digit', 
                minute: '2-digit' 
              }) : 'None'}
            </strong></span>
          </div>
          <div className="text-[10px]">
            Drag to calendar to schedule • Click to edit • Hover for quick actions
          </div>
        </div>
      )}
    </div>
  );
}