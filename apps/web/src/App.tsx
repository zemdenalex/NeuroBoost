// apps/web/src/App.tsx - Fixed task scheduling
import { useEffect, useState } from 'react';
import { WeekGrid } from './pages/WeekGrid';
import { MonthlyView } from './pages/MonthlyView';
import { Editor } from './components/Editor';
import { TaskSidebar } from './components/TaskSidebar';
import NudgeBadge from './components/NudgeBadge';
import DbBadge from './components/DbBadge';
import StatsBadge from './components/StatsBadge';
import type { NbEvent, Task, CreateEventBody } from './types';
import { getEvents, patchEventUTC, deleteEvent, createEventUTC, API_BASE, updateTask, UpdateTaskBody } from './api';
import { getTasks } from './api';

type Range = { start: Date; end: Date } | null;
type ViewMode = 'week' | 'month';

export default function App() {
  const [events, setEvents] = useState<NbEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [range, setRange] = useState<Range>(null);
  const [draft, setDraft] = useState<NbEvent | null>(null);
  const [taskSidebarOpen, setTaskSidebarOpen] = useState(true); // Default open
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showDeadlineTasks, setShowDeadlineTasks] = useState(true);

  async function loadTasks() {
    try {
      const allTasks = await getTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  // Add useEffect to load tasks on mount and when events change
  useEffect(() => {
    loadTasks();
  }, []);

  function weekRangeUtc(weekOffset: number = 0): { start: string; end: string } {
    const nowUtcMs = Date.now();
    const nowMsk = new Date(nowUtcMs + 3 * 60 * 60 * 1000);
    const mondayIndex = (nowMsk.getUTCDay() + 6) % 7;
    const todayMskMidnight = new Date(nowMsk);
    todayMskMidnight.setUTCHours(0, 0, 0, 0);
    const mondayMskMidnightMs = todayMskMidnight.getTime() - mondayIndex * 86400000;
    const targetMondayMs = mondayMskMidnightMs + (weekOffset * 7 * 86400000);
    const mondayUtc0 = targetMondayMs - 3 * 60 * 60 * 1000;
    const nextMondayUtc0 = mondayUtc0 + 7 * 86400000;
    return { start: new Date(mondayUtc0).toISOString(), end: new Date(nextMondayUtc0).toISOString() };
  }

  function monthRangeUtc(date: Date): { start: string; end: string } {
    const mskOffset = 3 * 60 * 60 * 1000;
    // start at the Monday three weeks before the first of the month
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const rangeStart = new Date(monthStart);
    rangeStart.setDate(rangeStart.getDate() - 21);
    rangeStart.setHours(0,0,0,0);
    // end at the Sunday three weeks after the end of the month
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const rangeEnd = new Date(monthEnd);
    rangeEnd.setDate(rangeEnd.getDate() + 21);
    rangeEnd.setHours(23,59,59,999);
    const startUtc = new Date(rangeStart.getTime() - mskOffset);
    const endUtc   = new Date(rangeEnd.getTime() - mskOffset);
    return { start: startUtc.toISOString(), end: endUtc.toISOString() };
  }


  async function refresh() {
    try {
      let start, end;
      if (viewMode === 'week') {
        ({ start, end } = weekRangeUtc(currentWeekOffset));
      } else {
        ({ start, end } = monthRangeUtc(currentMonthDate));
      }
      const data = await getEvents(start, end);
      setEvents(data);
      
      await loadTasks();
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  }

  useEffect(() => { 
    refresh(); 
  }, [viewMode, currentWeekOffset, currentMonthDate]);

  function onCreate(slot: { 
    startUtc: string; 
    endUtc: string; 
    allDay?: boolean; 
    daySpan?: number 
  }) {
    setRange({ 
      start: new Date(slot.startUtc), 
      end: new Date(slot.endUtc) 
    });
    setDraft(null);
  }

  async function onMoveOrResize(patch: { 
    id: string; 
    startUtc?: string; 
    endUtc?: string 
  }) {
    try {
      await patchEventUTC(patch.id, { 
        startsAt: patch.startUtc!, 
        endsAt: patch.endUtc! 
      });
      refresh();
    } catch (error) {
      console.error('Failed to move/resize event:', error);
    }
  }

  function onSelect(e: NbEvent) { 
    setDraft(e); 
    setRange(null); 
  }

  async function onDelete(id: string) { 
    try {
      await deleteEvent(id); 
      setDraft(null);
      setRange(null);
      refresh(); 
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  }

  function onWeekChange(newOffset: number) {
    setCurrentWeekOffset(newOffset);
  }

  function onMonthChange(newDate: Date) {
    setCurrentMonthDate(newDate);
  }

  // FIXED: Navigate to week containing clicked day
  function onDayClick(date: Date) {
    // Calculate which week offset contains this date
    const clickedTime = date.getTime();
    const nowUtcMs = Date.now();
    const nowMsk = new Date(nowUtcMs + 3 * 60 * 60 * 1000);
    const mondayIndex = (nowMsk.getUTCDay() + 6) % 7;
    const todayMskMidnight = new Date(nowMsk);
    todayMskMidnight.setUTCHours(0, 0, 0, 0);
    const currentMondayMs = todayMskMidnight.getTime() - mondayIndex * 86400000;
    
    // Find Monday of the clicked date's week
    const clickedMsk = new Date(clickedTime + 3 * 60 * 60 * 1000);
    const clickedMondayIndex = (clickedMsk.getUTCDay() + 6) % 7;
    const clickedMskMidnight = new Date(clickedMsk);
    clickedMskMidnight.setUTCHours(0, 0, 0, 0);
    const clickedMondayMs = clickedMskMidnight.getTime() - clickedMondayIndex * 86400000;
    
    const weekOffset = Math.round((clickedMondayMs - currentMondayMs) / (7 * 86400000));
    setCurrentWeekOffset(weekOffset);
    setViewMode('week');
  }

  // FIXED: Handle drag-to-schedule with proper validation
  async function onDragTaskToSchedule(task: Task, startTime: Date) {
    try {
      const estimatedDuration = task.estimatedMinutes || 60;
      const endTime = new Date(startTime.getTime() + estimatedDuration * 60 * 1000);

      const eventData: CreateEventBody = {
        title: `📋 ${task.title}`,  // Add emoji to distinguish scheduled tasks
        startsAt: startTime.toISOString(),
        endsAt: endTime.toISOString(),
        allDay: false,
        description: task.description ? `From task: ${task.description}` : `Scheduled from task backlog`,
        tags: [...(task.tags || []), 'scheduled', 'from-task'],
        reminders: [{
          minutesBefore: estimatedDuration <= 30 ? 3 : estimatedDuration <= 60 ? 5 : 15,
          channel: 'TELEGRAM' as const
        }]
      };

      await createEventUTC(eventData);
      
      // Update task status
      await updateTask(task.id, { status: 'SCHEDULED' });
      
      refresh();
    } catch (error) {
      console.error('Failed to schedule task:', error);
      alert('Failed to schedule task: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  function onCreateMultiDay(startDate: Date, endDate: Date) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    onCreate({
      startUtc: start.toISOString(),
      endUtc: end.toISOString(),
      allDay: true,
      daySpan: Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    });
  }

  // Handle Escape key to close editor
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && (range || draft)) {
        setRange(null);
        setDraft(null);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [range, draft]);

  const currentViewLabel = viewMode === 'week' 
    ? `Week ${currentWeekOffset === 0 ? '(current)' : currentWeekOffset > 0 ? `+${currentWeekOffset}` : currentWeekOffset}`
    : `${currentMonthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`;

  return (
    <div className="font-mono flex flex-col h-screen relative">
      {/* Task Sidebar */}
      <TaskSidebar 
        isOpen={taskSidebarOpen}
        onToggle={() => setTaskSidebarOpen(!taskSidebarOpen)}
        onDragToSchedule={onDragTaskToSchedule}
      />

      {/* Main Content */}
      <div className={`flex flex-col h-screen transition-all duration-200 ${taskSidebarOpen ? 'ml-80' : 'ml-0'}`}>
        {/* Header */}
        <header className="flex items-center justify-between p-2 border-b border-zinc-700 bg-zinc-900">
          <div className="flex items-center gap-3">
            {!taskSidebarOpen && (
              <button
                onClick={() => setTaskSidebarOpen(true)}
                className="text-sm text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-zinc-800"
              >
                Tasks
              </button>
            )}
            <div className="font-semibold">NeuroBoost</div>
            <div className="text-xs text-zinc-500">v0.3.0</div>
          </div>

          {/* Add this toggle button */}
          <button
            onClick={() => setShowDeadlineTasks(!showDeadlineTasks)}
            className={`text-xs px-2 py-1 rounded ${
              showDeadlineTasks 
                ? 'bg-zinc-600 text-white' 
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Toggle deadline tasks"
          >
            📍 Deadlines
          </button>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-800 rounded border border-zinc-700">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-sm rounded-l ${
                  viewMode === 'week' 
                    ? 'bg-zinc-600 text-white' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-sm rounded-r ${
                  viewMode === 'month' 
                    ? 'bg-zinc-600 text-white' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                Month
              </button>
            </div>
            
            <div className="text-sm text-zinc-300 px-2">
              {currentViewLabel}
            </div>
            
            <button
              onClick={() => setShowExportPanel(!showExportPanel)}
              className="text-xs text-zinc-400 hover:text-white underline"
            >
              Export
            </button>
            <StatsBadge />
            <DbBadge />
            <NudgeBadge />
          </div>
        </header>

        {/* Export Panel */}
        {showExportPanel && (
          <div className="p-4 bg-zinc-800 border-b border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Obsidian Export</h3>
              <button
                onClick={() => setShowExportPanel(false)}
                className="text-zinc-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="text-sm text-zinc-400 mb-2">
              Preview files that would be written to your Obsidian vault (dry-run only).
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`${API_BASE}/export/dry-run`);
                    const data = await response.json();
                    console.log('Export preview:', data);
                    alert(`Would create ${data.planned} files (${Math.round(data.totalBytes / 1024)}KB)`);
                  } catch (error) {
                    alert('Failed to run export preview');
                  }
                }}
                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
              >
                Preview Export
              </button>
              <div className="text-xs text-amber-400 px-2 py-1 rounded bg-amber-900/20">
                Writes disabled in v0.3.0
              </div>
            </div>
          </div>
        )}

        {/* Calendar Views */}
        <main className="flex-1 overflow-hidden">
          {viewMode === 'week' ? (
            <WeekGrid
              events={events}
              currentWeekOffset={currentWeekOffset}
              onCreate={onCreate}
              onMoveOrResize={onMoveOrResize}
              onSelect={onSelect}
              onDelete={onDelete}
              onWeekChange={onWeekChange}
              onTaskDrop={onDragTaskToSchedule}
              showDeadlineTasks={showDeadlineTasks} 
            />
          ) : (
            <MonthlyView
              events={events}
              currentDate={currentMonthDate}
              onDateChange={onMonthChange}
              onDayClick={onDayClick}
              onEventClick={onSelect}
              onCreate={(date) => {
                const startUtc = new Date(date);
                startUtc.setHours(0, 0, 0, 0);
                const endUtc = new Date(date);
                endUtc.setHours(23, 59, 59, 999);
                
                onCreate({
                  startUtc: startUtc.toISOString(),
                  endUtc: endUtc.toISOString(),
                  allDay: true
                });
              }}
              onCreateMultiDay={onCreateMultiDay}
              selectedEventId={draft?.id}
            />
          )}
        </main>
      </div>

      {/* Event Editor Modal - Click outside to close */}
      {(range || draft) && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRange(null);
              setDraft(null);
            }
          }}
        >
          <Editor
            range={range}
            draft={draft}
            onClose={() => { setRange(null); setDraft(null); }}
            onCreated={() => { setRange(null); refresh(); }}
            onPatched={() => { setDraft(null); refresh(); }}
            onDelete={onDelete}
            onRangeChange={(newRange) => setRange(newRange)}
          />
        </div>
      )}
      
      {/* Help Overlay */}
      <div className="fixed bottom-4 right-4">
        <details className="bg-zinc-800 border border-zinc-700 rounded p-2 text-xs">
          <summary className="cursor-pointer text-zinc-400 hover:text-white">
            Shortcuts
          </summary>
          <div className="mt-2 space-y-1 text-zinc-300 w-64">
            <div><strong>Week View:</strong></div>
            <div>• Drag empty: create event</div>
            <div>• Drag event: move (Ctrl for cross-day)</div>
            <div>• Drag in all-day lane: multi-day event</div>
            <div>• Drag task from sidebar: schedule</div>
            <div>• +/-: nudge selected ±15min</div>
            <div>• Enter: edit selected</div>
            <div>• Del: delete selected</div>
            
            <div className="pt-2"><strong>Month View:</strong></div>
            <div>• Click day: go to week view</div>
            <div>• Double-click: create all-day event</div>
            <div>• Drag across days: multi-day event</div>
            
            <div className="pt-2"><strong>Editor:</strong></div>
            <div>• Escape or click outside: cancel</div>
            <div>• Ctrl+Enter: save</div>
            <div>• Delete button: remove event</div>
          </div>
        </details>
      </div>
    </div>
  );
}