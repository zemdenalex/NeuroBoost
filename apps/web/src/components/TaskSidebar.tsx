import { useState, useEffect } from 'react';
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
        // Sort by priority (0=highest), then by creation date
        if (a.priority !== b.priority) return a.priority - b.priority;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }));
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
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

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 0: return 'text-blue-400 bg-blue-900/20'; // Buffer
      case 1: return 'text-red-400 bg-red-900/20';   // Emergency
      case 2: return 'text-orange-400 bg-orange-900/20'; // ASAP
      case 3: return 'text-yellow-400 bg-yellow-900/20'; // Must today
      case 4: return 'text-green-400 bg-green-900/20';   // Deadline soon
      case 5: return 'text-gray-400 bg-gray-900/20';     // If possible
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const filteredTasks = tasks.filter(task => 
    showCompleted || (task.status !== 'DONE' && task.status !== 'CANCELLED')
  );

  const tasksByPriority = filteredTasks.reduce((acc, task) => {
    const priority = task.priority;
    if (!acc[priority]) acc[priority] = [];
    acc[priority].push(task);
    return acc;
  }, {} as Record<number, Task[]>);

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
            {Object.entries(tasksByPriority)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([priority, priorityTasks]) => (
                <div key={priority} className="space-y-1">
                  {/* Priority Header */}
                  <div className={`text-xs px-2 py-1 rounded font-semibold ${getPriorityColor(Number(priority))}`}>
                    {priority}: {getPriorityInfo(Number(priority)).name} ({priorityTasks.length})
                  </div>
                  
                  {/* Tasks in this priority */}
                  {priorityTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group bg-zinc-800 hover:bg-zinc-700 rounded p-2 border border-zinc-700 hover:border-zinc-600"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          type: 'task',
                          task
                        }));
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
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-700 text-xs text-zinc-400">
        Drag tasks to calendar to schedule
      </div>
    </div>
  );
}