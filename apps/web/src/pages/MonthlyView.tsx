import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import type { NbEvent } from '../types';

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_HEIGHT = 110;
const BUFFER_WEEKS = 52; // Show 1 year above and below current

// Helper functions
function getWeekStart(date: Date): Date {
  const start = new Date(date);
  const dayOfWeek = (start.getDay() + 6) % 7; // Monday = 0
  start.setDate(start.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function getMonthInfo(date: Date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    key: `${date.getFullYear()}-${date.getMonth().toString().padStart(2, '0')}`
  };
}

function isDateInCurrentMonth(date: Date, currentMonth: Date): boolean {
  return date.getFullYear() === currentMonth.getFullYear() && 
         date.getMonth() === currentMonth.getMonth();
}

export type MonthlyViewProps = {
  events: NbEvent[];
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  onDayClick?: (date: Date) => void;
  onEventClick?: (event: NbEvent) => void;
  onCreate?: (date: Date) => void;
  onCreateMultiDay?: (startDate: Date, endDate: Date) => void;
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
  
  const [currentViewMonth, setCurrentViewMonth] = useState(currentDate);
  const [dragState, setDragState] = useState<DragState>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Generate infinite grid of weeks around current month
  const weeksGrid = useMemo(() => {
    const centerWeek = getWeekStart(currentViewMonth);
    const weeks = [];
    
    // Generate weeks from BUFFER_WEEKS before to BUFFER_WEEKS after
    for (let weekOffset = -BUFFER_WEEKS; weekOffset <= BUFFER_WEEKS; weekOffset++) {
      const weekStart = new Date(centerWeek);
      weekStart.setDate(centerWeek.getDate() + weekOffset * 7);
      
      const weekDays = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + dayIndex);
        weekDays.push(dayDate);
      }
      
      weeks.push({
        weekStart,
        days: weekDays,
        weekIndex: weekOffset + BUFFER_WEEKS,
        absoluteWeekIndex: weekOffset
      });
    }
    
    return weeks;
  }, [currentViewMonth]);

  // Get events by day
  const eventsByDay = useMemo(() => {
    const map = new Map<string, NbEvent[]>();
    
    // Initialize all visible days
    weeksGrid.forEach(week => {
      week.days.forEach(day => {
        map.set(day.toISOString().slice(0, 10), []);
      });
    });
    
    // Distribute events to days
    events.forEach(event => {
      const eventStart = new Date(event.startUtc);
      const eventEnd = new Date(event.endUtc);
      
      // Convert to MSK for day calculations
      const startMsk = new Date(eventStart.getTime() + MSK_OFFSET_MS);
      const endMsk = new Date(eventEnd.getTime() + MSK_OFFSET_MS);
      
      if (event.allDay) {
        // All-day events span from start date to end date
        const current = new Date(startMsk);
        current.setHours(0, 0, 0, 0);
        
        while (current <= endMsk) {
          const key = current.toISOString().slice(0, 10);
          if (map.has(key)) {
            map.get(key)!.push(event);
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
          if (map.has(key)) {
            map.get(key)!.push(event);
          }
          current.setDate(current.getDate() + 1);
        }
      }
    });
    
    return map;
  }, [events, weeksGrid]);

  // Smooth scroll handler with throttling
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isScrollingRef.current) return;
    
    const { scrollTop, clientHeight } = scrollContainerRef.current;
    const viewportCenter = scrollTop + clientHeight / 2;
    const centerWeekIndex = Math.floor(viewportCenter / WEEK_HEIGHT);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Debounce month detection
    scrollTimeoutRef.current = setTimeout(() => {
      if (centerWeekIndex >= 0 && centerWeekIndex < weeksGrid.length) {
        const centerWeek = weeksGrid[centerWeekIndex];
        const centerDate = centerWeek.days[3]; // Wednesday as representative day
        
        const newMonth = getMonthInfo(centerDate);
        const currentMonth = getMonthInfo(currentViewMonth);
        
        if (newMonth.key !== currentMonth.key) {
          setCurrentViewMonth(new Date(centerDate));
          onDateChange?.(centerDate);
        }
      }
    }, 100);
  }, [weeksGrid, currentViewMonth, onDateChange]);

  // Set up scroll listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    // Set initial scroll position to center (current month)
    const centerWeekIndex = BUFFER_WEEKS;
    scrollContainer.scrollTop = centerWeekIndex * WEEK_HEIGHT;
    
    // Add scroll listener
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Navigation functions
  const navigateToMonth = useCallback((targetDate: Date) => {
    setCurrentViewMonth(targetDate);
    
    // Calculate scroll position for target month
    const targetWeekStart = getWeekStart(targetDate);
    const currentWeekStart = getWeekStart(currentViewMonth);
    const weekDiff = Math.round((targetWeekStart.getTime() - currentWeekStart.getTime()) / (7 * DAY_MS));
    const targetScrollTop = (BUFFER_WEEKS + weekDiff) * WEEK_HEIGHT;
    
    if (scrollContainerRef.current) {
      isScrollingRef.current = true;
      scrollContainerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
      
      // Reset scrolling flag after animation
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 300);
    }
  }, [currentViewMonth]);

  // Handle drag for multi-day events
  useEffect(() => {
    if (!isDragging || !dragState) return;

    function onMouseMove(ev: MouseEvent) {
      if (!dragState) return;
      
      ev.preventDefault();
      document.getSelection()?.removeAllRanges();
      
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const dayCell = target?.closest('[data-date]');
      if (dayCell) {
        const dateStr = dayCell.getAttribute('data-date');
        if (dateStr) {
          const endDate = new Date(dateStr);
          setDragState({
            ...dragState,
            endDate: endDate >= dragState.startDate ? endDate : dragState.startDate
          });
        }
      }
    }

    function onMouseUp() {
      if (dragState) {
        const daysDiff = Math.floor((dragState.endDate.getTime() - dragState.startDate.getTime()) / DAY_MS);
        if (daysDiff >= 1 && onCreateMultiDay) {
          onCreateMultiDay(dragState.startDate, dragState.endDate);
        } else if (daysDiff === 0 && onCreate) {
          onCreate(dragState.startDate);
        }
      }
      setDragState(null);
      setIsDragging(false);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('selectstart', (e) => e.preventDefault());
    
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('selectstart', (e) => e.preventDefault());
    };
  }, [isDragging, dragState, onCreate, onCreateMultiDay]);
  
  const today = new Date();

  // Check if a date is in the drag range
  const isInDragRange = (date: Date) => {
    if (!dragState || !isDragging) return false;
    const dateTime = date.getTime();
    const startTime = dragState.startDate.getTime();
    const endTime = dragState.endDate.getTime();
    return dateTime >= startTime && dateTime <= endTime;
  };
  
  const getCurrentMonthName = () => {
    return currentViewMonth.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };
  
  return (
    <div className="h-full flex flex-col bg-black text-zinc-100 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-700 bg-zinc-900">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const newDate = new Date(currentViewMonth);
              newDate.setMonth(newDate.getMonth() - 1);
              navigateToMonth(newDate);
            }}
            className="px-3 py-1 text-sm rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700"
          >
            ← Prev
          </button>
          <h2 className="text-lg font-semibold">{getCurrentMonthName()}</h2>
          <button
            onClick={() => {
              const newDate = new Date(currentViewMonth);
              newDate.setMonth(newDate.getMonth() + 1);
              navigateToMonth(newDate);
            }}
            className="px-3 py-1 text-sm rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700"
          >
            Next →
          </button>
        </div>
        
        <button
          onClick={() => navigateToMonth(new Date())}
          className="px-3 py-1 text-sm rounded bg-zinc-700 hover:bg-zinc-600 text-white"
        >
          Today
        </button>
      </div>
      
      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-zinc-700 bg-zinc-900 sticky top-0 z-10">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
          <div
            key={index}
            className="p-2 text-center text-sm font-medium text-zinc-300 border-r border-zinc-700 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Infinite calendar grid */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto" 
        style={{ userSelect: isDragging ? 'none' : 'auto' }}
      >
        <div 
          className="flex flex-col"
          style={{ height: (BUFFER_WEEKS * 2 + 1) * WEEK_HEIGHT }}
        >
          {weeksGrid.map((week) => (
            <div 
              key={`week-${week.weekStart.toISOString()}`}
              className="grid grid-cols-7 border-b border-zinc-700"
              style={{ height: WEEK_HEIGHT }}
            >
              {week.days.map((date, dayIndex) => {
                const dateKey = date.toISOString().slice(0, 10);
                const dayEvents = eventsByDay.get(dateKey) || [];
                
                // Improved month detection
                const isCurrentMonth = isDateInCurrentMonth(date, currentViewMonth);
                const isToday = isSameDay(date, today);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const inDragRange = isInDragRange(date);
                
                // Limit events for clean display
                const maxEvents = 2;
                const visibleEvents = dayEvents.slice(0, maxEvents);
                const hiddenCount = Math.max(0, dayEvents.length - maxEvents);
                
                return (
                  <div
                    key={dateKey}
                    data-date={dateKey}
                    className={`
                      border-r border-zinc-700 last:border-r-0 p-1 cursor-pointer select-none
                      transition-colors hover:bg-zinc-800/30 flex flex-col
                      ${!isCurrentMonth ? 'text-zinc-500 bg-zinc-900/50' : 'text-zinc-200'}
                      ${isWeekend && isCurrentMonth ? 'bg-zinc-800/20' : ''}
                      ${inDragRange ? 'bg-emerald-400/30 ring-1 ring-emerald-400/40' : ''}
                    `}
                    onClick={() => onDayClick?.(date)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onCreate?.(date);
                    }}
                    onMouseDown={(e) => {
                      if (onCreateMultiDay && e.detail !== 2) {
                        e.preventDefault();
                        setDragState({
                          startDate: new Date(date),
                          endDate: new Date(date),
                          isActive: true
                        });
                        setIsDragging(true);
                      }
                    }}
                  >
                    {/* Date number */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`
                          text-sm font-medium
                          ${isToday 
                            ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs' 
                            : ''
                          }
                          ${!isCurrentMonth ? 'text-zinc-600' : ''}
                        `}
                      >
                        {date.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-xs text-zinc-500">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                    
                    {/* Events */}
                    <div className="flex-1 space-y-0.5 overflow-hidden">
                      {visibleEvents.map((event: NbEvent, eventIndex: number) => (
                        <div
                          key={`${event.id}-${eventIndex}`}
                          className={`
                            text-xs px-1 py-0.5 truncate cursor-pointer rounded
                            transition-all hover:opacity-80
                            ${selectedEventId === event.id 
                              ? 'ring-1 ring-blue-400 bg-blue-600/90 text-white' 
                              : 'bg-zinc-700/80 text-zinc-100 hover:bg-zinc-600/80'
                            }
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          title={`${event.title} • ${event.allDay ? 'All day' : 'Timed'}`}
                        >
                          <div className="flex items-center gap-1">
                            {event.allDay && (
                              <div className="w-1 h-1 rounded-full bg-current opacity-75" />
                            )}
                            <span className="truncate">
                              {event.title || '(untitled)'}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {hiddenCount > 0 && (
                        <div className="text-xs text-zinc-500 px-1">
                          +{hiddenCount} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-zinc-700 bg-zinc-900">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            Infinite scroll • {events.length} events
          </span>
          <div className="flex items-center gap-4">
            <span>Click: week view</span>
            <span>Double-click: create</span>
            <span>Drag: multi-day</span>
          </div>
        </div>
      </div>
    </div>
  );
}