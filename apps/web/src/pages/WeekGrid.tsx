// apps/web/src/pages/WeekGrid.tsx - Fixed version addressing all UX issues
import React, { useMemo, useRef, useState, useEffect } from 'react';
import type { NbEvent, Task } from '../types';

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_PX = 44;
const MIN_SLOT_MIN = 15;
const ALL_DAY_HEIGHT = 80;
const MOBILE_BREAKPOINT = 768;

const DAY_FOCUS_OPTIONS = [
  { value: 'work', label: 'Work', color: '#3B82F6' },
  { value: 'study', label: 'Study', color: '#8B5CF6' },
  { value: 'family', label: 'Family', color: '#10B981' },
  { value: 'rest', label: 'Rest', color: '#6B7280' },
  { value: 'friends', label: 'Friends', color: '#F59E0B' },
  { value: 'health', label: 'Health', color: '#EF4444' }
];

type EvLite = { id?: string; startUtc: string; endUtc: string; allDay?: boolean };
const evKey = (e: EvLite) => `${e.id ?? ''}${e.startUtc}`;

function mondayUtcMidnightOfCurrentWeek(): number {
  const nowUtcMs = Date.now();
  const nowMsk = new Date(nowUtcMs + MSK_OFFSET_MS);
  const mondayIndex = (nowMsk.getUTCDay() + 6) % 7;
  const todayMskMidnight = new Date(nowMsk);
  todayMskMidnight.setUTCHours(0, 0, 0, 0);
  const mondayMskMidnightMs = todayMskMidnight.getTime() - mondayIndex * DAY_MS;
  return mondayMskMidnightMs - MSK_OFFSET_MS;
}

function mskMidnightUtcMs(utcMs: number): number {
  const msk = new Date(utcMs + MSK_OFFSET_MS);
  msk.setUTCHours(0, 0, 0, 0);
  return msk.getTime() - MSK_OFFSET_MS;
}

function minutesSinceMskMidnight(utcISO: string): number {
  const utcMs = new Date(utcISO).getTime();
  const baseUtc = mskMidnightUtcMs(utcMs);
  return Math.max(0, Math.min(1440, Math.round((utcMs - baseUtc) / 60000)));
}

function getDaySpan(event: NbEvent): { startDay: number; endDay: number; spanDays: number } {
  const startDate = new Date(event.startUtc);
  const endDate = new Date(event.endUtc);
  const startDay = Math.floor((mskMidnightUtcMs(startDate.getTime()) - mondayUtcMidnightOfCurrentWeek()) / DAY_MS);
  const endDay = Math.floor((mskMidnightUtcMs(endDate.getTime()) - mondayUtcMidnightOfCurrentWeek()) / DAY_MS);
  
  return {
    startDay: Math.max(0, Math.min(6, startDay)),
    endDay: Math.max(0, Math.min(6, endDay)),
    spanDays: Math.max(1, endDay - startDay + 1)
  };
}

const snapMin = (m: number) => Math.round(m / MIN_SLOT_MIN) * MIN_SLOT_MIN;
const minsToTop = (m: number) => (m / 60) * HOUR_PX;
const topToMins = (y: number) => (y / HOUR_PX) * 60;
const clampMins = (m: number) => Math.max(0, Math.min(1440, m));

const mskDayLabel = (d: Date, short: boolean = false) => {
  if (short) {
    return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('ru-RU', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

export type WeekGridProps = {
  events: NbEvent[];
  currentWeekOffset?: number;
  onCreate: (slot: { startUtc: string; endUtc: string; allDay?: boolean; daySpan?: number }) => void;
  onMoveOrResize: (patch: { id: string; startUtc?: string; endUtc?: string }) => void;
  onSelect: (e: NbEvent) => void;
  onDelete: (id: string) => Promise<void>;
  onWeekChange?: (offset: number) => void;
  onDayFocusChange?: (day: string, focus: string) => void;
  onTaskDrop?: (task: Task, startTime: Date) => void;
};

type DragCreate = { 
  kind: 'create'; 
  startDayUtc0: number; 
  endDayUtc0: number; 
  startMin: number; 
  curMin: number; 
  allDay: boolean;
  crossDay?: boolean;
};
type DragMove = { 
  kind: 'move'; 
  dayUtc0: number; 
  id: string; 
  offsetMin: number; 
  durMin: number; 
  daySpan: number;
  originalStart: number;
  originalEnd: number;
};
type DragTaskSchedule = {
  kind: 'task-schedule';
  task: Task;
  targetDayUtc0: number;
  offsetMin: number;
};
type DragState = null | DragCreate | DragMove | DragTaskSchedule;

export function WeekGrid({ 
  events, 
  currentWeekOffset = 0, 
  onCreate, 
  onMoveOrResize, 
  onSelect, 
  onDelete,
  onWeekChange,
  onDayFocusChange,
  onTaskDrop
}: WeekGridProps) {
  
  // Mobile responsiveness
  const [isMobile, setIsMobile] = useState(false);
  const [visibleDays, setVisibleDays] = useState(7);
  const [dayFocus, setDayFocus] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      
      if (window.innerWidth < 480) {
        setVisibleDays(1);
      } else if (window.innerWidth < 768) {
        setVisibleDays(3);
      } else {
        setVisibleDays(7);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const baseWeekUtc0 = useMemo(() => mondayUtcMidnightOfCurrentWeek(), []);
  const mondayUtc0 = baseWeekUtc0 + (currentWeekOffset * 7 * DAY_MS);
  
  const days = useMemo(() => {
    const allDays = Array.from({ length: 7 }, (_, i) => {
      const dayUtc0 = mondayUtc0 + i * DAY_MS;
      const dayMsk = new Date(dayUtc0 + MSK_OFFSET_MS);
      const key = dayMsk.toISOString().slice(0, 10);
      return { i, dayUtc0, dayMsk, key };
    });
    
    if (visibleDays < 7) {
      const todayIndex = Math.floor((Date.now() - mondayUtc0) / DAY_MS);
      const centerIndex = Math.max(0, Math.min(6, todayIndex));
      const start = Math.max(0, centerIndex - Math.floor(visibleDays / 2));
      const end = Math.min(7, start + visibleDays);
      return allDays.slice(start, end);
    }
    
    return allDays;
  }, [mondayUtc0, visibleDays]);

  // Separate all-day and timed events
  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay: Array<NbEvent & { span: { startDay: number; endDay: number; spanDays: number } }> = [];
    const timed: Array<NbEvent & { top: number; height: number; dayUtc0: number }> = [];
    
    for (const e of events) {
      if (e.allDay) {
        const span = getDaySpan(e);
        allDay.push({ ...e, span });
      } else {
        const startMin = minutesSinceMskMidnight(e.startUtc);
        const endMin = Math.max(startMin + MIN_SLOT_MIN, minutesSinceMskMidnight(e.endUtc));
        const top = minsToTop(startMin);
        const height = Math.max(minsToTop(endMin - startMin), minsToTop(MIN_SLOT_MIN));
        const bucketUtc0 = mskMidnightUtcMs(new Date(e.startUtc).getTime());
        timed.push({ ...e, top, height, dayUtc0: bucketUtc0 });
      }
    }
    
    return { allDayEvents: allDay, timedEvents: timed };
  }, [events]);

  // Index timed events by day
  const timedPerDay = useMemo(() => {
    const map = new Map<number, Array<NbEvent & { top: number; height: number; dayUtc0: number }>>();
    for (const d of days) map.set(d.dayUtc0, []);
    for (const e of timedEvents) {
      if (map.has(e.dayUtc0)) {
        map.get(e.dayUtc0)!.push(e);
      }
    }
    return map;
  }, [timedEvents, days]);

  // Selection + keyboard
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => { containerRef.current?.focus(); }, []);

  function handleKeyDown(ev: React.KeyboardEvent<HTMLDivElement>) {
    if (!selectedId) return;
    const evt = events.find(x => x.id === selectedId);
    if (!evt) return;

    if (ev.key === 'Enter') { ev.preventDefault(); onSelect(evt); return; }
    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      ev.preventDefault();
      if (confirm(`Delete "${evt.title}"?`)) onDelete(selectedId);
      return;
    }
    if (ev.key === 'ArrowLeft' && onWeekChange) {
      ev.preventDefault();
      onWeekChange(currentWeekOffset - 1);
      return;
    }
    if (ev.key === 'ArrowRight' && onWeekChange) {
      ev.preventDefault();
      onWeekChange(currentWeekOffset + 1);
      return;
    }
    
    // Nudge selected event
    const plus = ev.key === '+' || ev.key === '=';
    const minus = ev.key === '-' || ev.key === '_';
    if (!plus && !minus) return;

    const delta = (plus ? +15 : -15) * 60000;
    ev.preventDefault();
    onMoveOrResize({
      id: selectedId,
      startUtc: new Date(new Date(evt.startUtc).getTime() + delta).toISOString(),
      endUtc: new Date(new Date(evt.endUtc).getTime() + delta).toISOString(),
    });
  }

  // Drag handling
  const [drag, setDrag] = useState<DragState>(null);
  const dragMetaRef = useRef<{ colTop: number; scrollStart: number; allDayTop?: number } | null>(null);

  useEffect(() => {
    function onMove(ev: MouseEvent) {
      if (!drag || !containerRef.current || !dragMetaRef.current) return;
      
      const { colTop, scrollStart, allDayTop } = dragMetaRef.current;
      const isInAllDay = allDayTop !== undefined && ev.clientY >= allDayTop && ev.clientY <= allDayTop + ALL_DAY_HEIGHT;
      
      const yLocal = isInAllDay ? 0 : 
        (ev.clientY - colTop - ALL_DAY_HEIGHT) + (containerRef.current.scrollTop - scrollStart);
      const curMin = isInAllDay ? 0 : clampMins(snapMin(topToMins(yLocal)));

      // CRITICAL: Prevent text selection during drag
      ev.preventDefault();
      document.getSelection()?.removeAllRanges();

      switch (drag.kind) {
        case 'create':
          // Check for cross-day drag
          const gridRect = containerRef.current.getBoundingClientRect();
          const dayWidth = gridRect.width / visibleDays;
          const dayIndex = Math.floor((ev.clientX - gridRect.left) / dayWidth);
          const targetDayUtc0 = days[Math.max(0, Math.min(days.length - 1, dayIndex))]?.dayUtc0 || drag.startDayUtc0;
          
          setDrag({ 
            ...drag, 
            curMin, 
            allDay: isInAllDay,
            endDayUtc0: targetDayUtc0,
            crossDay: targetDayUtc0 !== drag.startDayUtc0
          });
          break;
          
        case 'move': {
          const centerSnap = Math.round(drag.durMin / 2 / MIN_SLOT_MIN) * MIN_SLOT_MIN;
          setDrag({ ...drag, offsetMin: clampMins(curMin - centerSnap) });
          break;
        }
        
        case 'task-schedule':
          const rect = containerRef.current.getBoundingClientRect();
          const colWidth = rect.width / visibleDays;
          const newDayIndex = Math.floor((ev.clientX - rect.left) / colWidth);
          if (newDayIndex >= 0 && newDayIndex < days.length) {
            const targetDayUtc0 = days[newDayIndex].dayUtc0;
            setDrag({ ...drag, targetDayUtc0, offsetMin: curMin });
          }
          break;
      }
    }

    function onUp() {
      if (!drag) return;
      
      switch (drag.kind) {
        case 'create': {
          const startDayUtc0 = Math.min(drag.startDayUtc0, drag.endDayUtc0);
          const endDayUtc0 = Math.max(drag.startDayUtc0, drag.endDayUtc0);
          const daySpan = Math.floor((endDayUtc0 - startDayUtc0) / DAY_MS) + 1;
          
          if (drag.allDay || drag.crossDay) {
            // All-day or cross-day event
            onCreate({
              startUtc: new Date(startDayUtc0).toISOString(),
              endUtc: new Date(endDayUtc0 + DAY_MS).toISOString(),
              allDay: true,
              daySpan
            });
          } else {
            // Single-day timed event
            const a = Math.min(drag.startMin, drag.curMin);
            const b = Math.max(drag.startMin, drag.curMin);
            if (b > a) {
              onCreate({
                startUtc: new Date(startDayUtc0 + a * 60000).toISOString(),
                endUtc: new Date(startDayUtc0 + b * 60000).toISOString(),
                allDay: false,
                daySpan: 1
              });
            }
          }
          break;
        }
        
        case 'move': {
          const startMin = snapMin(drag.offsetMin);
          const endMin = startMin + drag.durMin;
          onMoveOrResize({
            id: drag.id,
            startUtc: new Date(drag.dayUtc0 + startMin * 60000).toISOString(),
            endUtc: new Date(drag.dayUtc0 + endMin * 60000).toISOString()
          });
          break;
        }
        
        case 'task-schedule': {
          if (onTaskDrop) {
            const scheduledTime = new Date(drag.targetDayUtc0 + drag.offsetMin * 60000);
            onTaskDrop(drag.task, scheduledTime);
          }
          break;
        }
      }
      setDrag(null);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [drag, onCreate, onMoveOrResize, days, visibleDays, onTaskDrop]);

  // Current time
  const [nowInfo, setNowInfo] = useState(() => ({
    dayUtc0: mskMidnightUtcMs(Date.now()),
    min: minutesSinceMskMidnight(new Date().toISOString()),
  }));
  
  useEffect(() => {
    const id = setInterval(() => {
      setNowInfo({
        dayUtc0: mskMidnightUtcMs(Date.now()),
        min: minutesSinceMskMidnight(new Date().toISOString()),
      });
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const weekLabel = useMemo(() => {
    const startDate = new Date(mondayUtc0 + MSK_OFFSET_MS);
    const endDate = new Date(mondayUtc0 + 6 * DAY_MS + MSK_OFFSET_MS);
    
    if (visibleDays === 1) {
      return startDate.toLocaleDateString('ru-RU', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (visibleDays === 3) {
      return `${startDate.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}`;
    }
    
    return `${startDate.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [mondayUtc0, visibleDays]);

  return (
    <div className="h-full w-full flex flex-col font-mono bg-black text-zinc-100">
      {/* Navigation Header */}
      <div className="px-2 py-2 border-b border-zinc-700 bg-zinc-900">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {onWeekChange && (
              <>
                <button
                  onClick={() => onWeekChange(currentWeekOffset - 1)}
                  className="px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700"
                  title="Previous period"
                >
                  ←
                </button>
                <button
                  onClick={() => onWeekChange(currentWeekOffset + 1)}
                  className="px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700"
                  title="Next period"
                >
                  →
                </button>
              </>
            )}
            <h2 className="font-semibold text-sm md:text-lg">{weekLabel}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            {currentWeekOffset !== 0 && onWeekChange && (
              <button
                onClick={() => onWeekChange(0)}
                className="px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-white"
              >
                Today
              </button>
            )}
            {!isMobile && (
              <button
                onClick={() => {
                  const start = new Date(); 
                  const end = new Date(start.getTime() + 60 * 60 * 1000);
                  onCreate({ 
                    startUtc: start.toISOString(), 
                    endUtc: end.toISOString(), 
                    allDay: false 
                  });
                }}
                className="px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700"
              >
                + Quick
              </button>
            )}
          </div>
        </div>
        
        <div className="text-xs text-zinc-400">
          {isMobile ? (
            "Tap: select • Long-press: create • Drag: move"
          ) : (
            "Drag: create • All-day: top section • Cross-day: drag across columns • Drag tasks from sidebar to schedule"
          )}
        </div>
      </div>

      <div
        className="flex-1 overflow-x-auto overflow-y-auto outline-none"
        ref={containerRef}
        tabIndex={0}
        role="application"
        onKeyDown={handleKeyDown}
        style={{ userSelect: 'none' }} // Prevent text selection globally
        onDragOver={(e) => {
          e.preventDefault(); // Allow drop
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          try {
            const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
            if (dragData.type === 'task' && onTaskDrop) {
              // Get drop position
              const rect = containerRef.current?.getBoundingClientRect();
              if (!rect) return;
              
              const dayWidth = rect.width / visibleDays;
              const dayIndex = Math.floor((e.clientX - rect.left) / dayWidth);
              const targetDay = days[Math.max(0, Math.min(days.length - 1, dayIndex))];
              
              if (targetDay) {
                const yInDay = e.clientY - rect.top - ALL_DAY_HEIGHT;
                const dropMin = Math.max(0, clampMins(snapMin(topToMins(yInDay))));
                const dropTime = new Date(targetDay.dayUtc0 + dropMin * 60000);
                onTaskDrop(dragData.task, dropTime);
              }
            }
          } catch (error) {
            console.error('Failed to handle drop:', error);
          }
        }}
      >
        {/* Mobile: Show tasks at top */}
        {isMobile && (
          <div className="border-b border-zinc-700 bg-zinc-900 p-2 min-h-16">
            <div className="text-xs text-zinc-400 mb-1">Urgent Tasks</div>
            <div className="text-xs text-zinc-500">Drag tasks to schedule</div>
          </div>
        )}
        
        <div
          className={`grid gap-px relative ${visibleDays === 1 ? 'grid-cols-1' : visibleDays === 3 ? 'grid-cols-3' : 'grid-cols-7'}`}
          style={{ minWidth: isMobile ? '100%' : '800px' }}
        >
          {days.map(({ i, dayUtc0, dayMsk }) => {
            const dayLabel = mskDayLabel(dayMsk, isMobile);
            const timedList = timedPerDay.get(dayUtc0) ?? [];
            const dayAllDayEvents = allDayEvents.filter(e => 
              e.span.startDay <= i && i <= e.span.endDay
            );
            const dayKey = dayMsk.toISOString().slice(0, 10);
            const currentFocus = dayFocus[dayKey];

            return (
              <div key={i} className="border-r border-zinc-700 last:border-r-0 flex flex-col bg-black">
                {/* Day header */}
                <div className="bg-zinc-900 border-b border-zinc-700">
                  <div className="text-xs px-2 py-1 text-zinc-300 font-medium">
                    {dayLabel}
                  </div>
                  
                  {!isMobile && onDayFocusChange && (
                    <div className="px-2 pb-1">
                      <select
                        value={currentFocus || ''}
                        onChange={(e) => onDayFocusChange(dayKey, e.target.value)}
                        className="text-xs bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-zinc-300 font-mono w-full"
                      >
                        <option value="">Focus...</option>
                        {DAY_FOCUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* All-day lane - FIXED: solid background, proper positioning */}
                <div 
                  className="relative border-b border-zinc-700 bg-zinc-900 sticky top-0 z-10"
                  style={{ height: ALL_DAY_HEIGHT }}
                  onMouseDown={(ev) => {
                    const rect = ev.currentTarget.getBoundingClientRect();
                    dragMetaRef.current = {
                      colTop: rect.top,
                      scrollStart: 0,
                      allDayTop: rect.top
                    };
                    setDrag({ 
                      kind: 'create', 
                      startDayUtc0: dayUtc0, 
                      endDayUtc0: dayUtc0,
                      startMin: 0, 
                      curMin: 0,
                      allDay: true
                    });
                  }}
                >
                  <div className="absolute inset-0 flex items-start p-1">
                    <span className="text-xs text-zinc-500 font-mono">all-day</span>
                  </div>
                  
                  {/* All-day events */}
                  {dayAllDayEvents.map(e => {
                    const selected = selectedId && e.id === selectedId;
                    const isStartDay = e.span.startDay === i;
                    const isEndDay = e.span.endDay === i;
                    
                    return (
                      <div
                        key={`allday-${e.id}-${i}`}
                        className={`absolute top-5 bottom-1 font-mono text-xs px-2 flex items-center cursor-pointer
                          ${selected ? 'ring-1 ring-blue-400 bg-blue-600/90' : 'bg-zinc-600/90 hover:bg-zinc-500/90'}
                          border border-zinc-500`}
                        style={{
                          left: isStartDay ? 4 : 0,
                          right: isEndDay ? 4 : 0,
                          zIndex: selected ? 25 : 20,
                          borderRadius: isStartDay && isEndDay ? '6px' :
                                      isStartDay ? '6px 0 0 6px' :
                                      isEndDay ? '0 6px 6px 0' : '0'
                        }}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (e.id) setSelectedId(e.id);
                        }}
                        onDoubleClick={() => onSelect(e)}
                        onMouseDown={(ev) => {
                          if (!e.id) return;
                          const startMin = minutesSinceMskMidnight(e.startUtc);
                          const endMin = Math.max(startMin + MIN_SLOT_MIN, minutesSinceMskMidnight(e.endUtc));
                          const durMin = endMin - startMin;
                          
                          setDrag({ 
                            kind: 'move', 
                            dayUtc0, 
                            id: e.id, 
                            offsetMin: startMin, 
                            durMin,
                            daySpan: e.span.spanDays,
                            originalStart: startMin,
                            originalEnd: endMin
                          });
                          ev.stopPropagation();
                        }}
                        title={`${e.title} • All-day event`}
                      >
                        {isStartDay && (
                          <span className="truncate text-white font-medium">
                            {e.title || '(untitled)'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Timed events area */}
                <div
                  className="relative select-none flex-1"
                  style={{ minHeight: HOUR_PX * (isMobile ? 16 : 24) }}
                  onMouseDown={(ev) => {
                    const rect = ev.currentTarget.getBoundingClientRect();
                    dragMetaRef.current = {
                      colTop: rect.top - ALL_DAY_HEIGHT,
                      scrollStart: containerRef.current?.scrollTop ?? 0
                    };
                    const yLocal = (ev.clientY - rect.top) 
                      + ((containerRef.current?.scrollTop ?? 0) - dragMetaRef.current.scrollStart);
                    const startMin = clampMins(snapMin(topToMins(yLocal)));
                    setDrag({ 
                      kind: 'create', 
                      startDayUtc0: dayUtc0, 
                      endDayUtc0: dayUtc0,
                      startMin, 
                      curMin: startMin,
                      allDay: false
                    });
                  }}
                >
                  {/* Hour grid */}
                  {Array.from({ length: isMobile ? 16 : 24 }, (_, h) => (
                    <div
                      key={h}
                      className={`absolute left-0 right-0 border-t ${
                        h % (isMobile ? 2 : 3) === 0 ? 'border-zinc-700' : 'border-zinc-800/50'
                      }`}
                      style={{ top: h * HOUR_PX }}
                    >
                      {(h % (isMobile ? 4 : 3) === 0) && (
                        <div className="absolute left-1 -top-2 px-1 text-[10px] text-zinc-500 bg-black font-mono">
                          {String(h).padStart(2, '0')}:00
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Current time line */}
                  {dayUtc0 === nowInfo.dayUtc0 && nowInfo.min >= 0 && nowInfo.min <= 1440 && (
                    <div 
                      className="absolute left-0 right-0 h-[2px] bg-red-500 z-30" 
                      style={{ top: minsToTop(nowInfo.min) }}
                    >
                      <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-red-500" />
                      <div className="absolute left-2 -top-3 text-[10px] text-red-500 font-mono bg-black px-1">
                        now
                      </div>
                    </div>
                  )}

                  {/* Timed events */}
                  {timedList.map(e => {
                    const startMin = minutesSinceMskMidnight(e.startUtc);
                    const endMin = Math.max(startMin + MIN_SLOT_MIN, minutesSinceMskMidnight(e.endUtc));
                    const top = minsToTop(startMin);
                    const height = Math.max(minsToTop(endMin - startMin), minsToTop(MIN_SLOT_MIN));
                    const selected = selectedId && e.id === selectedId;
                    
                    return (
                      <div
                        key={e.id}
                        className={`absolute rounded border text-xs cursor-move font-mono
                          ${selected
                            ? 'border-blue-400 ring-1 ring-blue-400 bg-blue-600/90 text-white z-20'
                            : 'border-zinc-600 bg-zinc-800/95 hover:bg-zinc-700/95 text-zinc-100 z-10'
                          }`}
                        style={{ top, height, left: 2, right: 2 }}
                        onClick={(ev) => { 
                          ev.stopPropagation(); 
                          if (e.id) setSelectedId(e.id); 
                        }}
                        onMouseDown={(ev) => {
                          if (!e.id) return;

                          const track = ev.currentTarget.parentElement;
                          const rect = track!.getBoundingClientRect();
                          dragMetaRef.current = {
                            colTop: rect.top - ALL_DAY_HEIGHT,
                            scrollStart: containerRef.current?.scrollTop ?? 0
                          };

                          setDrag({ 
                            kind: 'move', 
                            dayUtc0, 
                            id: e.id, 
                            offsetMin: startMin, 
                            durMin: endMin - startMin,
                            daySpan: 1,
                            originalStart: startMin,
                            originalEnd: endMin
                          });
                          ev.stopPropagation();
                        }}
                        onDoubleClick={() => onSelect(e)}
                        title={`${e.title} • ${isMobile ? 'Tap to edit' : 'Drag to move'}`}
                      >
                        <div className="px-1 py-0.5 min-h-0 leading-tight">
                          <div className="font-semibold truncate text-[11px]">
                            {e.title || '(untitled)'}
                          </div>
                          {height > 25 && (
                            <div className="text-zinc-300 text-[10px]">
                              {fmtTime(e.startUtc)}–{fmtTime(e.endUtc)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Timed create ghost */}
                  {drag && drag.kind === 'create' && !drag.allDay && 
                   drag.startDayUtc0 === dayUtc0 && (() => {
                    const a = Math.min(drag.startMin, drag.curMin);
                    const b = Math.max(drag.startMin, drag.curMin);
                    const top = minsToTop(a);
                    const height = Math.max(minsToTop(b - a), minsToTop(MIN_SLOT_MIN));
                    return (
                      <div 
                        className="absolute bg-emerald-400/30 border border-emerald-400/50 rounded pointer-events-none z-30"
                        style={{ top, height, left: 2, right: 2 }} 
                      />
                    );
                  })()}

                  {/* Move ghost - FIXED: Now shows for both timed and all-day moves */}
                  {drag && drag.kind === 'move' && drag.dayUtc0 === dayUtc0 && (
                    <div 
                      className="absolute bg-blue-400/40 border border-blue-400/60 rounded pointer-events-none z-30"
                      style={{ 
                        top: minsToTop(clampMins(snapMin(drag.offsetMin))), 
                        height: minsToTop(drag.durMin), 
                        left: 2, 
                        right: 2 
                      }} 
                    />
                  )}

                  {/* Task schedule ghost */}
                  {drag && drag.kind === 'task-schedule' && drag.targetDayUtc0 === dayUtc0 && (
                    <div 
                      className="absolute bg-green-400/30 border border-green-400/50 rounded pointer-events-none z-30"
                      style={{ 
                        top: minsToTop(clampMins(snapMin(drag.offsetMin))), 
                        height: minsToTop(drag.task.estimatedMinutes || 60), 
                        left: 2, 
                        right: 2 
                      }} 
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* FIXED: Continuous multi-day all-day create ghost */}
          {drag && drag.kind === 'create' && drag.allDay && drag.crossDay && (
            <div 
              className="absolute bg-emerald-400/30 border border-emerald-400/50 pointer-events-none z-40"
              style={{
                top: 25, // Position in all-day section
                height: ALL_DAY_HEIGHT - 30,
                left: `${(Math.min(drag.startDayUtc0, drag.endDayUtc0) - mondayUtc0) / DAY_MS / visibleDays * 100}%`,
                right: `${100 - ((Math.max(drag.startDayUtc0, drag.endDayUtc0) - mondayUtc0) / DAY_MS + 1) / visibleDays * 100}%`,
                borderRadius: '6px'
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function fmtTime(utcISO: string): string {
  const d = new Date(new Date(utcISO).getTime() + MSK_OFFSET_MS);
  return d.toISOString().slice(11, 16);
}