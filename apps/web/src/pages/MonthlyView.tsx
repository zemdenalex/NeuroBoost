import React, { useEffect, useMemo, useState, useRef } from 'react';
import type { NbEvent } from '../types';

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Helper functions
function getMonthStart(date: Date): Date {
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getCalendarStart(monthStart: Date): Date {
  const start = new Date(monthStart);
  const dayOfWeek = (start.getDay() + 6) % 7; // Monday = 0
  start.setDate(start.getDate() - dayOfWeek);
  return start;
}

function getCalendarEnd(monthStart: Date): Date {
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const lastDayOfMonth = new Date(nextMonth.getTime() - DAY_MS);
  
  const end = new Date(lastDayOfMonth);
  const dayOfWeek = (end.getDay() + 6) % 7;
  end.setDate(end.getDate() + (6 - dayOfWeek));
  end.setHours(23, 59, 59, 999);
  return end;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function getEventsByDay(events: NbEvent[], startDate: Date, endDate: Date) {
  const eventsByDay = new Map<string, NbEvent[]>();
  
  // Initialize all days
  const current = new Date(startDate);
  while (current <= endDate) {
    const key = current.toISOString().slice(0, 10);
    eventsByDay.set(key, []);
    current.setDate(current.getDate() + 1);
  }
  
  // Distribute events to days
  events.forEach(event => {
    const eventStart = new Date(event.startUtc);
    const eventEnd = new Date(event.endUtc);
    
    // Convert to MSK for day calculations
    const startMsk = new Date(eventStart.getTime() + MSK_OFFSET_MS);
    const endMsk = new Date(eventEnd.getTime() + MSK_OFFSET_MS);
    
    if (event.allDay) {
      // All-day events span from start date to end date (inclusive)
      const current = new Date(startMsk);
      current.setHours(0, 0, 0, 0);
      
      while (current <= endMsk) {
        const key = current.toISOString().slice(0, 10);
        if (eventsByDay.has(key)) {
          eventsByDay.get(key)!.push(event);
        }
        current.setDate(current.getDate() + 1);
      }
    } else {
      // Timed events: add to each day they span
      const current = new Date(startMsk);
      current.setHours(0, 0, 0, 0);
      
      const endDay = new Date(endMsk);
      endDay.setHours(0, 0, 0, 0);
      
      while (current <= endDay) {
        const key = current.toISOString().slice(0, 10);
        if (eventsByDay.has(key)) {
          eventsByDay.get(key)!.push(event);
        }
        current.setDate(current.getDate() + 1);
      }
    }
  });
  
  return eventsByDay;
}

export type MonthlyViewProps = {
  events: NbEvent[];
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  onDayClick?: (date: Date) => void;
  onEventClick?: (event: NbEvent) => void;
  onCreate?: (date: Date) => void;
  onCreateMultiDay?: (startDate: Date, endDate: Date) => void; // FIXED: Add multi-day creation
  selectedEventId?: string;
};

type DragState = {
  startDate: Date;
  endDate: Date;
  isActive: boolean;
} | null;

export function MonthlyView({
  events,
  currentDate = new Date(),
  onDateChange,
  onDayClick,
  onEventClick,
  onCreate,
  onCreateMultiDay,
  selectedEventId
}: MonthlyViewProps) {
  
  // Mobile detection for layout adjustments
  const [isMobile, setIsMobile] = useState(false);
  const [dragState, setDragState] = useState<DragState>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [viewDate, setViewDate] = useState(currentDate);
  
  const { monthStart, calendarStart, calendarEnd, weeks } = useMemo(() => {
    const monthStart = getMonthStart(viewDate);
    const calendarStart = getCalendarStart(monthStart);
    const calendarEnd = getCalendarEnd(monthStart);
    
    // Generate 6 weeks of days (42 days total)
    const weeks = [];
    const current = new Date(calendarStart);
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        weekDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      weeks.push(weekDays);
    }
    
    return { monthStart, calendarStart, calendarEnd, weeks };
  }, [viewDate]);
  
  const eventsByDay = useMemo(() => {
    return getEventsByDay(events, calendarStart, calendarEnd);
  }, [events, calendarStart, calendarEnd]);
  
  const today = new Date();

  // Drag handling for multi-day events
  useEffect(() => {
    function onMouseMove(ev: MouseEvent) {
      if (!dragState || !containerRef.current) return;
      
      // Find which day cell the mouse is over
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const dayCell = target?.closest('[data-date]');
      if (dayCell) {
        const dateStr = dayCell.getAttribute('data-date');
        if (dateStr) {
          const endDate = new Date(dateStr);
          setDragState({
            ...dragState,
            endDate: new Date(Math.max(dragState.startDate.getTime(), endDate.getTime()))
          });
        }
      }
    }

    function onMouseUp() {
      if (dragState && onCreateMultiDay) {
        const daysDiff = Math.floor((dragState.endDate.getTime() - dragState.startDate.getTime()) / DAY_MS);
        if (daysDiff >= 1) {
          // Multi-day event
          onCreateMultiDay(dragState.startDate, dragState.endDate);
        } else {
          // Single day event
          onCreate?.(dragState.startDate);
        }
      }
      setDragState(null);
    }

    if (dragState?.isActive) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      return () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [dragState, onCreate, onCreateMultiDay]);
  
  const handlePrevMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setViewDate(newDate);
    onDateChange?.(newDate);
  };
  
  const handleNextMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setViewDate(newDate);
    onDateChange?.(newDate);
  };
  
  const handleToday = () => {
    const today = new Date();
    setViewDate(today);
    onDateChange?.(today);
  };
  
  const monthName = viewDate.toLocaleDateString('ru-RU', { 
    month: 'long', 
    year: 'numeric' 
  });
  
  const formatEventTime = (event: NbEvent) => {
    if (event.allDay) return 'Весь день';
    
    const start = new Date(event.startUtc);
    const mskStart = new Date(start.getTime() + MSK_OFFSET_MS);
    return mskStart.toISOString().slice(11, 16); // HH:MM
  };
  
  const getEventColor = (event: NbEvent) => {
    if (event.color) return event.color;
    if (event.allDay) return '#3B82F6'; // blue
    return '#10B981'; // emerald
  };

  // Check if a date is in the drag range
  const isInDragRange = (date: Date) => {
    if (!dragState) return false;
    const time = date.getTime();
    return time >= dragState.startDate.getTime() && time <= dragState.endDate.getTime();
  };
  
  return (
    <div className="h-full flex flex-col bg-black text-zinc-100 font-mono" ref={containerRef}>
      {/* Header - Mobile optimized */}
      <div className="flex items-center justify-between p-2 md:p-4 border-b border-zinc-700 bg-zinc-900">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={handlePrevMonth}
            className="px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 font-mono"
          >
            ←
          </button>
          <h2 className="text-sm md:text-xl font-semibold font-mono capitalize">{monthName}</h2>
          <button
            onClick={handleNextMonth}
            className="px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 font-mono"
          >
            →
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-white font-mono"
          >
            {isMobile ? 'Now' : 'Today'}
          </button>
          {!isMobile && (
            <button
              onClick={() => onCreate?.(new Date())}
              className="px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 font-mono"
            >
              + Event
            </button>
          )}
        </div>
      </div>
      
      {/* Days of week header - Monospace */}
      <div className="grid grid-cols-7 border-b border-zinc-700 bg-zinc-900/50">
        {(isMobile ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((day, index) => (
          <div
            key={index}
            className="p-2 text-center text-xs font-medium text-zinc-400 font-mono border-r border-zinc-700 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid - Focused, minimal design with drag support */}
      <div className="flex-1 grid grid-rows-6">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-zinc-700 last:border-b-0">
            {week.map((date, dayIndex) => {
              const dateKey = date.toISOString().slice(0, 10);
              const dayEvents = eventsByDay.get(dateKey) || [];
              const isCurrentMonth = date.getMonth() === viewDate.getMonth();
              const isToday = isSameDay(date, today);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const inDragRange = isInDragRange(date);
              
              // Limit events for clean display
              const maxEvents = isMobile ? 2 : 4;
              const visibleEvents = dayEvents.slice(0, maxEvents);
              const hiddenCount = Math.max(0, dayEvents.length - maxEvents);
              
              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  data-date={dateKey}
                  className={`
                    border-r border-zinc-700 last:border-r-0 p-1 cursor-pointer select-none
                    transition-colors hover:bg-zinc-900/30 font-mono
                    ${isMobile ? 'h-16' : 'h-24 md:h-32'}
                    ${!isCurrentMonth ? 'text-zinc-600 bg-zinc-900/20' : ''}
                    ${isWeekend && isCurrentMonth ? 'bg-zinc-900/10' : ''}
                    ${inDragRange ? 'bg-emerald-400/20 border-emerald-400/40' : ''}
                  `}
                  onClick={() => onDayClick?.(date)}
                  onDoubleClick={() => onCreate?.(date)}
                  onMouseDown={(e) => {
                    // Start drag for multi-day event creation
                    if (onCreateMultiDay) {
                      e.preventDefault();
                      setDragState({
                        startDate: new Date(date),
                        endDate: new Date(date),
                        isActive: true
                      });
                    }
                  }}
                  title={`${date.toLocaleDateString('ru-RU')} • ${dayEvents.length} events • Double-click to create • Drag to create multi-day`}
                >
                  {/* Date number - Clean monospace display */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`
                        text-xs font-mono
                        ${isToday 
                          ? 'bg-blue-600 text-white rounded w-5 h-5 flex items-center justify-center text-[10px]' 
                          : ''
                        }
                        ${!isCurrentMonth ? 'text-zinc-500' : ''}
                      `}
                    >
                      {date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Events - Minimal, focused display */}
                  {!isMobile && (
                    <div className="space-y-0.5">
                      {visibleEvents.map((event, eventIndex) => (
                        <div
                          key={`${event.id}-${eventIndex}`}
                          className={`
                            text-[10px] px-1 py-0.5 rounded truncate cursor-pointer font-mono
                            transition-all hover:opacity-80
                            ${selectedEventId === event.id 
                              ? 'ring-1 ring-blue-400 bg-blue-600/90 text-white' 
                              : 'bg-zinc-700/80 text-zinc-100 hover:bg-zinc-600/80'
                            }
                          `}
                          style={{ 
                            backgroundColor: selectedEventId === event.id 
                              ? undefined 
                              : (getEventColor(event) + '40') // Semi-transparent
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          title={`${event.title} • ${formatEventTime(event)}`}
                        >
                          <div className="flex items-center gap-1">
                            {event.allDay && (
                              <div className="w-1 h-1 rounded-full bg-white opacity-75" />
                            )}
                            <span className="truncate">
                              {event.title || '(untitled)'}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {hiddenCount > 0 && (
                        <div className="text-[10px] text-zinc-500 px-1 font-mono">
                          +{hiddenCount}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Mobile: Show event dots only */}
                  {isMobile && dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 5).map((event, idx) => (
                        <div
                          key={idx}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: getEventColor(event) }}
                        />
                      ))}
                      {dayEvents.length > 5 && (
                        <div className="text-[8px] text-zinc-500 ml-1">+{dayEvents.length - 5}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Footer - Enhanced info */}
      <div className="p-2 border-t border-zinc-700 bg-zinc-900/50">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>
            {events.length} events this month
          </span>
          <div className="flex items-center gap-4">
            {!isMobile && <span>Drag across days: multi-day event</span>}
            <span>Double-click day: create event</span>
            <span>Click event: edit</span>
          </div>
        </div>
      </div>
    </div>
  );
}