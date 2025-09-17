import React, { useMemo, useRef, useState, useEffect } from 'react';
import type { NbEvent, Task } from '../types';
import { DeadlineTasks } from '../components/DeadlineTasks';

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_PX = 44;
const MIN_SLOT_MIN = 15;
const ALL_DAY_HEIGHT = 80;
const DAY_HEADER_HEIGHT = 32;
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
const clampMins = (m: number) => Math.max(0, Math.min(1439, m));

// Helper function to format minutes since midnight as HH:MM
const formatMinutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

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
  tasks?: Task[];  
  currentWeekOffset?: number;
  onCreate: (slot: { startUtc: string; endUtc: string; allDay?: boolean; daySpan?: number }) => void;
  onMoveOrResize: (patch: { id: string; startUtc?: string; endUtc?: string }) => void;
  onSelect: (e: NbEvent) => void;
  onDelete: (id: string) => Promise<void>;
  onWeekChange?: (offset: number) => void;
  onTaskDrop?: (task: Task, startTime: Date) => void;
  showDeadlineTasks?: boolean;
};

type DragCreate = { 
  kind: 'create'; 
  startDayUtc0: number; 
  endDayUtc0: number; 
  startMin: number; 
  curMin: number; 
  allDay: boolean;
  crossDay?: boolean;
  isMultiDayTimed?: boolean; 
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
  tasks = [], 
  currentWeekOffset = 0, 
  onCreate, 
  onMoveOrResize, 
  onSelect, 
  onDelete,
  onWeekChange,
  onTaskDrop,
  showDeadlineTasks = true
}: WeekGridProps) {
  
  const [isMobile, setIsMobile] = useState(false);
  const [visibleDays, setVisibleDays] = useState(7);
  const [touchStart, setTouchStart] = useState<{x: number, y: number, time: number} | null>(null);
  
  // Filter tasks to only show ones with deadlines
  const deadlineTasks = useMemo(() => {
    return tasks.filter(task => 
      task.dueDate && 
      task.status !== 'DONE' && 
      task.status !== 'CANCELLED'
    );
  }, [tasks]);

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
    const timed: Array<NbEvent & { top: number; height: number; dayUtc0: number; span?: { startDay: number; endDay: number; spanDays: number; isFirstSegment?: boolean; isLastSegment?: boolean } }> = [];
    
    for (const e of events) {
      if (e.allDay) {
        const span = getDaySpan(e);
        allDay.push({ ...e, span });
      } else {
        const span = getDaySpan(e);
        
        // For multi-day timed events, create timed event segments for each day
        if (span.spanDays > 1) {
          // Create segments for each day the event spans
          for (let dayOffset = 0; dayOffset < span.spanDays; dayOffset++) {
            const currentDayIndex = span.startDay + dayOffset;
            
            // Fix: Use absolute day calculation from monday base
            const segmentDayUtc0 = mondayUtc0 + currentDayIndex * DAY_MS;
            
            let dayStartMin: number;
            let dayEndMin: number;
            
            if (dayOffset === 0) {
              // First day: start at actual start time, end at midnight
              dayStartMin = minutesSinceMskMidnight(e.startUtc);
              dayEndMin = 1440; // End of day
            } else if (dayOffset === span.spanDays - 1) {
              // Last day: start at midnight, end at actual end time
              dayStartMin = 0; // Start of day
              dayEndMin = minutesSinceMskMidnight(e.endUtc);
            } else {
              // Middle days: full day
              dayStartMin = 0;
              dayEndMin = 1440;
            }
            
            const top = minsToTop(dayStartMin);
            const height = Math.max(minsToTop(dayEndMin - dayStartMin), minsToTop(MIN_SLOT_MIN));
            
            timed.push({ 
              ...e, 
              top, 
              height, 
              dayUtc0: segmentDayUtc0,
              span: { 
                ...span, 
                isFirstSegment: dayOffset === 0, 
                isLastSegment: dayOffset === span.spanDays - 1 
              }
            });
          }
        } else {
          // Single day timed event
          const startMin = minutesSinceMskMidnight(e.startUtc);
          const endMin = Math.max(startMin + MIN_SLOT_MIN, minutesSinceMskMidnight(e.endUtc));
          const top = minsToTop(startMin);
          const height = Math.max(minsToTop(endMin - startMin), minsToTop(MIN_SLOT_MIN));
          const bucketUtc0 = mskMidnightUtcMs(new Date(e.startUtc).getTime());
          timed.push({ ...e, top, height, dayUtc0: bucketUtc0 });
        }
      }
    }
    
    return { allDayEvents: allDay, timedEvents: timed };
  }, [events, mondayUtc0]);

  const timedPerDay = useMemo(() => {
    const map = new Map<number, Array<NbEvent & { top: number; height: number; dayUtc0: number; span?: { startDay: number; endDay: number; spanDays: number; isFirstSegment?: boolean; isLastSegment?: boolean } }>>();
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
  
  // Auto-scroll state and refs
  const autoScrollRef = useRef<number | null>(null);
  const [autoScrolling, setAutoScrolling] = useState(false);
  
  useEffect(() => { containerRef.current?.focus(); }, []);

  // Auto-scroll functions with continuous movement
  const startAutoScroll = (direction: 'up' | 'down') => {
    if (autoScrollRef.current || !scrollContainerRef.current) return;
    
    const scroll = () => {
      if (!scrollContainerRef.current) return;
      
      const delta = direction === 'up' ? -4 : 4; // 240px/s at 60fps = 4px per frame
      const currentScroll = scrollContainerRef.current.scrollTop;
      const maxScroll = scrollContainerRef.current.scrollHeight - scrollContainerRef.current.clientHeight;
      
      if ((direction === 'up' && currentScroll > 0) || (direction === 'down' && currentScroll < maxScroll)) {
        scrollContainerRef.current.scrollTop += delta;
        autoScrollRef.current = requestAnimationFrame(scroll);
      } else {
        stopAutoScroll();
      }
    };
    
    autoScrollRef.current = requestAnimationFrame(scroll);
    setAutoScrolling(true);
  };

  const stopAutoScroll = () => {
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
      setAutoScrolling(false);
    }
  };

  function handleKeyDown(ev: React.KeyboardEvent<HTMLDivElement>) {
    // Handle escape key to cancel drag
    if (ev.key === 'Escape' && drag) {
      ev.preventDefault();
      setDrag(null);
      stopAutoScroll();
      return;
    }

    if (!selectedId) {
      // If no event selected, try to select first event with Tab
      if (ev.key === 'Tab' && events.length > 0) {
        ev.preventDefault();
        setSelectedId(events[0].id);
        return;
      }
      return;
    }

    const evt = events.find(x => x.id === selectedId);
    if (!evt) return;

    // Navigation and actions for selected events
    if (ev.key === 'Enter' || ev.key === ' ') { 
      ev.preventDefault(); 
      onSelect(evt); 
      return; 
    }
    
    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      ev.preventDefault();
      if (confirm(`Delete "${evt.title}"?`)) {
        const currentIndex = events.findIndex(e => e.id === selectedId);
        // Select next event after deletion
        if (currentIndex < events.length - 1) {
          setSelectedId(events[currentIndex + 1].id);
        } else if (currentIndex > 0) {
          setSelectedId(events[currentIndex - 1].id);
        } else {
          setSelectedId(null);
        }
        onDelete(selectedId);
      }
      return;
    }
    
    // Navigate between events with Tab/Shift+Tab
    if (ev.key === 'Tab') {
      ev.preventDefault();
      const currentIndex = events.findIndex(e => e.id === selectedId);
      let nextIndex;
      
      if (ev.shiftKey) {
        // Previous event
        nextIndex = currentIndex > 0 ? currentIndex - 1 : events.length - 1;
      } else {
        // Next event
        nextIndex = currentIndex < events.length - 1 ? currentIndex + 1 : 0;
      }
      
      setSelectedId(events[nextIndex].id);
      return;
    }
    
    // Week navigation
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
    
    // Time nudging
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
    let lastAutoScrollCheck = { direction: null as 'up' | 'down' | null, time: 0 };

    function onMove(ev: MouseEvent) {
      if (!drag || !scrollContainerRef.current || !dragMetaRef.current) return;
      
      const { colTop, scrollStart, allDayTop } = dragMetaRef.current;
      const scrollContainer = scrollContainerRef.current;
      const scrollTop = scrollContainer.scrollTop;
      const scrollRect = scrollContainer.getBoundingClientRect();
      
      // Auto-scroll detection - only trigger in time grid area
      const EDGE_THRESHOLD = 24;
      const mouseYRelativeToContainer = ev.clientY - scrollRect.top;
      const timeGridStartY = ALL_DAY_HEIGHT + DAY_HEADER_HEIGHT;
      
      // Check if mouse is in time grid area and near edges
      if (mouseYRelativeToContainer >= timeGridStartY) {
        const mouseYInTimeGrid = mouseYRelativeToContainer - timeGridStartY;
        const timeGridHeight = scrollRect.height - timeGridStartY;
        
        const now = Date.now();
        let newDirection: 'up' | 'down' | null = null;
        
        if (mouseYInTimeGrid < EDGE_THRESHOLD && scrollTop > 0) {
          newDirection = 'up';
        } else if (mouseYInTimeGrid > timeGridHeight - EDGE_THRESHOLD && 
                   scrollTop < scrollContainer.scrollHeight - scrollContainer.clientHeight) {
          newDirection = 'down';
        }
        
        // Only change auto-scroll if direction changed or enough time passed
        if (newDirection !== lastAutoScrollCheck.direction || now - lastAutoScrollCheck.time > 100) {
          if (newDirection) {
            startAutoScroll(newDirection);
          } else {
            stopAutoScroll();
          }
          lastAutoScrollCheck = { direction: newDirection, time: now };
        }
      } else {
        if (lastAutoScrollCheck.direction !== null) {
          stopAutoScroll();
          lastAutoScrollCheck = { direction: null, time: Date.now() };
        }
      }
      
      const isInAllDay = allDayTop !== undefined && ev.clientY >= allDayTop && ev.clientY <= allDayTop + ALL_DAY_HEIGHT;
      
      const yLocal = isInAllDay ? 0 : 
        (ev.clientY - colTop) + (scrollTop - scrollStart);
      const curMin = isInAllDay ? 0 : clampMins(snapMin(topToMins(yLocal)));

      ev.preventDefault();
      document.getSelection()?.removeAllRanges();

      const gridRect = scrollContainer.getBoundingClientRect();
      const dayWidth = gridRect.width / visibleDays;
      const dayIndex = Math.floor((ev.clientX - gridRect.left) / dayWidth);
      const targetDayUtc0 = days[Math.max(0, Math.min(days.length - 1, dayIndex))]?.dayUtc0;

      switch (drag.kind) {
        case 'create':
          const isNowCrossDay = targetDayUtc0 !== drag.startDayUtc0;
          const isNowMultiDayTimed = !isInAllDay && isNowCrossDay;
          
          setDrag({ 
            ...drag, 
            curMin, 
            allDay: isInAllDay,
            endDayUtc0: targetDayUtc0 || drag.startDayUtc0,
            crossDay: isNowCrossDay,
            isMultiDayTimed: isNowMultiDayTimed
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
        
        case 'resize-start':
        case 'resize-end':
          setDrag({ ...drag, curMin });
          break;
      }
    }

    function onUp() {
      stopAutoScroll(); // Always stop auto-scroll on mouse up
      
      if (!drag) return;
      
      switch (drag.kind) {
        case 'create': {
          const startDayUtc0 = Math.min(drag.startDayUtc0, drag.endDayUtc0);
          const endDayUtc0 = Math.max(drag.startDayUtc0, drag.endDayUtc0);
          const daySpan = Math.floor((endDayUtc0 - startDayUtc0) / DAY_MS) + 1;
          
          if (drag.isMultiDayTimed) {
            // Multi-day timed event - always create as timed, never all-day
            const startStamp = new Date(drag.startDayUtc0 + drag.startMin * 60_000);
            const endStamp   = new Date(drag.endDayUtc0 + drag.curMin   * 60_000);
            let actualStart = startStamp;
            let actualEnd   = endStamp;
            
            // Swap if reversed
            if (actualEnd < actualStart) {
                const tmp = actualStart;
                actualStart = actualEnd;
                actualEnd = tmp;
            }
            
            onCreate({
                startUtc: actualStart.toISOString(),
                endUtc: actualEnd.toISOString(),
                allDay: false, // Force timed even if 24+ hours
                daySpan,
            });
          } else if (drag.allDay || (drag.crossDay && drag.allDay)) {
            // Only create all-day if explicitly in all-day section
            onCreate({
              startUtc: new Date(startDayUtc0).toISOString(),
              endUtc: new Date(endDayUtc0 + DAY_MS - 1).toISOString(),
              allDay: true,
              daySpan
            });
          } else {
            // Single day timed event
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
            // For multi-day events, preserve their duration when moving
            if (drag.daySpan > 1) {
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
              // Single day timed event
              const startMin = snapMin(drag.offsetMin);
              const endMin = startMin + drag.durMin;
              
              onMoveOrResize({
                id: drag.id,
                startUtc: new Date(targetDay + startMin * 60000).toISOString(),
                endUtc: new Date(targetDay + endMin * 60000).toISOString()
              });
            }
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
      stopAutoScroll(); // Cleanup auto-scroll on unmount
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
            "Tap: select • Long-press: create • Drag: move • Esc: cancel"
          ) : (
            "Drag: create • All-day: top section • Ctrl+Drag: move across days • Drag tasks from sidebar to schedule • Esc: cancel"
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
                // Fix: Account for all-day height and day header height
                const yInTimeGrid = e.clientY - rect.top - ALL_DAY_HEIGHT - DAY_HEADER_HEIGHT;
                const scrollOffset = scrollContainerRef.current?.scrollTop || 0;
                const dropMin = Math.max(0, clampMins(snapMin(topToMins(yInTimeGrid + scrollOffset))));
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
            
            {/* Multi-day create ghost in all-day section - with time labels */}
            {drag && drag.kind === 'create' && drag.allDay && drag.crossDay && (() => {
              const startDayIndex = Math.max(0, Math.min(visibleDays - 1, 
                Math.floor((Math.min(drag.startDayUtc0, drag.endDayUtc0) - mondayUtc0) / DAY_MS)));
              const endDayIndex = Math.max(0, Math.min(visibleDays - 1, 
                Math.floor((Math.max(drag.startDayUtc0, drag.endDayUtc0) - mondayUtc0) / DAY_MS)));
              
              const leftPercent = (startDayIndex / visibleDays) * 100;
              const widthPercent = ((endDayIndex - startDayIndex + 1) / visibleDays) * 100;
              
              const startDate = new Date(Math.min(drag.startDayUtc0, drag.endDayUtc0) + MSK_OFFSET_MS);
              const endDate = new Date(Math.max(drag.startDayUtc0, drag.endDayUtc0) + MSK_OFFSET_MS);
              const label = `${startDate.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })} — ${endDate.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}`;
              
              return (
                <div 
                  className="absolute bg-emerald-400/40 border border-emerald-400/60 pointer-events-none transition-all duration-150 flex items-center justify-center"
                  style={{
                    top: 25,
                    height: ALL_DAY_HEIGHT - 30,
                    left: `calc(${leftPercent}% + 4px)`,
                    width: `calc(${widthPercent}% - 8px)`,
                    borderRadius: '6px',
                    zIndex: 50
                  }}
                >
                  <span className="text-xs font-mono text-emerald-100 bg-emerald-800/90 px-2 py-1 rounded">
                    {label}
                  </span>
                </div>
              );
            })()}

            {/* Single-day all-day create ghost */}
            {drag && drag.kind === 'create' && drag.allDay && !drag.crossDay && (() => {
              const dayIndex = Math.max(0, Math.min(visibleDays - 1, 
                Math.floor((drag.startDayUtc0 - mondayUtc0) / DAY_MS)));
              const leftPercent = (dayIndex / visibleDays) * 100;
              const widthPercent = (1 / visibleDays) * 100;
              
              const dayDate = new Date(drag.startDayUtc0 + MSK_OFFSET_MS);
              const label = dayDate.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
              
              return (
                <div 
                  className="absolute bg-emerald-400/40 border border-emerald-400/60 pointer-events-none transition-all duration-150 flex items-center justify-center"
                  style={{
                    top: 25,
                    height: ALL_DAY_HEIGHT - 30,
                    left: `calc(${leftPercent}% + 4px)`,
                    width: `calc(${widthPercent}% - 8px)`,
                    borderRadius: '6px',
                    zIndex: 50
                  }}
                >
                  <span className="text-xs font-mono text-emerald-100 bg-emerald-800/90 px-1 rounded">
                    {label}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Day columns with timed events */}
          {days.map(({ i, dayUtc0, dayMsk }) => {
            const dayLabel = mskDayLabel(dayMsk, isMobile);
            const timedList = timedPerDay.get(dayUtc0) ?? [];

            return (
              <div key={i} className="border-r border-zinc-700 last:border-r-0 flex flex-col bg-black">
                {/* Day header */}
                <div 
                  className="bg-zinc-900 border-b border-zinc-700 sticky" 
                  style={{ top: ALL_DAY_HEIGHT, zIndex: 25, height: DAY_HEADER_HEIGHT }}
                >
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
                    if (!touchStart) return;
                    
                    // Auto-scroll detection for touch - same logic as mouse
                    const touch = e.touches[0];
                    const scrollContainer = scrollContainerRef.current;
                    if (scrollContainer) {
                      const scrollRect = scrollContainer.getBoundingClientRect();
                      const touchYRelativeToContainer = touch.clientY - scrollRect.top;
                      const timeGridStartY = ALL_DAY_HEIGHT + DAY_HEADER_HEIGHT;
                      const EDGE_THRESHOLD = 24;
                      
                      if (touchYRelativeToContainer >= timeGridStartY) {
                        const touchYInTimeGrid = touchYRelativeToContainer - timeGridStartY;
                        const timeGridHeight = scrollRect.height - timeGridStartY;
                        
                        if (touchYInTimeGrid < EDGE_THRESHOLD && scrollContainer.scrollTop > 0) {
                          startAutoScroll('up');
                        } else if (touchYInTimeGrid > timeGridHeight - EDGE_THRESHOLD && 
                                   scrollContainer.scrollTop < scrollContainer.scrollHeight - scrollContainer.clientHeight) {
                          startAutoScroll('down');
                        } else {
                          stopAutoScroll();
                        }
                      } else {
                        stopAutoScroll();
                      }
                    }
                    
                    e.preventDefault(); // Prevent scrolling
                  }}
                  onTouchEnd={(e) => {
                    stopAutoScroll(); // Stop auto-scroll on touch end
                    
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
                    
                    // Check if this is a multi-day segment
                    const isMultiDaySegment = e.span && e.span.spanDays > 1;
                    const isFirstSegment = e.span?.isFirstSegment;
                    const isLastSegment = e.span?.isLastSegment;
                    
                    return (
                      <div
                        key={`${e.id}-${e.dayUtc0}`}
                        className={`absolute rounded border cursor-move font-mono
                          ${selected
                            ? 'border-blue-400 ring-1 ring-blue-400 bg-blue-600/90 text-white z-15'
                            : 'border-zinc-600 bg-zinc-800/95 hover:bg-zinc-700/95 text-zinc-100 z-10'
                          }
                          ${isMultiDaySegment ? 'border-l-4 border-l-purple-400' : ''}`}
                        style={{ 
                          top: e.top, 
                          height: e.height, 
                          left: 2, 
                          right: 2,
                          borderRadius: isMultiDaySegment ? 
                            (isFirstSegment ? '4px 4px 0 0' : isLastSegment ? '0 0 4px 4px' : '0') : 
                            '4px'
                        }}
                        onClick={(ev) => {
                          // Restore single-click selection
                          ev.stopPropagation();
                          if (e.id) setSelectedId(e.id);
                        }}
                        onMouseDown={(ev) => {
                          if (!e.id) return;

                          // Set selected on mousedown too
                          setSelectedId(e.id);

                          const track = ev.currentTarget.parentElement;
                          const rect = track!.getBoundingClientRect();
                          const eventRect = ev.currentTarget.getBoundingClientRect();
                          const yInEvent = ev.clientY - eventRect.top;
                          const isTopHandle = yInEvent < 8;  
                          const isBottomHandle = yInEvent > eventRect.height - 8;

                          // Only disable resize for multi-day events, allow moving
                          if ((isTopHandle || isBottomHandle) && !isMultiDaySegment) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            
                            dragMetaRef.current = {
                              colTop: rect.top,
                              scrollStart: scrollContainerRef.current?.scrollTop ?? 0
                            };

                            if (isTopHandle) {  
                              setDrag({ 
                                kind: 'resize-start', 
                                dayUtc0, 
                                id: e.id, 
                                otherEndMin: endMin, 
                                curMin: startMin 
                              });
                            } else if (isBottomHandle) {  
                              setDrag({ 
                                kind: 'resize-end', 
                                dayUtc0, 
                                id: e.id, 
                                otherEndMin: startMin, 
                                curMin: endMin 
                              });
                            }
                          } else if (!isTopHandle && !isBottomHandle) {
                            // Move logic - allow moving multi-day events
                            dragMetaRef.current = {
                              colTop: rect.top,
                              scrollStart: scrollContainerRef.current?.scrollTop ?? 0
                            };
                            
                            setDrag({ 
                              kind: 'move', 
                              dayUtc0, 
                              targetDayUtc0: dayUtc0,
                              id: e.id, 
                              offsetMin: startMin, 
                              durMin: endMin - startMin,
                              daySpan: isMultiDaySegment ? (e.span?.spanDays || 1) : 1,
                              originalStart: startMin,
                              originalEnd: endMin,
                              allDay: false
                            });
                          }
                          ev.stopPropagation();
                        }}
                        onDoubleClick={() => onSelect(e)}
                        title={`${e.title}${isMultiDaySegment ? ' (continues across days)' : ''} • ${isMobile ? 'Tap to edit' : 'Click to select, double-click to edit'}`}
                      >
                        {/* Only show resize handles for single-day events */}
                        {!isMultiDaySegment && (
                          <>
                            <div className="absolute left-0 right-0 h-2 top-0 cursor-ns-resize bg-transparent hover:bg-blue-400/20" />
                            <div className="absolute left-0 right-0 h-2 bottom-0 cursor-ns-resize bg-transparent hover:bg-blue-400/20" />
                          </>
                        )}

                        <div className="px-2 py-1 min-h-0 leading-tight overflow-hidden">
                          <div className="font-semibold text-sm flex items-center gap-1 mb-0.5">
                            {/* Only show arrows on multi-day segments with proper spacing */}
                            {isMultiDaySegment && !isFirstSegment && <span className="text-purple-300 flex-shrink-0">←</span>}
                            <span className="truncate min-w-0 break-words">{e.title || '(untitled)'}</span>
                            {isMultiDaySegment && !isLastSegment && <span className="text-purple-300 flex-shrink-0">→</span>}
                          </div>
                          
                          {/* Show time info if there's space and it's useful */}
                          {e.height > 35 && !isMultiDaySegment && (
                            <div className="text-zinc-300 text-xs leading-tight">
                              {fmtTime(e.startUtc)}–{fmtTime(e.endUtc)}
                            </div>
                          )}
                          {e.height > 35 && isMultiDaySegment && (
                            <div className="text-purple-200 text-xs leading-tight">
                              {isFirstSegment && `${fmtTime(e.startUtc)} →`}
                              {!isFirstSegment && !isLastSegment && '← →'}
                              {isLastSegment && `← ${fmtTime(e.endUtc)}`}
                            </div>
                          )}
                          
                          {/* Show description if there's even more space - with proper overflow handling */}
                          {e.height > 55 && e.description && (
                            <div className="text-zinc-400 text-xs leading-tight mt-1 overflow-hidden">
                              <div className="break-words">
                                {e.description.length > 40 ? e.description.slice(0, 40) + '...' : e.description}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Create ghost (timed) with smart label positioning */}
                  {drag && drag.kind === 'create' && !drag.allDay && 
                   drag.startDayUtc0 === dayUtc0 && drag.endDayUtc0 === dayUtc0 && (() => {
                    const a = Math.min(drag.startMin, drag.curMin);
                    const b = Math.max(drag.startMin, drag.curMin);
                    const top = minsToTop(a);
                    const height = Math.max(minsToTop(b - a), minsToTop(MIN_SLOT_MIN));
                    
                    // Clip ghost to time grid bounds (start at 0, no negative values)
                    const clippedTop = Math.max(0, top);
                    const maxHeight = (isMobile ? 16 : 24) * HOUR_PX - clippedTop;
                    const clippedHeight = Math.max(minsToTop(MIN_SLOT_MIN), Math.min(height, maxHeight));
                    
                    const startTime = formatMinutesToTime(a);
                    const endTime = formatMinutesToTime(b);
                    
                    return (
                      <div 
                        className="absolute bg-emerald-400/40 border border-emerald-400/60 rounded pointer-events-none transition-all duration-150"
                        style={{ top: clippedTop, height: clippedHeight, left: 2, right: 2, zIndex: 15 }} 
                      >
                        {/* Smart label positioning based on ghost size */}
                        {clippedHeight > 40 ? (
                          // Large enough for both labels
                          <>
                            <div className="absolute top-1 left-1">
                              <span className="text-xs font-mono text-emerald-100 bg-emerald-800/90 px-1 rounded">
                                {startTime}
                              </span>
                            </div>
                            <div className="absolute bottom-1 right-1">
                              <span className="text-xs font-mono text-emerald-100 bg-emerald-800/90 px-1 rounded">
                                {endTime}
                              </span>
                            </div>
                          </>
                        ) : clippedHeight > 20 ? (
                          // Small - just show time range centered
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-mono text-emerald-100 bg-emerald-800/90 px-1 rounded">
                              {startTime}–{endTime}
                            </span>
                          </div>
                        ) : null /* Too small for any label */}
                      </div>
                    );
                  })()}

                  {/* Multi-day timed create ghost with smart labels */}
                  {drag && drag.kind === 'create' && drag.isMultiDayTimed && (
                    drag.startDayUtc0 === dayUtc0 || drag.endDayUtc0 === dayUtc0 || 
                    (dayUtc0 > Math.min(drag.startDayUtc0, drag.endDayUtc0) && 
                    dayUtc0 < Math.max(drag.startDayUtc0, drag.endDayUtc0))
                  ) && (() => {
                    const startDayUtc0 = Math.min(drag.startDayUtc0, drag.endDayUtc0);
                    const endDayUtc0 = Math.max(drag.startDayUtc0, drag.endDayUtc0);
                    
                    const isStartDay = startDayUtc0 === dayUtc0;
                    const isEndDay = endDayUtc0 === dayUtc0;
                    const isMiddleDay = !isStartDay && !isEndDay;
                    
                    let top, height;
                    if (isStartDay) {
                      const startMin = drag.startDayUtc0 === startDayUtc0 ? drag.startMin : drag.curMin;
                      top = minsToTop(startMin);
                      height = minsToTop(1440) - top;
                    } else if (isEndDay) {
                      const endMin = drag.endDayUtc0 === dayUtc0 ? drag.curMin : drag.startMin;
                      top = 0;
                      height = minsToTop(endMin);
                    } else {
                      top = 0;
                      height = minsToTop(1440);
                    }
                    
                    // Clip to time grid bounds
                    const clippedTop = Math.max(0, top);
                    const maxHeight = (isMobile ? 16 : 24) * HOUR_PX - clippedTop;
                    const clippedHeight = Math.max(0, Math.min(height, maxHeight));
                    
                    return (
                      <div 
                        className="absolute bg-purple-400/40 border border-purple-400/60 pointer-events-none transition-all duration-150"
                        style={{ 
                          top: clippedTop, 
                          height: clippedHeight, 
                          left: 2, 
                          right: 2,
                          borderRadius: isStartDay && isEndDay ? '4px' :
                                        isStartDay ? '4px 4px 0 0' :
                                        isEndDay ? '0 0 4px 4px' : '0',
                          zIndex: 15
                        }} 
                      >
                        {/* Smart label positioning for multi-day */}
                        {isStartDay && clippedHeight > 24 && (
                          <div className="absolute top-1 left-1">
                            <span className="text-xs font-mono text-purple-100 bg-purple-800/80 px-1 rounded">
                              {formatMinutesToTime(drag.startMin)}
                            </span>
                          </div>
                        )}
                        {isEndDay && clippedHeight > 24 && (
                          <div className="absolute bottom-1 right-1">
                            <span className="text-xs font-mono text-purple-100 bg-purple-800/80 px-1 rounded">
                              {formatMinutesToTime(drag.curMin)}
                            </span>
                          </div>
                        )}
                        {isMiddleDay && clippedHeight > 30 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] text-purple-100 bg-purple-800/80 px-1 rounded">
                              continues...
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Move ghost with smart labels */}
                  {drag && drag.kind === 'move' && !drag.allDay && 
                   (drag.targetDayUtc0 === dayUtc0 || (!drag.targetDayUtc0 && drag.dayUtc0 === dayUtc0)) && (() => {
                    const offsetMin = clampMins(snapMin(drag.offsetMin));
                    const endMin = offsetMin + drag.durMin;
                    const top = minsToTop(offsetMin);
                    const height = minsToTop(drag.durMin);
                    
                    // Clip to time grid bounds
                    const clippedTop = Math.max(0, top);
                    const maxHeight = (isMobile ? 16 : 24) * HOUR_PX - clippedTop;
                    const clippedHeight = Math.max(minsToTop(MIN_SLOT_MIN), Math.min(height, maxHeight));
                    
                    const startTime = formatMinutesToTime(offsetMin);
                    const endTime = formatMinutesToTime(endMin);
                    
                    return (
                      <div 
                        className="absolute bg-blue-400/40 border border-blue-400/60 rounded pointer-events-none transition-all duration-150"
                        style={{ 
                          top: clippedTop, 
                          height: clippedHeight, 
                          left: 2, 
                          right: 2,
                          zIndex: 15
                        }} 
                      >
                        {clippedHeight > 40 ? (
                          <>
                            <div className="absolute top-1 left-1">
                              <span className="text-xs font-mono text-blue-100 bg-blue-800/90 px-1 rounded">
                                {startTime}
                              </span>
                            </div>
                            <div className="absolute bottom-1 right-1">
                              <span className="text-xs font-mono text-blue-100 bg-blue-800/90 px-1 rounded">
                                {endTime}
                              </span>
                            </div>
                          </>
                        ) : clippedHeight > 20 ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-mono text-blue-100 bg-blue-800/90 px-1 rounded">
                              {startTime}–{endTime}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}

                  {/* Resize ghost with smart labels */}
                  {drag && (drag.kind === 'resize-start' || drag.kind === 'resize-end') && 
                  drag.dayUtc0 === dayUtc0 && (() => {
                    const startMin = Math.min(drag.curMin, drag.otherEndMin);
                    const endMin = Math.max(drag.curMin, drag.otherEndMin);
                    const top = minsToTop(startMin);
                    const height = Math.max(minsToTop(endMin - startMin), minsToTop(MIN_SLOT_MIN));
                    
                    // Clip to time grid bounds
                    const clippedTop = Math.max(0, top);
                    const maxHeight = (isMobile ? 16 : 24) * HOUR_PX - clippedTop;
                    const clippedHeight = Math.max(minsToTop(MIN_SLOT_MIN), Math.min(height, maxHeight));
                    
                    const startTime = formatMinutesToTime(startMin);
                    const endTime = formatMinutesToTime(endMin);
                    
                    return (
                      <div 
                        className="absolute bg-amber-400/40 border border-amber-400/60 rounded pointer-events-none transition-all duration-150"
                        style={{ top: clippedTop, height: clippedHeight, left: 2, right: 2, zIndex: 15 }} 
                      >
                        {clippedHeight > 40 ? (
                          <>
                            <div className="absolute top-1 left-1">
                              <span className="text-xs font-mono text-amber-100 bg-amber-800/90 px-1 rounded">
                                {startTime}
                              </span>
                            </div>
                            <div className="absolute bottom-1 right-1">
                              <span className="text-xs font-mono text-amber-100 bg-amber-800/90 px-1 rounded">
                                {endTime}
                              </span>
                            </div>
                          </>
                        ) : clippedHeight > 20 ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-mono text-amber-100 bg-amber-800/90 px-1 rounded">
                              {startTime}–{endTime}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Add Deadline Tasks section - Only show if we have tasks and onTaskDrop is defined */}
      {showDeadlineTasks && deadlineTasks.length > 0 && onTaskDrop && (
        <DeadlineTasks
          tasks={deadlineTasks}
          mondayUtc0={mondayUtc0}
          days={days}
          onTaskClick={(task) => {
            // Open task in sidebar or convert to event
            console.log('Task clicked:', task);
          }}
          onTaskDragToSchedule={onTaskDrop}
        />
      )}
    </div>
  );
}

function fmtTime(utcISO: string): string {
  const d = new Date(new Date(utcISO).getTime() + MSK_OFFSET_MS);
  return d.toISOString().slice(11, 16);
}