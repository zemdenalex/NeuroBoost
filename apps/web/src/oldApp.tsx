import { useEffect, useState } from 'react';
import { WeekGrid } from './pages/oldWeekGrid';
import { Editor } from './components/Editor';
import { TaskSidebar } from './components/TaskSidebar';
import NudgeBadge from './components/NudgeBadge';
import DbBadge from './components/DbBadge';
import StatsBadge from './components/StatsBadge';
import type { NbEvent, Task, CreateEventBody } from './types';
import { getEvents, patchEventUTC, deleteEvent, createEventUTC, API_BASE } from './api';

type Range = { start: Date; end: Date } | null;

export default function App() {
  const [events, setEvents] = useState<NbEvent[]>([]);
  const [range, setRange] = useState<Range>(null);
  const [draft, setDraft] = useState<NbEvent | null>(null);
  const [taskSidebarOpen, setTaskSidebarOpen] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);

  function weekRangeUtc(): { start: string; end: string } {
    const nowUtcMs = Date.now();
    const nowMsk = new Date(nowUtcMs + 3 * 60 * 60 * 1000);
    const mondayIndex = (nowMsk.getUTCDay() + 6) % 7;
    const todayMskMidnight = new Date(nowMsk);
    todayMskMidnight.setUTCHours(0, 0, 0, 0);
    const mondayMskMidnightMs = todayMskMidnight.getTime() - mondayIndex * 86400000;
    const mondayUtc0 = mondayMskMidnightMs - 3 * 60 * 60 * 1000;
    const nextMondayUtc0 = mondayUtc0 + 7 * 86400000;
    return { start: new Date(mondayUtc0).toISOString(), end: new Date(nextMondayUtc0).toISOString() };
  }

  async function refresh() {
    try {
      const { start, end } = weekRangeUtc();
      const data = await getEvents(start, end);
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  }

  useEffect(() => { refresh(); }, []);

  function onCreate(slot: { startUtc: string; endUtc: string; allDay?: boolean }) {
    setRange({ start: new Date(slot.startUtc), end: new Date(slot.endUtc) });
    setDraft(null);
  }

  async function onMoveOrResize(patch: { id: string; startUtc?: string; endUtc?: string }) {
    try {
      await patchEventUTC(patch.id, { startsAt: patch.startUtc!, endsAt: patch.endUtc! });
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
        tags: [...task.tags, 'scheduled'],
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
            <div className="text-xs text-zinc-500">v0.2.1</div>
          </div>
          
          <div className="flex items-center gap-2">
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
                Writes disabled in v0.2.1
              </div>
            </div>
          </div>
        )}

        {/* Calendar */}
        <main className="flex-1 overflow-hidden">
          <WeekGrid
            events={events}
            onCreate={onCreate}
            onMoveOrResize={onMoveOrResize}
            onSelect={onSelect}
            onDelete={onDelete}
          />
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
    </div>
  );
}