import React, { useState } from 'react';
import {
  getCalendarDays, getEventsForDay, formatEventTime,
  format, isSameMonth, isSameDay, isToday
} from '../utils/dateUtils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px',
    background: 'var(--border-subtle)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    border: '1px solid var(--border-subtle)',
  },
  weekdayHeader: {
    padding: '12px 8px',
    textAlign: 'center',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    background: 'var(--bg-card)',
  },
  dayCell: {
    minHeight: '110px',
    padding: '8px',
    background: 'var(--bg-card)',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  dayCellOther: {
    opacity: 0.35,
  },
  dayCellToday: {
    background: 'var(--today-bg)',
  },
  dayNumber: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
  },
  dayNumberToday: {
    background: 'var(--today-ring)',
    color: 'var(--bg)',
    fontWeight: 700,
    animation: 'todayPulse 3s infinite',
  },
  eventsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    overflow: 'hidden',
  },
  eventChip: {
    padding: '2px 6px',
    borderRadius: 'var(--radius-xs)',
    fontSize: '0.7rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    lineHeight: 1.5,
  },
  // Dynamic colors applied inline via getChipStyle()
  moreText: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    padding: '1px 6px',
    fontWeight: 500,
  },
  // Modal styles
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '24px',
    maxWidth: '420px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: 'var(--shadow-soft)',
  },
  modalDate: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.3rem',
    fontWeight: 500,
    marginBottom: '16px',
    color: 'var(--text-primary)',
  },
  modalEvent: {
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  modalEventTitle: {
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  modalEventTime: {
    fontSize: '0.8rem',
    opacity: 0.7,
  },
  modalEventDesc: {
    fontSize: '0.8rem',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  modalEventPerson: {
    fontSize: '0.7rem',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  closeBtn: {
    marginTop: '12px',
    padding: '8px 20px',
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-body)',
  },
  noEvents: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
};

function getChipStyle(color) {
  const c = color || 'accent-1';
  return {
    background: `var(--${c}-soft)`,
    color: `var(--${c})`,
    borderLeft: `2px solid var(--${c})`,
  };
}

export default function CalendarGrid({ currentDate, events }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const days = getCalendarDays(currentDate);

  const maxVisible = 3;

  return (
    <>
      <div style={styles.grid}>
        {WEEKDAYS.map(day => (
          <div key={day} style={styles.weekdayHeader}>{day}</div>
        ))}

        {days.map((day, i) => {
          const dayEvents = getEventsForDay(events, day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <div
              key={i}
              style={{
                ...styles.dayCell,
                ...(!isCurrentMonth ? styles.dayCellOther : {}),
                ...(today ? styles.dayCellToday : {}),
              }}
              onClick={() => setSelectedDay(day)}
              onMouseOver={e => { if (!today) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseOut={e => { if (!today) e.currentTarget.style.background = today ? 'var(--today-bg)' : 'var(--bg-card)'; }}
            >
              <div style={{
                ...styles.dayNumber,
                ...(today ? styles.dayNumberToday : {}),
              }}>
                {format(day, 'd')}
              </div>
              <div style={styles.eventsContainer}>
                {dayEvents.slice(0, maxVisible).map((event, j) => (
                  <div
                    key={event.id}
                    style={{
                      ...styles.eventChip,
                      ...getChipStyle(event.person?.color),
                      animationDelay: `${j * 50}ms`,
                    }}
                    title={`${event.title} — ${event.person?.name || ''}${event.calendarLabel ? ' · ' + event.calendarLabel : ''}`}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > maxVisible && (
                  <div style={styles.moreText}>+{dayEvents.length - maxVisible} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <div style={styles.overlay} onClick={() => setSelectedDay(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalDate}>
              {format(selectedDay, 'EEEE, MMMM d')}
              {isToday(selectedDay) && <span style={{ color: 'var(--today-ring)', marginLeft: '8px', fontSize: '0.8rem' }}>Today</span>}
            </div>
            {getEventsForDay(events, selectedDay).length === 0 ? (
              <div style={styles.noEvents}>No events scheduled</div>
            ) : (
              getEventsForDay(events, selectedDay).map(event => {
                const c = event.person?.color || 'accent-1';
                return (
                <div
                  key={event.id}
                  style={{
                    ...styles.modalEvent,
                    background: `var(--${c}-soft)`,
                    borderLeft: `3px solid var(--${c})`,
                  }}
                >
                  <div style={{
                    ...styles.modalEventTitle,
                    color: `var(--${c})`,
                  }}>
                    {event.title}
                  </div>
                  <div style={styles.modalEventTime}>
                    {formatEventTime(event.start)}
                    {event.end && ` — ${formatEventTime(event.end)}`}
                  </div>
                  {event.description && (
                    <div style={styles.modalEventDesc}>{event.description}</div>
                  )}
                  <div style={styles.modalEventPerson}>
                    {event.person?.name}{event.calendarLabel ? ` · ${event.calendarLabel}` : ''}
                  </div>
                </div>
                );
              })
            )}
            <button
              style={styles.closeBtn}
              onClick={() => setSelectedDay(null)}
              onMouseOver={e => { e.target.style.background = 'var(--border)'; }}
              onMouseOut={e => { e.target.style.background = 'var(--bg-hover)'; }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
