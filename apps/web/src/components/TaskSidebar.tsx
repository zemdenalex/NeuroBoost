import { useState, useEffect, useRef } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from '../api';
import { TASK_PRIORITIES, getPriorityInfo } from '../types';
import type { Task, UpdateTaskBody } from '../types';

type TaskSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  onDragToSchedule?: (task: Task, startTime: Date) => void;
};

export function TaskSidebar({ isOpen, onToggle, onDragToSchedule }: TaskSidebarProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState(3);
  const [showNewTask, setShowNewTask] = useState(false);
  const [dragOverPriority, setDragOverPriority] = useState<number | null>(null);
  const [dragInsertIndex, setDragInsertIndex] = useState<number>(-1);
  const [focusedTaskIndex, setFocusedTaskIndex] = useState<{ priority: number; index: number } | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  
  const liveRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await getTasks();
      setTasks(allTasks.sort((a, b) => {
        // Sort by priority (0=highest), then by priority decimal for fine ordering
        if (Math.floor(a.priority) !== Math.floor(b.priority)) {
          return Math.floor(a.priority) - Math.floor(b.priority);
        }
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }));
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const announceToLiveRegion = (message: string) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  };

  const calculateNewPriority = (targetPriority: number, targetIndex: number, tasksInPriority: Task[]): number => {
    const floor = Math.floor(targetPriority);
    const ceiling = floor + 1;
    
    // If dropping at the beginning
    if (targetIndex === 0) {
      if (tasksInPriority.length === 0) {
        return floor + 0.5;
      }
      const firstTask = tasksInPriority[0];
      return Math.max(floor, firstTask.priority - 0.1);
    }
    
    // If dropping at the end
    if (targetIndex >= tasksInPriority.length) {
      if (tasksInPriority.length === 0) {
        return floor + 0.5;
      }
      const lastTask = tasksInPriority[tasksInPriority.length - 1];
      return Math.min(ceiling - 0.001, lastTask.priority + 0.1);
    }
    
    // If dropping between tasks
    const prevTask = tasksInPriority[targetIndex - 1];
    const nextTask = tasksInPriority[targetIndex];
    
    if (prevTask && nextTask) {
      return (prevTask.priority + nextTask.priority) / 2;
    } else if (prevTask) {
      return Math.min(ceiling - 0.001, prevTask.priority + 0.1);
    } else if (nextTask) {
      return Math.max(floor, nextTask.priority - 0.1);
    }
    
    return floor + 0.5;
  };

  const calculateInsertionIndex = (mouseY: number, containerRect: DOMRect, tasksInPriority: Task[]): number => {
    if (tasksInPriority.length === 0) return 0;
    
    const headerHeight = 32; // Priority header height
    const relativeY = mouseY - containerRect.top - headerHeight;
    
    if (relativeY <= 0) return 0;
    
    // Find all task elements and their midpoints
    const taskElements = Array.from(document.querySelectorAll(`[data-task-priority="${Math.floor(tasksInPriority[0].priority)}"] [data-task-index]`));
    
    for (let i = 0; i < taskElements.length; i++) {
      const taskRect = taskElements[i].getBoundingClientRect();
      const taskRelativeTop = taskRect.top - containerRect.top - headerHeight;
      const taskMidpoint = taskRelativeTop + (taskRect.height / 2);
      
      if (relativeY < taskMidpoint) {
        return i;
      }
    }
    
    return tasksInPriority.length;
  };

  const handleTaskReorder = async (draggedTask: Task, targetPriority: number, targetIndex: number) => {
    try {
      setIsReordering(true);
      const tasksInTargetPriority = tasks
        .filter(t => Math.floor(t.priority) === targetPriority && t.id !== draggedTask.id)
        .sort((a, b) => a.priority - b.priority);
      
      const newPriority = calculateNewPriority(targetPriority, targetIndex, tasksInTargetPriority);
      
      await updateTask(draggedTask.id, { priority: newPriority });
      
      // Announce the move
      const priorityName = getPriorityInfo(targetPriority).name;
      announceToLiveRegion(`Moved "${draggedTask.title}" to position ${targetIndex + 1} in ${priorityName} priority`);
      
      loadTasks();
    } catch (error) {
      console.error('Failed to reorder task:', error);
      announceToLiveRegion('Failed to move task');
    } finally {
      setIsReordering(false);
    }
  };

  const handleKeyboardReorder = async (direction: 'up' | 'down') => {
    if (!focusedTaskIndex) return;
    
    const { priority, index } = focusedTaskIndex;
    const tasksInPriority = tasksByPriority[priority] || [];
    const task = tasksInPriority[index];
    
    if (!task) return;
    
    let newIndex = index;
    let newPriority = priority;
    
    if (direction === 'up') {
      if (index > 0) {
        newIndex = index - 1;
      } else if (priority > 0) {
        // Move to end of previous priority group
        newPriority = priority - 1;
        const prevPriorityTasks = tasksByPriority[newPriority] || [];
        newIndex = prevPriorityTasks.length;
      }
    } else {
      if (index < tasksInPriority.length - 1) {
        newIndex = index + 1;
      } else if (priority < 5) {
        // Move to beginning of next priority group
        newPriority = priority + 1;
        newIndex = 0;
      }
    }
    
    if (newIndex !== index || newPriority !== priority) {
      await handleTaskReorder(task, newPriority, newIndex);
      setFocusedTaskIndex({ priority: newPriority, index: newIndex });
    }
  };

  const getPriorityColor = (priority: number) => {
    const basePriority = Math.floor(priority);
    switch (basePriority) {
      case 0: return 'text-blue-400 bg-blue-900/20'; // Buffer
      case 1: return 'text-red-400 bg-red-900/20';   // Emergency
      case 2: return 'text-orange-400 bg-orange-900/20'; // ASAP
      case 3: return 'text-yellow-400 bg-yellow-900/20'; // Must today
      case 4: return 'text-green-400 bg-green-900/20';   // Deadline soon
      case 5: return 'text-gray-400 bg-gray-900/20';     // If possible
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await createTask({
        title: newTaskTitle.trim(),
        priority: newTaskPriority
      });
      
      setNewTaskTitle('');
      setNewTaskPriority(3);
      setShowNewTask(false);
      loadTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  };

  const handleToggleTask = async (task: Task) => {
    try {
      const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
      const updates: UpdateTaskBody = { status: newStatus };
      await updateTask(task.id, updates);
      loadTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    
    try {
      await deleteTask(task.id);
      loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const filteredTasks = tasks.filter(task => 
    showCompleted || (task.status !== 'DONE' && task.status !== 'CANCELLED')
  );

  const tasksByPriority = filteredTasks.reduce((acc, task) => {
    const priority = Math.floor(task.priority);
    if (!acc[priority]) acc[priority] = [];
    acc[priority].push(task);
    return acc;
  }, {} as Record<number, Task[]>);

  // Sort tasks within each priority by their exact priority value
  Object.keys(tasksByPriority).forEach(priority => {
    tasksByPriority[parseInt(priority)].sort((a, b) => a.priority - b.priority);
  });

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-0 top-1/2 -translate-y-1/2 bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-4 rounded-r-lg border-r border-t border-b border-zinc-600 text-sm z-40"
      >
        Tasks
      </button>
    );
  }

  return (
    <div className="fixed left-0 top-0 bottom-0 w-80 bg-zinc-900 border-r border-zinc-700 z-40 flex flex-col">
      {/* ARIA Live Region for announcements */}
      <div
        ref={liveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-700">
        <h2 className="font-semibold">Task Backlog</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewTask(!showNewTask)}
            className="text-xl leading-none text-zinc-400 hover:text-white"
            title="Add task"
          >
            +
          </button>
          <button
            onClick={onToggle}
            className="text-xl leading-none text-zinc-400 hover:text-white"
          >
            ×
          </button>
        </div>
      </div>

      {/* New Task Form */}
      {showNewTask && (
        <div className="p-4 border-b border-zinc-700 bg-zinc-800">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTask();
                if (e.key === 'Escape') setShowNewTask(false);
              }}
              className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:border-zinc-400"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(Number(e.target.value))}
                className="bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-white text-sm"
              >
                {Object.entries(TASK_PRIORITIES).map(([priority, info]) => (
                  <option key={priority} value={priority}>
                    {priority}: {info.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowNewTask(false)}
                  className="px-2 py-1 text-zinc-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={!newTaskTitle.trim()}
                  className="px-2 py-1 bg-zinc-600 hover:bg-zinc-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded text-sm"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-700">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded"
          />
          Show completed
        </label>
        <button
          onClick={loadTasks}
          className="text-xs text-zinc-400 hover:text-white"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Help text */}
      <div className="px-4 py-2 text-xs text-zinc-400 border-b border-zinc-700 bg-zinc-800/50">
        Drag to priority zones to change priority • Shift+↑↓ for keyboard reorder
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-zinc-400">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-4 text-center text-zinc-400">
            {showCompleted ? 'No tasks found' : 'No active tasks'}
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {/* Show ALL priorities (0-5), even if empty */}
            {Array.from({ length: 6 }, (_, priority) => {
              const priorityTasks = tasksByPriority[priority] || [];
              
              return (
                <div 
                  key={priority} 
                  className={`border-2 border-dashed rounded transition-colors ${
                    dragOverPriority === priority 
                      ? 'border-blue-400 bg-blue-400/10' 
                      : 'border-zinc-600/30'
                  }`}
                  data-task-priority={priority}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.types.includes('text/plain')) {
                      setDragOverPriority(priority);
                      
                      // Calculate insertion index based on mouse position
                      const containerRect = e.currentTarget.getBoundingClientRect();
                      const insertIndex = calculateInsertionIndex(e.clientY, containerRect, priorityTasks);
                      setDragInsertIndex(insertIndex);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverPriority(null);
                      setDragInsertIndex(-1);
                    }
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const targetIndex = dragInsertIndex;
                    setDragOverPriority(null);
                    setDragInsertIndex(-1);
                    
                    try {
                      const priorityData = JSON.parse(e.dataTransfer.getData('text/plain'));
                      
                      if (priorityData.type === 'task-reorder' && priorityData.taskId) {
                        const draggedTask = tasks.find(t => t.id === priorityData.taskId);
                        if (draggedTask) {
                          const currentPriority = Math.floor(draggedTask.priority);
                          let finalIndex = targetIndex;
                          
                          // For cross-priority drops, append to end unless specific index calculated
                          if (currentPriority !== priority && targetIndex === -1) {
                            finalIndex = priorityTasks.length;
                          } else if (targetIndex === -1) {
                            finalIndex = priorityTasks.length;
                          }
                          
                          await handleTaskReorder(draggedTask, priority, finalIndex);
                        }
                      }
                    } catch (error) {
                      console.error('Failed to handle priority drop:', error);
                    }
                  }}
                >
                  {/* Priority Header */}
                  <div className={`text-xs px-2 py-1 rounded-t font-semibold ${getPriorityColor(priority)}`}>
                    {priority}: {getPriorityInfo(Number(priority)).name} ({priorityTasks.length})
                    {priorityTasks.length === 0 && (
                      <span className="ml-2 text-[10px] opacity-70">Drop tasks here</span>
                    )}
                  </div>
                  
                  {/* Tasks Container */}
                  <div className="p-2 space-y-1 min-h-[2rem]">
                    {priorityTasks.map((task, index) => (
                      <div key={`${task.id}-${index}`}>
                        {/* Insertion indicator */}
                        {dragOverPriority === priority && dragInsertIndex === index && (
                          <div className="h-0.5 bg-blue-400 rounded-full mb-1" />
                        )}

                        {/* Task Item */}
                        <div
                          className="group bg-zinc-800 hover:bg-zinc-700 rounded p-2 border border-zinc-700 hover:border-zinc-600 focus-within:border-zinc-400 transition-all cursor-move"
                          draggable
                          tabIndex={0}
                          role="button"
                          data-task-index={index}
                          aria-label={`Task: ${task.title}. Priority ${Math.floor(task.priority)}: ${getPriorityInfo(Math.floor(task.priority)).name}. Position ${index + 1} of ${priorityTasks.length}. Press Shift+Arrow keys to reorder.`}
                          onFocus={() => setFocusedTaskIndex({ priority, index })}
                          onKeyDown={(e) => {
                            if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.shiftKey) {
                              e.preventDefault();
                              handleKeyboardReorder(e.key === 'ArrowUp' ? 'up' : 'down');
                            }
                          }}
                          onDragStart={(e) => {
                            // Set reorder data for task list
                            const reorderData = JSON.stringify({
                              type: 'task-reorder',
                              taskId: task.id,
                              currentPriority: Math.floor(task.priority),
                              currentIndex: index
                            });
                            
                            // Set task data for calendar scheduling
                            const taskData = JSON.stringify({
                              type: 'task',
                              task
                            });
                            
                            e.dataTransfer.setData('text/plain', reorderData);
                            e.dataTransfer.setData('application/json', taskData);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            setDragOverPriority(null);
                            setDragInsertIndex(-1);
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => handleToggleTask(task)}
                              className={`mt-0.5 w-4 h-4 border-2 rounded ${
                                task.status === 'DONE' 
                                  ? 'bg-green-600 border-green-600' 
                                  : 'border-zinc-500 hover:border-zinc-400'
                              }`}
                              tabIndex={-1}
                            >
                              {task.status === 'DONE' && (
                                <div className="text-white text-xs leading-none">✓</div>
                              )}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm ${task.status === 'DONE' ? 'line-through text-zinc-500' : 'text-white'}`}>
                                {task.title}
                              </div>
                              
                              {task.description && (
                                <div className="text-xs text-zinc-400 mt-1">
                                  {task.description}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                                {task.estimatedMinutes && (
                                  <span>~{task.estimatedMinutes}m</span>
                                )}
                                {task.dueDate && (
                                  <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                )}
                                {task.tags.length > 0 && (
                                  <span>#{task.tags.join(' #')}</span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 text-sm"
                              tabIndex={-1}
                            >
                              ×
                            </button>
                          </div>
                        </div>

                        {/* Final insertion indicator */}
                        {dragOverPriority === priority && 
                         dragInsertIndex === index + 1 && 
                         index === priorityTasks.length - 1 && (
                          <div className="h-0.5 bg-blue-400 rounded-full mt-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-700 text-xs text-zinc-400">
        Drag tasks to calendar to schedule • Drag within priority zones to reorder
      </div>
    </div>
  );
}