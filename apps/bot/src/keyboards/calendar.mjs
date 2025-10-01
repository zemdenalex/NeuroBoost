import { Markup } from 'telegraf';
import { DateTime } from 'luxon';

export function createMonthCalendarKeyboard(year, month) {
  const today = DateTime.now().setZone('Europe/Moscow');
  const firstDay = DateTime.fromObject({ year, month, day: 1 }, { zone: 'Europe/Moscow' });
  const lastDay = firstDay.endOf('month');
  const startOfCalendar = firstDay.startOf('week');
  
  const buttons = [];
  
  buttons.push([
    Markup.button.callback('⬅️', `calendar_prev_${year}_${month}`),
    Markup.button.callback(`${firstDay.toFormat('MMMM yyyy')}`, 'noop'),
    Markup.button.callback('➡️', `calendar_next_${year}_${month}`)
  ]);
  
  const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  buttons.push(weekdays.map(day => 
    Markup.button.callback(day, 'noop')
  ));
  
  let currentDate = startOfCalendar;
  for (let week = 0; week < 6; week++) {
    const weekRow = [];
    for (let day = 0; day < 7; day++) {
      const dayNum = currentDate.day;
      const isCurrentMonth = currentDate.month === month;
      const isToday = currentDate.hasSame(today, 'day');
      const isPast = currentDate < today.startOf('day');
      
      let displayText = dayNum.toString();
      if (isToday) displayText = `🔸${dayNum}`;
      else if (!isCurrentMonth) displayText = `·${dayNum}·`;
      else if (isPast) displayText = `${dayNum}`;
      
      const callbackData = `calendar_day_${currentDate.toISODate()}`;
      weekRow.push(Markup.button.callback(displayText, callbackData));
      
      currentDate = currentDate.plus({ days: 1 });
    }
    buttons.push(weekRow);
  }
  
  buttons.push([
    Markup.button.callback('📅 Today', `calendar_day_${today.toISODate()}`),
    Markup.button.callback('🏠 Main Menu', 'main_menu')
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

export function createDayViewKeyboard(date, hasEvents = false) {
  const buttons = [];
  const targetDate = DateTime.fromISO(date);
  const today = DateTime.now().setZone('Europe/Moscow');
  
  const prevDay = targetDate.minus({ days: 1 }).toISODate();
  const nextDay = targetDate.plus({ days: 1 }).toISODate();
  
  buttons.push([
    Markup.button.callback('⬅️ Prev', `calendar_day_${prevDay}`),
    Markup.button.callback(targetDate.toFormat('EEE, MMM d'), 'noop'),
    Markup.button.callback('Next ➡️', `calendar_day_${nextDay}`)
  ]);
  
  buttons.push([
    Markup.button.callback('➕ New Event', `new_event_${date}`),
    Markup.button.callback('📋 Tasks for Day', `day_tasks_${date}`)
  ]);
  
  if (hasEvents) {
    buttons.push([
      Markup.button.callback('📅 Show Events', `day_events_${date}`),
      Markup.button.callback('📊 Day Stats', `day_stats_${date}`)
    ]);
  }
  
  buttons.push([
    Markup.button.callback('📅 Calendar', 'calendar_view'),
    Markup.button.callback('🏠 Main Menu', 'main_menu')
  ]);
  
  return Markup.inlineKeyboard(buttons);
}