import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import type { NbEvent } from '../types';

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_HEIGHT = 120;

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
  const [visibleWeekStart, setVisibleWeekStart] = useState(getWeekStart(currentDate));
  const [currentMonthShown, setCurrentMonthShown] = useState(currentDate);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate a large continuous grid of weeks (50 weeks total)
  const weeksGrid = useMemo(() => {
    const weeks = [];
    const startWeek = new Date(visibleWeekStart);
    startWeek.setDate(startWeek.getDate() - 25 * 7); // 25 weeks before current

    for (let weekIndex = 0; weekIndex < 50; weekIndex++) {
      const weekStart = new Date(startWeek);
      weekStart.setDate(weekStart.getDate() + weekIndex * 7);
      
      const weekDays = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + dayIndex);
        weekDays.push(dayDate);
      }
      
      weeks.push({
        weekStart,
        days: weekDays,
        weekIndex,
        // Determine the primary month for this week (based on Wednesday)
        primaryMonth: weekDays[3].getMonth(),
        primaryYear: weekDays[3].getFullYear()
      });
    }
    
    return weeks;
  }, [visibleWeekStart]);

  // Get events for all visible weeks
  const eventsByDay = useMemo(() => {
    if (!weeksGrid.length) return new Map();
    
    const firstWeek = weeksGrid[0];
    const lastWeek = weeksGrid[weeksGrid.length - 1];
    
    return getEventsByDay(
      events, 
      firstWeek.days[0], 
      lastWeek.days[6]
    );
  }, [events, weeksGrid]);

  // Handle smooth scrolling to update current month
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, clientHeight } = scrollContainerRef.current;
    const viewportCenter = scrollTop + clientHeight / 2;
    const centerWeekIndex = Math.floor(viewportCenter / WEEK_HEIGHT);
    
    if (centerWeekIndex >= 0 && centerWeekIndex < weeksGrid.length) {
      const centerWeek = weeksGrid[centerWeekIndex];
      const centerDate = centerWeek.days[3]; // Wednesday as center of week
      
      // Update current month if it changed
      if (centerDate.getMonth() !== currentMonthShown.getMonth() || 
          centerDate.getFullYear() !== currentMonthShown.getFullYear()) {
        setCurrentMonthShown(new Date(centerDate));
        onDateChange?.(centerDate);
      }
    }
  }, [weeksGrid, currentMonthShown, onDateChange]);

  // Infinite scroll handler
  const handleInfiniteScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollPercent = scrollTop / (scrollHeight - clientHeight);
    
    // Load more weeks when approaching edges
    if (scrollPercent < 0.1) {
      // Near top - load earlier weeks
      const newWeekStart = new Date(visibleWeekStart);
      newWeekStart.setDate(newWeekStart.getDate() - 10 * 7); // Go back 10 weeks
      setVisibleWeekStart(newWeekStart);
      
      // Maintain scroll position
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollTop + 10 * WEEK_HEIGHT;
        }
      }, 50);
    } else if (scrollPercent > 0.9) {
      // Near bottom - load later weeks
      const newWeekStart = new Date(visibleWeekStart);
      newWeekStart.setDate(newWeekStart.getDate() + 10 * 7); // Go forward 10 weeks
      setVisibleWeekStart(newWeekStart);
    }
  }, [visibleWeekStart]);

  // Set up scroll listeners
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    // Set initial scroll position to center
    scrollContainer.scrollTop = 25 * WEEK_HEIGHT;
    
    let scrollTimeout: NodeJS.Timeout;
    let infiniteScrollTimeout: NodeJS.Timeout;
    
    const handleScrollEvents = () => {
      // Handle smooth month detection
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
      
      // Handle infinite scroll
      clearTimeout(infiniteScrollTimeout);
      infiniteScrollTimeout = setTimeout(handleInfiniteScroll, 500);
    };
    
    scrollContainer.addEventListener('scroll', handleScrollEvents, { passive: true });
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScrollEvents);
      clearTimeout(scrollTimeout);
      clearTimeout(infiniteScrollTimeout);
    };
  }, [handleScroll, handleInfiniteScroll]);

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
  
  const formatEventTime = (event: NbEvent) => {
    if (event.allDay) return 'All day';
    
    const start = new Date(event.startUtc);
    const mskStart = new Date(start.getTime() + MSK_OFFSET_MS);
    return mskStart.toISOString().slice(11, 16);
  };
  
  const getEventColor = (event: NbEvent) => {
    if (event.color) return event.color;
    if (event.allDay) return '#3B82F6';
    return '#10B981';
  };

  const getCurrentMonthName = () => {
    return currentMonthShown.toLocaleDateString('ru-RU', { 
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
              const newDate = new Date(currentMonthShown);
              newDate.setMonth(newDate.getMonth() - 1);
              
              // Scroll to that month
              const targetWeekStart = getWeekStart(newDate);
              setVisibleWeekStart(targetWeekStart);
              setCurrentMonthShown(newDate);
              onDateChange?.(newDate);
              
              // Scroll to center
              setTimeout(() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = 25 * WEEK_HEIGHT;
                }
              }, 50);
            }}
            className="px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 font-mono"
          >
            ←
          </button>
          <h2 className="text-sm md:text-xl font-semibold font-mono capitalize">{getCurrentMonthName()}</h2>
          <button
            onClick={() => {
              const newDate = new Date(currentMonthShown);
              newDate.setMonth(newDate.getMonth() + 1);
              
              // Scroll to that month
              const targetWeekStart = getWeekStart(newDate);
              setVisibleWeekStart(targetWeekStart);
              setCurrentMonthShown(newDate);
              onDateChange?.(newDate);
              
              // Scroll to center
              setTimeout(() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = 25 * WEEK_HEIGHT;
                }
              }, 50);
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
              const todayWeekStart = getWeekStart(today);
              setVisibleWeekStart(todayWeekStart);
              setCurrentMonthShown(today);
              onDateChange?.(today);
              
              // Scroll to center
              setTimeout(() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = 25 * WEEK_HEIGHT;
                }
              }, 50);
            }}
            className="px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-white font-mono"
          >
            {isMobile ? 'Now' : 'Today'}
          </button>
        </div>
      </div>
      
      {/* Days of week header */}
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
      
      {/* Continuous grid */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto" 
        style={{ userSelect: isDragging ? 'none' : 'auto' }}
      >
        <div className="flex flex-col">
          {weeksGrid.map((week) => (
            <div 
              key={`week-${week.weekStart.toISOString()}`}
              className="grid grid-cols-7 border-b border-zinc-700"
              style={{ minHeight: WEEK_HEIGHT }}
            >
              {week.days.map((date, dayIndex) => {
                const dateKey = date.toISOString().slice(0, 10);
                const dayEvents = eventsByDay.get(dateKey) || [];
                
                // Proper month detection
                const isCurrentMonth = date.getMonth() === currentMonthShown.getMonth() && 
                                     date.getFullYear() === currentMonthShown.getFullYear();
                const isToday = isSameDay(date, today);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const inDragRange = isInDragRange(date);
                
                // Limit events for clean display
                const maxEvents = isMobile ? 1 : 2;
                const visibleEvents = dayEvents.slice(0, maxEvents);
                const hiddenCount = Math.max(0, dayEvents.length - maxEvents);
                
                return (
                  <div
                    key={dateKey}
                    data-date={dateKey}
                    className={`
                      border-r border-zinc-700 last:border-r-0 p-1 cursor-pointer select-none
                      transition-colors hover:bg-zinc-800/30 font-mono flex flex-col
                      ${!isCurrentMonth ? 'text-zinc-500 bg-zinc-900/20' : 'text-zinc-200'}
                      ${isWeekend ? 'bg-zinc-800/10' : ''}
                      ${inDragRange ? 'bg-emerald-400/30 border-emerald-400/60 ring-1 ring-emerald-400/40' : ''}
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
                    title={`${date.toLocaleDateString('ru-RU')} • ${dayEvents.length} events`}
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
                          ${!isCurrentMonth ? 'text-zinc-600' : ''}
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
                        // Multi-day event detection
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
                                isFirstDay ? 'rounded-l border-r-0' :
                                isLastDay ? 'rounded-r border-l-0' :
                                isMiddleDay ? 'rounded-none border-x-0' : 'rounded'
                              ) : 'rounded'}
                            `}
                            style={{ 
                              backgroundColor: selectedEventId === event.id 
                                ? undefined 
                                : (getEventColor(event) + '50'),
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
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-zinc-700 bg-zinc-900/50">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>
            Smooth scroll • {events.length} events total
          </span>
          <div className="flex items-center gap-4">
            <span>Click: week view</span>
            <span>Double-click: create</span>
            {!isMobile && <span>Drag: multi-day</span>}
          </div>
        </div>
      </div>
    </div>
  );
}