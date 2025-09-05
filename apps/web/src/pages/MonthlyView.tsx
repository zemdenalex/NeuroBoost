import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import type { NbEvent } from '../types';

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_HEIGHT = 600; // Fixed height per month for consistent scrolling

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
  onCreateMultiDay?: (startDate: Date, endDate: Date) => void;
  selectedEventId?: string;
};

type DragState = {
  startDate: Date;
  endDate: Date;
  isActive: boolean;
} | null;

type MonthData = {
  monthStart: Date;
  calendarStart: Date;
  calendarEnd: Date;
  weeks: Date[][];
  offset: number; // relative to current month
};

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
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [centerMonth, setCenterMonth] = useState(currentDate);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate 5 months: 2 before, current, 2 after
  const monthsData = useMemo(() => {
    const months: MonthData[] = [];
    
    for (let offset = -2; offset <= 2; offset++) {
      const monthDate = new Date(centerMonth);
      monthDate.setMonth(monthDate.getMonth() + offset);
      
      const monthStart = getMonthStart(monthDate);
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
      
      months.push({
        monthStart,
        calendarStart,
        calendarEnd,
        weeks,
        offset
      });
    }
    
    return months;
  }, [centerMonth]);

  // Get events for all visible months
  const eventsByDay = useMemo(() => {
    if (!monthsData.length) return new Map();
    
    const firstMonth = monthsData[0];
    const lastMonth = monthsData[monthsData.length - 1];
    
    return getEventsByDay(events, firstMonth.calendarStart, lastMonth.calendarEnd);
  }, [events, monthsData]);

  // Handle continuous scrolling
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isScrolling) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollPercent = scrollTop / (scrollHeight - clientHeight);
    
    // Determine which month is in center of viewport
    const monthIndex = Math.round(scrollTop / MONTH_HEIGHT);
    const targetMonthOffset = monthIndex - 2; // Center month should be at index 2
    
    if (targetMonthOffset !== 0) {
      setIsScrolling(true);
      
      // Update center month
      const newCenterMonth = new Date(centerMonth);
      newCenterMonth.setMonth(newCenterMonth.getMonth() + targetMonthOffset);
      setCenterMonth(newCenterMonth);
      onDateChange?.(newCenterMonth);
      
      // Reset scroll position to center
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 2 * MONTH_HEIGHT;
        }
        setIsScrolling(false);
      }, 50);
    }
  }, [centerMonth, onDateChange, isScrolling]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    // Set initial scroll position to show center month
    scrollContainer.scrollTop = 2 * MONTH_HEIGHT;
    
    let scrollTimeout: NodeJS.Timeout;
    const debouncedScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 150);
    };
    
    scrollContainer.addEventListener('scroll', debouncedScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', debouncedScroll);
      clearTimeout(scrollTimeout);
    };
  }, [handleScroll]);

  // Handle drag for multi-day events
  useEffect(() => {
    if (!isDragging || !dragState) return;

    function onMouseMove(ev: MouseEvent) {
      if (!dragState || !containerRef.current) return;
      
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
    return centerMonth.toLocaleDateString('ru-RU', { 
      month: 'long', 
      year: 'numeric' 
    });
  };
  
  return (
    <div className="h-full flex flex-col bg-black text-zinc-100 font-mono" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 md:p-4 border-b border-zinc-700 bg-zinc-900">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => {
              const newMonth = new Date(centerMonth);
              newMonth.setMonth(newMonth.getMonth() - 1);
              setCenterMonth(newMonth);
              onDateChange?.(newMonth);
            }}
            className="px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 font-mono"
          >
            ←
          </button>
          <h2 className="text-sm md:text-xl font-semibold font-mono capitalize">{getCurrentMonthName()}</h2>
          <button
            onClick={() => {
              const newMonth = new Date(centerMonth);
              newMonth.setMonth(newMonth.getMonth() + 1);
              setCenterMonth(newMonth);
              onDateChange?.(newMonth);
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
              setCenterMonth(today);
              onDateChange?.(today);
            }}
            className="px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-white font-mono"
          >
            {isMobile ? 'Now' : 'Today'}
          </button>
        </div>
      </div>
      
      {/* Days of week header */}
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
      
      {/* Continuous scrolling calendar grid */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto" 
        style={{ userSelect: isDragging ? 'none' : 'auto' }}
      >
        <div className="flex flex-col">
          {monthsData.map((monthData, monthIndex) => (
            <div 
              key={`${monthData.monthStart.getFullYear()}-${monthData.monthStart.getMonth()}`}
              className="border-b border-zinc-700"
              style={{ minHeight: MONTH_HEIGHT }}
            >
              {/* Month label */}
              <div className="p-2 bg-zinc-800/50 border-b border-zinc-700">
                <h3 className="text-sm font-medium text-zinc-300 font-mono">
                  {monthData.monthStart.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                </h3>
              </div>
              
              {/* Month grid */}
              <div className="grid grid-rows-6">
                {monthData.weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 border-b border-zinc-700 last:border-b-0">
                    {week.map((date, dayIndex) => {
                      const dateKey = date.toISOString().slice(0, 10);
                      const dayEvents = eventsByDay.get(dateKey) || [];
                      const isCurrentMonth = date.getMonth() === monthData.monthStart.getMonth();
                      const isToday = isSameDay(date, today);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const inDragRange = isInDragRange(date);
                      
                      // Limit events for clean display
                      const maxEvents = isMobile ? 2 : 3;
                      const visibleEvents = dayEvents.slice(0, maxEvents);
                      const hiddenCount = Math.max(0, dayEvents.length - maxEvents);
                      
                      return (
                        <div
                          key={`${weekIndex}-${dayIndex}`}
                          data-date={dateKey}
                          className={`
                            border-r border-zinc-700 last:border-r-0 p-1 cursor-pointer select-none
                            transition-colors hover:bg-zinc-900/30 font-mono
                            ${isMobile ? 'h-16' : 'h-20'}
                            ${!isCurrentMonth ? 'text-zinc-600 bg-zinc-900/20' : ''}
                            ${isWeekend && isCurrentMonth ? 'bg-zinc-900/10' : ''}
                            ${inDragRange ? 'bg-emerald-400/20 border-emerald-400/40' : ''}
                            ${monthData.offset === 0 ? 'opacity-100' : 'opacity-75'}
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
                          
                          {/* Events */}
                          {!isMobile && (
                            <div className="space-y-0.5">
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
                                      text-[10px] px-1 py-0.5 truncate cursor-pointer font-mono
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
                                        : (getEventColor(event) + '40')
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
                                        <span className="text-[8px] opacity-75">→</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              
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
                              {dayEvents.slice(0, 5).map((event: NbEvent, idx:number) => (
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
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-zinc-700 bg-zinc-900/50">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>
            Continuous scroll • {events.length} events total
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