// apps/web/src/components/DeadlineTasks.tsx

import { useMemo } from 'react';
import type { Task } from '../types';
import { getTaskUrgency } from '../types';

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const HOUR_PX = 44;

type DeadlineTasksProps = {
  tasks: Task[];
  mondayUtc0: number;
  days: Array<{ dayUtc0: number }>;
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
  
  // Filter tasks with deadlines but no scheduled time
  const deadlineTasks = useMemo(() => {
    return tasks.filter(task => 
      task.dueDate && 
      task.status !== 'SCHEDULED' && 
      task.status !== 'DONE' &&
      task.status !== 'CANCELLED'
    ).map(task => ({
      ...task,
      deadline: task.dueDate!,
      warningMinutesBefore: 24 * 60, // 24 hours warning
      criticalMinutesBefore: 4 * 60  // 4 hours critical
    }));
  }, [tasks]);

  // Group by day and urgency
  const tasksByDay = useMemo(() => {
    const map = new Map<number, typeof deadlineTasks>();
    
    days.forEach(day => {
      map.set(day.dayUtc0, []);
    });

    deadlineTasks.forEach(task => {
      const deadlineMs = new Date(task.deadline).getTime();
      const deadlineMsk = new Date(deadlineMs + MSK_OFFSET_MS);
      deadlineMsk.setUTCHours(0, 0, 0, 0);
      const deadlineDayUtc0 = deadlineMsk.getTime() - MSK_OFFSET_MS;
      
      if (map.has(deadlineDayUtc0)) {
        map.get(deadlineDayUtc0)!.push(task);
      }
    });

    return map;
  }, [deadlineTasks, days]);

  const getUrgencyColor = (urgency: ReturnType<typeof getTaskUrgency>) => {
    switch (urgency) {
      case 'overdue': return 'bg-red-600 text-white animate-pulse';
      case 'critical': return 'bg-orange-600 text-white';
      case 'warning': return 'bg-yellow-600 text-white';
      default: return 'bg-zinc-700 text-zinc-100';
    }
  };

  const getDeadlinePosition = (deadline: string, dayUtc0: number) => {
    const deadlineDate = new Date(deadline);
    const deadlineMins = (deadlineDate.getHours() * 60) + deadlineDate.getMinutes();
    return (deadlineMins / 60) * HOUR_PX;
  };

  return (
    <div className="border-t-2 border-zinc-600 bg-zinc-900">
      <div className="px-2 py-1 text-xs text-zinc-400 font-semibold">
        Deadline Tasks
      </div>
      
      <div className="grid grid-cols-7 gap-px relative" style={{ height: '100px' }}>
        {days.map((day, dayIndex) => {
          const dayTasks = tasksByDay.get(day.dayUtc0) || [];
          
          return (
            <div key={dayIndex} className="relative border-r border-zinc-700 last:border-r-0">
              {dayTasks.map((task, taskIndex) => {
                const urgency = getTaskUrgency(task);
                const position = getDeadlinePosition(task.deadline, day.dayUtc0);
                
                return (
                  <div key={task.id} className="relative">
                    {/* Deadline line */}
                    <div 
                      className="absolute w-px bg-red-500 z-10"
                      style={{
                        left: `${(position / (24 * HOUR_PX)) * 100}%`,
                        top: 0,
                        height: '100%'
                      }}
                    >
                      <div className="absolute -top-2 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                    </div>
                    
                    {/* Task card */}
                    <div
                      className={`absolute left-1 right-1 px-2 py-1 rounded text-xs cursor-pointer
                        ${getUrgencyColor(urgency)} hover:opacity-90 transition-all`}
                      style={{ 
                        top: `${10 + taskIndex * 25}px`,
                        zIndex: 20
                      }}
                      draggable
                      onClick={() => onTaskClick(task)}
                      onDragStart={(e) => {
                        const dragData = JSON.stringify({ type: 'task', task });
                        e.dataTransfer.setData('application/json', dragData);
                      }}
                      title={`Deadline: ${new Date(task.deadline).toLocaleString()}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold truncate flex-1">
                          {task.title}
                        </span>
                        <span className="text-[10px] opacity-80 whitespace-nowrap">
                          {urgency === 'overdue' 
                            ? 'OVERDUE' 
                            : `${Math.floor(
                                (new Date(task.deadline).getTime() - Date.now()) / (60 * 60 * 1000)
                              )}h`
                          }
                        </span>
                      </div>
                      {task.estimatedMinutes && (
                        <div className="text-[10px] opacity-70">
                          ~{task.estimatedMinutes}m needed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}