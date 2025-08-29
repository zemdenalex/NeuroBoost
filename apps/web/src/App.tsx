// apps/web/src/App.tsx - Fixed with task sidebar open by default
import { useEffect, useState } from 'react';
import { WeekGrid } from './pages/WeekGrid';
import { MonthlyView } from './pages/MonthlyView';
import { Editor } from './components/Editor';
import { TaskSidebar } from './components/TaskSidebar';
import NudgeBadge from './components/NudgeBadge';
import DbBadge from './components/DbBadge';
import StatsBadge from './components/StatsBadge';
import type { NbEvent, Task, CreateEventBody } from './types';
import { getEvents, patchEventUTC, deleteEvent, createEventUTC, API_BASE } from './api';

type Range = { start: Date; end: Date } | null;
type ViewMode = 'week' | 'month';

export default function App() {
  const [events, setEvents] = useState<NbEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [range, setRange] = useState<Range>(null);
  const [draft, setDraft] = useState<NbEvent | null>(null);
  const [taskSidebarOpen, setTaskSidebarOpen] = useState(true); // FIXED: Default to open
  const [showExportPanel, setShowExportPanel] = useState(false);

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
    // Get start of month
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    
    // Get calendar start (include prev month days to fill first week)
    const calendarStart = new Date(monthStart);
    const startDayOfWeek = (monthStart.getDay() + 6) % 7; // Monday = 0
    calendarStart.setDate(calendarStart.getDate() - startDayOfWeek);
    
    // Get end of month  
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Get calendar end (include next month days to fill last week)
    const calendarEnd = new Date(monthEnd);
    const endDayOfWeek = (monthEnd.getDay() + 6) % 7;
    calendarEnd.setDate(calendarEnd.getDate() + (6 - endDayOfWeek));
    calendarEnd.setHours(23, 59, 59, 999);
    
    // Convert to UTC
    const startUtc = new Date(calendarStart.getTime() - 3 * 60 * 60 * 1000);
    const endUtc = new Date(calendarEnd.getTime() - 3 * 60 * 60 * 1000);
    
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

  function onDayClick(date: Date) {
    // Switch to week view and navigate to the clicked day
    const clickedWeekOffset = Math.floor(
      (date.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)
    );
    setCurrentWeekOffset(Math.round(clickedWeekOffset));
    setViewMode('week');
  }

  // Handle drag-to-schedule from task sidebar
  async function onDragTaskToSchedule(task: Task, startTime: Date) {
    try {
      const estimatedDuration = task.estimatedMinutes || 60; // Default 1 hour
      const endTime = new Date(startTime.getTime() + estimatedDuration * 60 * 1000);

      const eventData: CreateEventBody = {
        title: task.title,
        startsAt: startTime.toISOString(),
        endsAt: endTime.toISOString(),
        allDay: false,
        description: task.description,
        tags: [...(task.tags || []), 'scheduled'],
        reminders: [{
          minutesBefore: 5,
          channel: 'TELEGRAM'
        }]
      };

      await createEventUTC(eventData);

      // Update task status to SCHEDULED
      // This would need a task update API call
      refresh();
    } catch (error) {
      console.error('Failed to schedule task:', error);
      alert('Failed to schedule task');
    }
  }

  // Handle multi-day event creation in monthly view
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

  const currentViewLabel = viewMode === 'week' 
    ? `Неделя ${currentWeekOffset === 0 ? '(текущая)' : currentWeekOffset > 0 ? `+${currentWeekOffset}` : currentWeekOffset}`
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
            />
          ) : (
            <MonthlyView
              events={events}
              currentDate={currentMonthDate}
              onDateChange={onMonthChange}
              onDayClick={onDayClick}
              onEventClick={onSelect}
              onCreate={(date) => {
                // Create an all-day event for the clicked date
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
              onCreateMultiDay={onCreateMultiDay} // FIXED: Add multi-day creation
              selectedEventId={draft?.id}
            />
          )}
        </main>
      </div>

      {/* Event Editor Modal */}
      {(range || draft) && (
        <Editor
          range={range}
          draft={draft}
          onClose={() => { setRange(null); setDraft(null); }}
          onCreated={() => { setRange(null); refresh(); }}
          onPatched={() => { setDraft(null); refresh(); }}
        />
      )}
      
      {/* Help Overlay (toggleable) */}
      <div className="fixed bottom-4 right-4">
        <details className="bg-zinc-800 border border-zinc-700 rounded p-2 text-xs">
          <summary className="cursor-pointer text-zinc-400 hover:text-white">
            Shortcuts
          </summary>
          <div className="mt-2 space-y-1 text-zinc-300 w-64">
            <div><strong>Week View:</strong></div>
            <div>• Drag empty: create event</div>
            <div>• Drag event: move within day</div>
            <div>• Ctrl+Drag event: move to other day</div>
            <div>• Drag across columns: multi-day event</div>
            <div>• Top lane: all-day events</div>
            <div>• ←/→: previous/next week</div>
            <div>• +/-: nudge selected event ±15min</div>
            <div>• Enter: edit selected event</div>
            <div>• Del: delete selected event</div>
            
            <div className="pt-2"><strong>Month View:</strong></div>
            <div>• Click day: switch to week view</div>
            <div>• Double-click day: create all-day event</div>
            <div>• Drag across days: multi-day event</div>
            <div>• Click event: edit event</div>
            
            <div className="pt-2"><strong>Tasks:</strong></div>
            <div>• Drag task to calendar to schedule</div>
            <div>• Tasks sidebar opens by default</div>
          </div>
        </details>
      </div>
    </div>
  );
}