import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import type { NbEvent } from '../types';

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_HEIGHT = 120; // Height per week row

// Helper functions
function getMonthStart(date: Date): Date {
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

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
  
  const [isMobile, setIsMobile] = useState(false);
  const [dragState, setDragState] = useState<DragState>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [centerDate, setCenterDate] = useState(currentDate);
  const [highlightedMonth, setHighlightedMonth] = useState(currentDate);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate continuous weeks grid (25 weeks: 12 weeks before current, current week, 12 weeks after)
  const weeksData = useMemo(() => {
    const currentWeekStart = getWeekStart(centerDate);
    const weeks = [];
    
    // Start 12 weeks before current week
    const startWeek = new Date(currentWeekStart);
    startWeek.setDate(startWeek.getDate() - 12 * 7);
    
    for (let weekOffset = 0; weekOffset < 25; weekOffset++) {
      const weekStart = new Date(startWeek);
      weekStart.setDate(weekStart.getDate() + weekOffset * 7);
      
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + day);
        weekDays.push(dayDate);
      }
      
      weeks.push({
        weekStart,
        days: weekDays,
        weekNumber: weekOffset
      });
    }
    
    return weeks;
  }, [centerDate]);

  // Get events for all visible weeks
  const eventsByDay = useMemo(() => {
    if (!weeksData.length) return new Map();
    
    const firstWeek = weeksData[0];
    const lastWeek = weeksData[weeksData.length - 1];
    
    return getEventsByDay(
      events, 
      firstWeek.days[0], 
      lastWeek.days[6]
    );
  }, [events, weeksData]);

  // Handle scroll to update highlighted month
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, clientHeight } = scrollContainerRef.current;
    const viewportCenter = scrollTop + clientHeight / 2;
    const weekIndex = Math.floor(viewportCenter / WEEK_HEIGHT);
    
    if (weekIndex >= 0 && weekIndex < weeksData.length) {
      const centerWeek = weeksData[weekIndex];
      const middleDayOfWeek = centerWeek.days[3]; // Wednesday
      
      setHighlightedMonth(new Date(middleDayOfWeek));
      onDateChange?.(middleDayOfWeek);
    }
  }, [weeksData, onDateChange]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    // Set initial scroll position to show current week in center
    const currentWeekIndex = 12; // Current week is at index 12
    scrollContainer.scrollTop = currentWeekIndex * WEEK_HEIGHT - scrollContainer.clientHeight / 2;
    
    let scrollTimeout: NodeJS.Timeout;
    const debouncedScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    };
    
    scrollContainer.addEventListener('scroll', debouncedScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', debouncedScroll);
      clearTimeout(scrollTimeout);
    };
  }, [handleScroll]);

  // Handle infinite scroll - load more weeks when approaching edges
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    const handleInfiniteScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      
      // If scrolled near top (within 3 weeks)
      if (scrollTop < 3 * WEEK_HEIGHT) {
        const newCenterDate = new Date(centerDate);
        newCenterDate.setDate(newCenterDate.getDate() - 7 * 4); // Go back 4 weeks
        setCenterDate(newCenterDate);
        
        // Maintain relative scroll position
        setTimeout(() => {
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollTop + 4 * WEEK_HEIGHT;
          }
        }, 50);
      }
      
      // If scrolled near bottom (within 3 weeks)
      if (scrollTop > scrollHeight - clientHeight - 3 * WEEK_HEIGHT) {
        const newCenterDate = new Date(centerDate);
        newCenterDate.setDate(newCenterDate.getDate() + 7 * 4); // Go forward 4 weeks
        setCenterDate(newCenterDate);
      }
    };
    
    let scrollTimeout: NodeJS.Timeout;
    const debouncedInfiniteScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleInfiniteScroll, 300);
    };
    
    scrollContainer.addEventListener('scroll', debouncedInfiniteScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', debouncedInfiniteScroll);
      clearTimeout(scrollTimeout);
    };
  }, [centerDate]);

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
            endDate: new Date(Math.max(dragState.startDate.getTime(), endDate.getTime()))
          });
        }
      }
    }

    function onMouseUp() {
      if (dragState && onCreateMultiDay) {
        const daysDiff = Math.floor((dragState.endDate.getTime() - dragState.startDate.getTime()) / DAY_MS);
        if (daysDiff >= 1) {
          onCreateMultiDay(dragState.startDate, dragState.endDate);
        } else if (daysDiff === 0) {
          onCreate?.(dragState.startDate);
        }
      }
      setDragState(null);
      setIsDragging(false);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('selectstart', preventSelect);
    
    function preventSelect(e: Event) {
      e.preventDefault();
    }
    
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('selectstart', preventSelect);
    };
  }, [isDragging, dragState, onCreate, onCreateMultiDay]);
  
  const today = new Date();

  // Check if a date is in the drag range
  const isInDragRange = (date: Date) => {
    if (!dragState) return false;
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const rangeStart = new Date(dragState.startDate);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(dragState.endDate);
    rangeEnd.setHours(0, 0, 0, 0);
    
    return dateStart.getTime() >= rangeStart.getTime() && dateStart.getTime() <= rangeEnd.getTime();
  };
  
  const formatEventTime = (event: NbEvent) => {
    if (event.allDay) return 'All day';
    
    const start = new Date(event.startUtc);
    const mskStart = new Date(start.getTime() + MSK_OFFSET_MS);
    return mskStart.toISOString().slice(11, 16); // HH:MM
  };
  
  const getEventColor = (event: NbEvent) => {
    if (event.color) return event.color;
    if (event.allDay) return '#3B82F6'; // blue
    return '#10B981'; // emerald
  };

  const getCurrentMonthName = () => {
    return highlightedMonth.toLocaleDateString('ru-RU', { 
      month: 'long', 
      year: 'numeric' 
    });
  };
  
  return (
    <div className="h-full flex flex-col bg-black text-zinc-100 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between p-2 md:p-4 border-b border-zinc-700 bg-zinc-900">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => {
              const newDate = new Date(centerDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setCenterDate(newDate);
              setHighlightedMonth(newDate);
              onDateChange?.(newDate);
            }}
            className="px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 font-mono"
          >
            ←
          </button>
          <h2 className="text-sm md:text-xl font-semibold font-mono capitalize">{getCurrentMonthName()}</h2>
          <button
            onClick={() => {
              const newDate = new Date(centerDate);
              newDate.setMonth(newDate.getMonth() + 1);
              setCenterDate(newDate);
              setHighlightedMonth(newDate);
              onDateChange?.(newDate);
            }}
            className="px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 font-mono"
          >
            →
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const today = new Date();
              setCenterDate(today);
              setHighlightedMonth(today);
              onDateChange?.(today);
            }}
            className="px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-white font-mono"
          >
            {isMobile ? 'Now' : 'Today'}
          </button>
        </div>
      </div>
      
      {/* Days of week header - FIXED alignment */}
      <div className="grid grid-cols-7 border-b border-zinc-700 bg-zinc-900/50 sticky top-0 z-10">
        {(isMobile ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((day, index) => (
          <div
            key={index}
            className="p-2 text-center text-xs font-medium text-zinc-400 font-mono border-r border-zinc-700 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Continuous scrolling weeks grid */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto" 
        style={{ userSelect: isDragging ? 'none' : 'auto' }}
      >
        <div className="flex flex-col">
          {weeksData.map((weekData, weekIndex) => {
            // Determine if this week should be highlighted as current month
            const weekMiddleDay = weekData.days[3]; // Wednesday
            const isCurrentMonthWeek = weekMiddleDay.getMonth() === highlightedMonth.getMonth() && 
                                      weekMiddleDay.getFullYear() === highlightedMonth.getFullYear();
            
            return (
              <div 
                key={`week-${weekData.weekStart.toISOString()}`}
                className={`grid grid-cols-7 border-b border-zinc-700 transition-colors ${
                  isCurrentMonthWeek ? 'bg-zinc-900/20' : 'bg-black'
                }`}
                style={{ minHeight: WEEK_HEIGHT }}
              >
                {weekData.days.map((date, dayIndex) => {
                  const dateKey = date.toISOString().slice(0, 10);
                  const dayEvents = eventsByDay.get(dateKey) || [];
                  const isCurrentMonth = date.getMonth() === highlightedMonth.getMonth();
                  const isToday = isSameDay(date, today);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const inDragRange = isInDragRange(date);
                  
                  // Limit events for clean display
                  const maxEvents = isMobile ? 1 : 2;
                  const visibleEvents = dayEvents.slice(0, maxEvents);
                  const hiddenCount = Math.max(0, dayEvents.length - maxEvents);
                  
                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      data-date={dateKey}
                      className={`
                        border-r border-zinc-700 last:border-r-0 p-1 cursor-pointer select-none
                        transition-colors hover:bg-zinc-800/30 font-mono flex flex-col
                        ${!isCurrentMonth ? 'text-zinc-600 bg-zinc-900/10' : ''}
                        ${isWeekend && isCurrentMonth ? 'bg-zinc-800/20' : ''}
                        ${inDragRange ? 'bg-emerald-400/30 border-emerald-400/50 ring-1 ring-emerald-400/30' : ''}
                        ${isCurrentMonthWeek ? 'border-zinc-600' : 'border-zinc-800'}
                        ${inDragRange && isWeekend ? 'bg-emerald-400/40' : ''}
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
                      title={`${date.toLocaleDateString('ru-RU')} • ${dayEvents.length} events • Click: go to week • Double-click: create • Drag: multi-day`}
                    >
                      {/* Date number */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`
                            text-xs font-mono font-medium
                            ${isToday 
                              ? 'bg-blue-600 text-white rounded w-5 h-5 flex items-center justify-center text-[10px]' 
                              : ''
                            }
                            ${!isCurrentMonth ? 'text-zinc-500' : isCurrentMonthWeek ? 'text-zinc-200' : 'text-zinc-400'}
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
                      
                      {/* Events */}
                      <div className="flex-1 space-y-0.5">
                        {visibleEvents.map((event: NbEvent, eventIndex: number) => {
                          // Check if this is a multi-day event and which segment
                          const eventStart = new Date(event.startUtc);
                          const eventEnd = new Date(event.endUtc);
                          const eventStartMsk = new Date(eventStart.getTime() + MSK_OFFSET_MS);
                          const eventEndMsk = new Date(eventEnd.getTime() + MSK_OFFSET_MS);
                          
                          const isMultiDay = event.allDay && 
                            eventStartMsk.toDateString() !== eventEndMsk.toDateString();
                          
                          const isFirstDay = isMultiDay && 
                            date.toDateString() === eventStartMsk.toDateString();
                          const isLastDay = isMultiDay && 
                            date.toDateString() === eventEndMsk.toDateString();
                          const isMiddleDay = isMultiDay && !isFirstDay && !isLastDay;
                          
                          return (
                            <div
                              key={`${event.id}-${eventIndex}`}
                              className={`
                                text-[9px] px-1 py-0.5 truncate cursor-pointer font-mono
                                transition-all hover:opacity-80
                                ${selectedEventId === event.id 
                                  ? 'ring-1 ring-blue-400 bg-blue-600/90 text-white' 
                                  : 'bg-zinc-700/80 text-zinc-100 hover:bg-zinc-600/80'
                                }
                                ${isMultiDay ? (
                                  isFirstDay ? 'rounded-l' :
                                  isLastDay ? 'rounded-r' :
                                  isMiddleDay ? 'rounded-none' : 'rounded'
                                ) : 'rounded'}
                              `}
                              style={{ 
                                backgroundColor: selectedEventId === event.id 
                                  ? undefined 
                                  : (getEventColor(event) + '40'),
                                minHeight: '14px'
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
                                  {isFirstDay || !isMultiDay ? (event.title || '(untitled)') : '···'}
                                </span>
                                {isMultiDay && isLastDay && (
                                  <span className="text-[7px] opacity-75">→</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        
                        {hiddenCount > 0 && (
                          <div className="text-[9px] text-zinc-500 px-1 font-mono">
                            +{hiddenCount}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-zinc-700 bg-zinc-900/50">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>
            Scroll: continuous • {events.length} events total
          </span>
          <div className="flex items-center gap-4">
            <span>Click day: week view</span>
            <span>Double-click: create</span>
            {!isMobile && <span>Drag: multi-day</span>}
          </div>
        </div>
      </div>
    </div>
  );
}