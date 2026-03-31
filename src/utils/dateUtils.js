import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay,
  addMonths, subMonths, addWeeks, subWeeks, addDays,
  isToday, parseISO, isBefore, isAfter,
  startOfDay, endOfDay
} from 'date-fns';

export function getCalendarDays(date) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: calStart, end: calEnd });
}

export function getWeekDays(date) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

export function getEventsForDay(events, day) {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  return events.filter(event => {
    const eventStart = typeof event.start === 'string' ? parseISO(event.start) : event.start;
    const eventEnd = event.end ? (typeof event.end === 'string' ? parseISO(event.end) : event.end) : eventStart;
    return (
      isSameDay(eventStart, day) ||
      (isBefore(eventStart, dayEnd) && isAfter(eventEnd, dayStart))
    );
  });
}

export function formatEventTime(dateStr) {
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(date, 'h:mm a');
  } catch {
    return '';
  }
}

export function getUpcomingEvents(events, count = 5) {
  const now = new Date();
  return events
    .filter(e => {
      const start = typeof e.start === 'string' ? parseISO(e.start) : e.start;
      return isAfter(start, now);
    })
    .sort((a, b) => {
      const aStart = typeof a.start === 'string' ? parseISO(a.start) : a.start;
      const bStart = typeof b.start === 'string' ? parseISO(b.start) : b.start;
      return aStart - bStart;
    })
    .slice(0, count);
}

export {
  format, isSameMonth, isSameDay, isToday, parseISO,
  addMonths, subMonths, addWeeks, subWeeks, addDays
};
