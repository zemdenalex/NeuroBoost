import React, { useMemo, useRef, useState, useEffect } from 'react';
import type { NbEvent, Task } from '../types';

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_PX = 44;
const MIN_SLOT_MIN = 15;
const ALL_DAY_HEIGHT = 80;
const MOBILE_BREAKPOINT = 768;

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
  const mondayUtc0 = mondayUtcMidnightOfCurrentWeek();
  const startDay = Math.floor((mskMidnightUtcMs(startDate.getTime()) - mondayUtc0) / DAY_MS);
  const endDay = Math.floor((mskMidnightUtcMs(endDate.getTime()) - mondayUtc0) / DAY_MS);
  
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
  targetDayUtc0?: number;
  id: string; 
  offsetMin: number; 
  durMin: number; 
  daySpan: number;
  originalStart: number;
  originalEnd: number;
  allDay: boolean;
};

// ADD THESE NEW TYPES:
type DragResizeStart = { 
  kind: 'resize-start'; 
  dayUtc0: number; 
  id: string; 
  otherEndMin: number; 
  curMin: number 
};

type DragResizeEnd = { 
  kind: 'resize-end'; 
  dayUtc0: number; 
  id: string; 
  otherEndMin: number; 
  curMin: number 
};

type DragState = null | DragCreate | DragMove | DragResizeStart | DragResizeEnd;

export function WeekGrid({ 
  events, 
  currentWeekOffset = 0, 
  onCreate, 
  onMoveOrResize, 
  onSelect, 
  onDelete,
  onWeekChange,
  onTaskDrop
}: WeekGridProps) {
  
  const [isMobile, setIsMobile] = useState(false);
  const [visibleDays, setVisibleDays] = useState(7);
  const [touchStart, setTouchStart] = useState<{x: number, y: number, time: number} | null>(null);

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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
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

  const [drag, setDrag] = useState<DragState>(null);
  const dragMetaRef = useRef<{ colTop: number; scrollStart: number; allDayTop?: number } | null>(null);

  useEffect(() => {
    function onMove(ev: MouseEvent) {
      if (!drag || !scrollContainerRef.current || !dragMetaRef.current) return;
      
      const { colTop, scrollStart, allDayTop } = dragMetaRef.current;
      const scrollTop = scrollContainerRef.current.scrollTop;
      const isInAllDay = allDayTop !== undefined && ev.clientY >= allDayTop && ev.clientY <= allDayTop + ALL_DAY_HEIGHT;
      
      const yLocal = isInAllDay ? 0 : 
        (ev.clientY - colTop) + (scrollTop - scrollStart);
      const curMin = isInAllDay ? 0 : clampMins(snapMin(topToMins(yLocal)));

      ev.preventDefault();
      document.getSelection()?.removeAllRanges();

      const gridRect = scrollContainerRef.current.getBoundingClientRect();
      const dayWidth = gridRect.width / visibleDays;
      const dayIndex = Math.floor((ev.clientX - gridRect.left) / dayWidth);
      const targetDayUtc0 = days[Math.max(0, Math.min(days.length - 1, dayIndex))]?.dayUtc0;

      switch (drag.kind) {
        case 'create':
          setDrag({ 
            ...drag, 
            curMin, 
            allDay: isInAllDay,
            endDayUtc0: targetDayUtc0 || drag.startDayUtc0,
            crossDay: targetDayUtc0 !== drag.startDayUtc0
          });
          break;
          
        case 'move': {
          setDrag({ 
            ...drag, 
            offsetMin: drag.allDay ? 0 : clampMins(curMin - Math.round(drag.durMin / 2)),
            targetDayUtc0: targetDayUtc0 || drag.dayUtc0
          });
          break;
        }
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
            onCreate({
              startUtc: new Date(startDayUtc0).toISOString(),
              endUtc: new Date(endDayUtc0 + DAY_MS - 1).toISOString(),
              allDay: true,
              daySpan
            });
          } else {
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
        
        case 'resize-start': 
        case 'resize-end': {
          const startMin = Math.min(drag.curMin, drag.otherEndMin);
          const endMin = Math.max(drag.curMin, drag.otherEndMin);
          if (endMin > startMin) {
            onMoveOrResize({
              id: drag.id,
              startUtc: new Date(drag.dayUtc0 + startMin * 60000).toISOString(),
              endUtc: new Date(drag.dayUtc0 + endMin * 60000).toISOString()
            });
          }
          break;
        }

        case 'move': {
          const targetDay = drag.targetDayUtc0 || drag.dayUtc0;
          
          if (drag.allDay) {
            // Move all-day event to new day
            const dayDiff = Math.floor((targetDay - drag.dayUtc0) / DAY_MS);
            const originalEvent = events.find(e => e.id === drag.id);
            if (originalEvent) {
              const newStart = new Date(new Date(originalEvent.startUtc).getTime() + dayDiff * DAY_MS);
              const newEnd = new Date(new Date(originalEvent.endUtc).getTime() + dayDiff * DAY_MS);
              onMoveOrResize({
                id: drag.id,
                startUtc: newStart.toISOString(),
                endUtc: newEnd.toISOString()
              });
            }
          } else {
            // Move timed event
            const startMin = snapMin(drag.offsetMin);
            const endMin = startMin + drag.durMin;
            
            onMoveOrResize({
              id: drag.id,
              startUtc: new Date(targetDay + startMin * 60000).toISOString(),
              endUtc: new Date(targetDay + endMin * 60000).toISOString()
            });
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
  }, [drag, onCreate, onMoveOrResize, days, visibleDays, events]);

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
            "Drag: create • All-day: top section • Ctrl+Drag: move across days • Drag tasks from sidebar to schedule"
          )}
        </div>
      </div>

      <div
        className="flex-1 overflow-x-auto overflow-y-auto outline-none relative"
        ref={scrollContainerRef}
        tabIndex={0}
        role="application"
        onKeyDown={handleKeyDown}
        style={{ userSelect: 'none' }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          try {
            const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
            if (dragData.type === 'task' && onTaskDrop) {
              const rect = scrollContainerRef.current?.getBoundingClientRect();
              if (!rect) return;
              
              const dayWidth = rect.width / visibleDays;
              const dayIndex = Math.floor((e.clientX - rect.left) / dayWidth);
              const targetDay = days[Math.max(0, Math.min(days.length - 1, dayIndex))];
              
              if (targetDay) {
                const yInDay = e.clientY - rect.top - ALL_DAY_HEIGHT;
                const dropMin = Math.max(0, clampMins(snapMin(topToMins(yInDay + (scrollContainerRef.current?.scrollTop || 0)))));
                const dropTime = new Date(targetDay.dayUtc0 + dropMin * 60000);
                onTaskDrop(dragData.task, dropTime);
              }
            }
          } catch (error) {
            console.error('Failed to handle drop:', error);
          }
        }}
      >
        <div
          ref={containerRef}
          className={`grid gap-px relative ${visibleDays === 1 ? 'grid-cols-1' : visibleDays === 3 ? 'grid-cols-3' : 'grid-cols-7'}`}
          style={{ minWidth: isMobile ? '100%' : '800px' }}
        >
          {/* All-day section - Sticky at top */}
          <div 
            className="col-span-full sticky top-0 z-30 bg-zinc-900 border-b border-zinc-700"
            style={{ height: ALL_DAY_HEIGHT }}
          >
            <div className={`grid gap-px h-full ${visibleDays === 1 ? 'grid-cols-1' : visibleDays === 3 ? 'grid-cols-3' : 'grid-cols-7'}`}>
              {days.map(({ i, dayUtc0, dayMsk }) => {
                const dayAllDayEvents = allDayEvents.filter(e => 
                  e.span.startDay <= i && i <= e.span.endDay
                );
                
                return (
                  <div 
                    key={`allday-${i}`}
                    className="relative border-r border-zinc-700 last:border-r-0"
                    onMouseDown={(ev) => {
                      const rect = ev.currentTarget.getBoundingClientRect();
                      dragMetaRef.current = {
                        colTop: rect.top,
                        scrollStart: scrollContainerRef.current?.scrollTop || 0,
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
                    
                    {dayAllDayEvents.map(e => {
                      const selected = selectedId && e.id === selectedId;
                      const isStartDay = e.span.startDay === i;
                      const isEndDay = e.span.endDay === i;
                      
                      return (
                        <div
                          key={`allday-event-${e.id}-${i}`}
                          className={`absolute top-5 bottom-2 font-mono text-xs px-2 flex items-center cursor-pointer
                            ${selected ? 'ring-1 ring-blue-400 bg-blue-600/90 z-35' : 'bg-zinc-600/90 hover:bg-zinc-500/90 z-25'}
                            border border-zinc-500`}
                          style={{
                            left: isStartDay ? 4 : 0,
                            right: isEndDay ? 4 : 0,
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
                            ev.stopPropagation();
                            
                            setDrag({ 
                              kind: 'move', 
                              dayUtc0, 
                              id: e.id, 
                              offsetMin: 0, 
                              durMin: 0,
                              daySpan: e.span.spanDays,
                              originalStart: 0,
                              originalEnd: 0,
                              allDay: true
                            });
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
                );
              })}
            </div>
            
            {/* Multi-day create ghost */}
            {drag && drag.kind === 'create' && drag.allDay && drag.crossDay && (
              <div 
                className="absolute bg-emerald-400/40 border border-emerald-400/60 pointer-events-none animate-pulse"
                style={{
                  top: 20,
                  height: ALL_DAY_HEIGHT - 25,
                  left: `${(Math.min(drag.startDayUtc0, drag.endDayUtc0) - mondayUtc0) / DAY_MS / 7 * 100}%`,
                  right: `${100 - ((Math.max(drag.startDayUtc0, drag.endDayUtc0) - mondayUtc0) / DAY_MS + 1) / 7 * 100}%`,
                  borderRadius: '6px',
                  zIndex: 40
                }}
              />
            )}
          </div>

          {/* Day columns with timed events */}
          {days.map(({ i, dayUtc0, dayMsk }) => {
            const dayLabel = mskDayLabel(dayMsk, isMobile);
            const timedList = timedPerDay.get(dayUtc0) ?? [];

            return (
              <div key={i} className="border-r border-zinc-700 last:border-r-0 flex flex-col bg-black">
                {/* Day header */}
                <div className="bg-zinc-900 border-b border-zinc-700 sticky" style={{ top: ALL_DAY_HEIGHT, zIndex: 20 }}>
                  <div className="text-xs px-2 py-1 text-zinc-300 font-medium">
                    {dayLabel}
                  </div>
                </div>

                {/* Timed events area */}
                <div
                  className="relative select-none flex-1"
                  style={{ minHeight: HOUR_PX * (isMobile ? 16 : 24) }}
                  onMouseDown={(ev) => {
                    const rect = ev.currentTarget.getBoundingClientRect();
                    dragMetaRef.current = {
                      colTop: rect.top,
                      scrollStart: scrollContainerRef.current?.scrollTop ?? 0
                    };
                    const yLocal = (ev.clientY - rect.top) 
                      + ((scrollContainerRef.current?.scrollTop ?? 0) - dragMetaRef.current.scrollStart);
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
                  
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    setTouchStart({ 
                      x: touch.clientX, 
                      y: touch.clientY, 
                      time: Date.now() 
                    });
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault(); // Prevent scrolling
                  }}
                  onTouchEnd={(e) => {
                    if (!touchStart) return;
                    
                    const touch = e.changedTouches[0];
                    const duration = Date.now() - touchStart.time;
                    const distance = Math.sqrt(
                      Math.pow(touch.clientX - touchStart.x, 2) + 
                      Math.pow(touch.clientY - touchStart.y, 2)
                    );
                    
                    // Long press to create (500ms)
                    if (duration > 500 && distance < 20) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const yLocal = touchStart.y - rect.top + (scrollContainerRef.current?.scrollTop ?? 0);
                      const startMin = clampMins(snapMin(topToMins(yLocal)));
                      
                      setDrag({ 
                        kind: 'create', 
                        startDayUtc0: dayUtc0, 
                        endDayUtc0: dayUtc0,
                        startMin, 
                        curMin: startMin,
                        allDay: false
                      });
                    }
                    
                    setTouchStart(null);
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
                      className="absolute left-0 right-0 h-[2px] bg-red-500 z-20" 
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
                            ? 'border-blue-400 ring-1 ring-blue-400 bg-blue-600/90 text-white z-15'
                            : 'border-zinc-600 bg-zinc-800/95 hover:bg-zinc-700/95 text-zinc-100 z-10'
                          }`}
                        style={{ top, height, left: 2, right: 2 }}
                        onMouseDown={(ev) => {
                          if (!e.id) return;

                          const track = ev.currentTarget.parentElement;
                          const rect = track!.getBoundingClientRect();
                          const eventRect = ev.currentTarget.getBoundingClientRect();
                          const yInEvent = ev.clientY - eventRect.top;
                          const isTopHandle = yInEvent < 8;  
                          const isBottomHandle = yInEvent > eventRect.height - 8;

                          // Add preventDefault for resize handles
                          if (isTopHandle || isBottomHandle) {
                            ev.preventDefault();
                            ev.stopPropagation();
                          }
                          
                          dragMetaRef.current = {
                            colTop: rect.top,
                            scrollStart: scrollContainerRef.current?.scrollTop ?? 0
                          };

                          if (isTopHandle) {  // ADD THIS BLOCK
                            setDrag({ 
                              kind: 'resize-start', 
                              dayUtc0, 
                              id: e.id, 
                              otherEndMin: endMin, 
                              curMin: startMin 
                            });
                          } else if (isBottomHandle) {  // ADD THIS BLOCK
                            setDrag({ 
                              kind: 'resize-end', 
                              dayUtc0, 
                              id: e.id, 
                              otherEndMin: startMin, 
                              curMin: endMin 
                            });
                          } else {
                            // existing move logic
                            setDrag({ 
                              kind: 'move', 
                              dayUtc0, 
                              targetDayUtc0: dayUtc0,
                              id: e.id, 
                              offsetMin: startMin, 
                              durMin: endMin - startMin,
                              daySpan: 1,
                              originalStart: startMin,
                              originalEnd: endMin,
                              allDay: false
                            });
                          }
                          ev.stopPropagation();
                        }}
                        onDoubleClick={() => onSelect(e)}
                        title={`${e.title} • ${isMobile ? 'Tap to edit' : 'Ctrl+Drag to move across days'}`}
                      >
                        <div className="absolute left-0 right-0 h-2 top-0 cursor-ns-resize bg-transparent hover:bg-blue-400/20" />
                        <div className="absolute left-0 right-0 h-2 bottom-0 cursor-ns-resize bg-transparent hover:bg-blue-400/20" />
  
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

                  {/* Create ghost (timed) */}
                  {drag && drag.kind === 'create' && !drag.allDay && 
                   drag.startDayUtc0 === dayUtc0 && drag.endDayUtc0 === dayUtc0 && (() => {
                    const a = Math.min(drag.startMin, drag.curMin);
                    const b = Math.max(drag.startMin, drag.curMin);
                    const top = minsToTop(a);
                    const height = Math.max(minsToTop(b - a), minsToTop(MIN_SLOT_MIN));
                    return (
                      <div 
                        className="absolute bg-emerald-400/40 border border-emerald-400/60 rounded pointer-events-none z-30 animate-pulse"
                        style={{ top, height, left: 2, right: 2 }} 
                      />
                    );
                  })()}

                  {/* Move ghost */}
                  {drag && drag.kind === 'move' && !drag.allDay && 
                   (drag.targetDayUtc0 === dayUtc0 || (!drag.targetDayUtc0 && drag.dayUtc0 === dayUtc0)) && (
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function fmtTime(utcISO: string): string {
  const d = new Date(new Date(utcISO).getTime() + MSK_OFFSET_MS);
  return d.toISOString().slice(11, 16);
}