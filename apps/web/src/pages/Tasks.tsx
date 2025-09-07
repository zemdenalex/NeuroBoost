// apps/web/src/pages/Tasks.tsx

import { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from '../api';
import { TASK_PRIORITIES, getPriorityInfo } from '../types';
import type { Task } from '../types';

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<Task['status'] | 'all'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'priority' | 'created' | 'due'>('priority');
  const [showNewTask, setShowNewTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const allTasks = await getTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleBulkOperation = async (operation: string) => {
    if (selectedTasks.size === 0) return;

    try {
      const taskIds = Array.from(selectedTasks);
      
      switch (operation) {
        case 'mark_done':
          await fetch(`${API_BASE}/tasks/bulk`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskIds, operation: 'mark_done' })
          });
          break;
        
        case 'set_priority':
          const priority = prompt('Set priority (0-5):');
          if (priority !== null) {
            await fetch(`${API_BASE}/tasks/bulk`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                taskIds, 
                operation: 'set_priority',
                data: { priority: Number(priority) }
              })
            });
          }
          break;
        
        case 'delete':
          if (confirm(`Delete ${selectedTasks.size} tasks?`)) {
            for (const id of taskIds) {
              await deleteTask(id);
            }
          }
          break;
      }

      setSelectedTasks(new Set());
      setBulkMode(false);
      loadTasks();
    } catch (error) {
      console.error('Bulk operation failed:', error);
    }
  };

  // Get all unique tags
  const allTags = Array.from(
    new Set(tasks.flatMap(task => task.tags))
  );

  // Filter and sort tasks
  const filteredTasks = tasks.filter(task => {
    if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;
    if (selectedStatus !== 'all' && task.status !== selectedStatus) return false;
    if (selectedTags.length > 0 && !selectedTags.some(tag => task.tags.includes(tag))) return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        return a.priority - b.priority;
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'due':
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      default:
        return 0;
    }
  });

  // Group by priority for Kanban view
  const tasksByPriority = sortedTasks.reduce((acc, task) => {
    if (!acc[task.priority]) acc[task.priority] = [];
    acc[task.priority].push(task);
    return acc;
  }, {} as Record<number, Task[]>);

  return (
    <div className="h-full flex flex-col bg-black text-zinc-100 font-mono">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-700 bg-zinc-900">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Task Management</h1>
          <button
            onClick={() => window.location.hash = '#/'}
            className="text-sm text-zinc-400 hover:text-white"
          >
            ← Back to Calendar
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className={`px-3 py-1 text-sm rounded ${
              bulkMode 
                ? 'bg-blue-600 text-white' 
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {bulkMode ? 'Exit Bulk Mode' : 'Bulk Edit'}
          </button>
          
          <button
            onClick={() => setShowNewTask(true)}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
          >
            + New Task
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="p-4 border-b border-zinc-700 bg-zinc-900 flex flex-wrap gap-4">
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="bg-zinc-800 border border-zinc-600 rounded px-3 py-1 text-sm"
        >
          <option value="all">All Priorities</option>
          {Object.entries(TASK_PRIORITIES).map(([priority, info]) => (
            <option key={priority} value={priority}>
              {priority}: {info.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as any)}
          className="bg-zinc-800 border border-zinc-600 rounded px-3 py-1 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="TODO">Todo</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="DONE">Done</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-zinc-800 border border-zinc-600 rounded px-3 py-1 text-sm"
        >
          <option value="priority">Sort by Priority</option>
          <option value="created">Sort by Created</option>
          <option value="due">Sort by Due Date</option>
        </select>

        {allTags.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Tags:</span>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  if (selectedTags.includes(tag)) {
                    setSelectedTags(selectedTags.filter(t => t !== tag));
                  } else {
                    setSelectedTags([...selectedTags, tag]);
                  }
                }}
                className={`px-2 py-1 text-xs rounded ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {bulkMode && selectedTasks.size > 0 && (
        <div className="p-3 bg-zinc-800 border-b border-zinc-700 flex items-center gap-2">
          <span className="text-sm">{selectedTasks.size} selected</span>
          <button
            onClick={() => handleBulkOperation('mark_done')}
            className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
          >
            Mark Done
          </button>
          <button
            onClick={() => handleBulkOperation('set_priority')}
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Set Priority
          </button>
          <button
            onClick={() => handleBulkOperation('delete')}
            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Delete
          </button>
        </div>
      )}

      {/* Task Kanban */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-w-max h-full">
          {Array.from({ length: 6 }, (_, priority) => {
            const priorityTasks = tasksByPriority[priority] || [];
            const info = getPriorityInfo(priority);
            
            return (
              <div key={priority} className="w-80 flex flex-col">
                <div className={`p-3 rounded-t font-semibold text-sm ${
                  priority === 0 ? 'bg-blue-900 text-blue-100' :
                  priority === 1 ? 'bg-red-900 text-red-100' :
                  priority === 2 ? 'bg-orange-900 text-orange-100' :
                  priority === 3 ? 'bg-yellow-900 text-yellow-100' :
                  priority === 4 ? 'bg-green-900 text-green-100' :
                  'bg-gray-900 text-gray-100'
                }`}>
                  {priority}: {info.name} ({priorityTasks.length})
                </div>
                
                <div className="flex-1 bg-zinc-900 border border-zinc-700 border-t-0 rounded-b p-2 overflow-y-auto">
                  <div className="space-y-2">
                    {priorityTasks.map(task => (
                      <div
                        key={task.id}
                        className="bg-zinc-800 border border-zinc-600 rounded p-3 hover:border-zinc-500 transition-colors"
                        draggable
                        onDragStart={(e) => {
                          const dragData = JSON.stringify({
                            type: 'task-priority-change',
                            taskId: task.id,
                            currentPriority: task.priority
                          });
                          e.dataTransfer.setData('application/json', dragData);
                        }}
                      >
                        <div className="flex items-start gap-2">
                          {bulkMode && (
                            <input
                              type="checkbox"
                              checked={selectedTasks.has(task.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedTasks);
                                if (e.target.checked) {
                                  newSelected.add(task.id);
                                } else {
                                  newSelected.delete(task.id);
                                }
                                setSelectedTasks(newSelected);
                              }}
                              className="mt-1"
                            />
                          )}
                          
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{task.title}</h4>
                            
                            {task.description && (
                              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              {task.estimatedMinutes && (
                                <span className="text-zinc-500">
                                  ~{task.estimatedMinutes}m
                                </span>
                              )}
                              
                              {task.dueDate && (
                                <span className={`${
                                  new Date(task.dueDate) < new Date() 
                                    ? 'text-red-400' 
                                    : 'text-zinc-500'
                                }`}>
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              
                              {task.status !== 'TODO' && (
                                <span className={`px-1 rounded ${
                                  task.status === 'DONE' ? 'bg-green-900 text-green-200' :
                                  task.status === 'IN_PROGRESS' ? 'bg-blue-900 text-blue-200' :
                                  task.status === 'SCHEDULED' ? 'bg-purple-900 text-purple-200' :
                                  'bg-gray-900 text-gray-200'
                                }`}>
                                  {task.status}
                                </span>
                              )}
                            </div>
                            
                            {task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {task.tags.map(tag => (
                                  <span key={tag} className="text-xs text-zinc-500">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => setEditingTask(task)}
                            className="text-zinc-500 hover:text-zinc-300"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Editor Modal */}
      {(showNewTask || editingTask) && (
        <TaskEditor
          task={editingTask}
          onSave={async (taskData) => {
            try {
              if (editingTask) {
                await updateTask(editingTask.id, taskData);
              } else {
                await createTask(taskData);
              }
              setShowNewTask(false);
              setEditingTask(null);
              loadTasks();
            } catch (error) {
              console.error('Failed to save task:', error);
            }
          }}
          onCancel={() => {
            setShowNewTask(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

// Task Editor Component
function TaskEditor({ 
  task, 
  onSave, 
  onCancel 
}: { 
  task?: Task | null; 
  onSave: (data: any) => Promise<void>; 
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 3,
    status: task?.status || 'TODO',
    tags: task?.tags?.join(', ') || '',
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
    estimatedMinutes: task?.estimatedMinutes || ''
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">
          {task ? 'Edit Task' : 'New Task'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
              >
                {Object.entries(TASK_PRIORITIES).map(([priority, info]) => (
                  <option key={priority} value={priority}>
                    {priority}: {info.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Task['status'] })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
              >
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="DONE">Done</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Est. Minutes</label>
              <input
                type="number"
                value={form.estimatedMinutes}
                onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
              placeholder="work, urgent, project-x"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-zinc-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({
              title: form.title.trim(),
              description: form.description.trim(),
              priority: form.priority,
              status: form.status,
              tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
              dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
              estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined
            })}
            disabled={!form.title.trim()}
            className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}