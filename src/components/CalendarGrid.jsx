import React, { useState, useRef, useCallback } from 'react';
import {
  getCalendarDays, getWeekDays, getEventsForDay, formatEventTime,
  format, isSameMonth, isSameDay, isToday
} from '../utils/dateUtils';

const WEEKDAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAYS_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getChipStyle(color) {
  const c = color || 'accent-1';
  return {
    background: `var(--${c}-soft)`,
    color: `var(--${c})`,
    borderLeft: `2px solid var(--${c})`,
  };
}

export default function CalendarGrid({ currentDate, events, viewMode, onSwipeLeft, onSwipeRight, isMobile }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Swipe handling
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Only trigger swipe if horizontal movement is dominant and significant
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX > 0) onSwipeRight();
      else onSwipeLeft();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [onSwipeLeft, onSwipeRight]);

  const days = viewMode === 'week' ? getWeekDays(currentDate) : getCalendarDays(currentDate);
  const weekdays = isMobile ? WEEKDAYS_SHORT : WEEKDAYS_FULL;
  const maxVisible = viewMode === 'week' ? (isMobile ? 4 : 6) : (isMobile ? 2 : 3);

  // Week view: show day with full event list
  if (viewMode === 'week') {
    return (
      <>
        <div
          style={styles.weekContainer}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Week header row */}
          <div style={styles.weekHeader}>
            {days.map((day, i) => {
              const today = isToday(day);
              const dayEvents = getEventsForDay(events, day);
              return (
                <div
                  key={i}
                  style={{
                    ...styles.weekHeaderDay,
                    ...(today ? styles.weekHeaderDayToday : {}),
                  }}
                  onClick={() => setSelectedDay(day)}
                >
                  <div style={styles.weekDayName}>{weekdays[i]}</div>
                  <div style={{
                    ...styles.weekDayNum,
                    ...(today ? styles.weekDayNumToday : {}),
                  }}>
                    {format(day, 'd')}
                  </div>
                  {dayEvents.length > 0 && (
                    <div style={styles.weekDotRow}>
                      {dayEvents.slice(0, 3).map((e, j) => (
                        <div key={j} style={{
                          ...styles.weekDot,
                          background: `var(--${e.person?.color || 'accent-1'})`,
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day-by-day event lists */}
          <div style={styles.weekBody}>
            {days.map((day, i) => {
              const dayEvents = getEventsForDay(events, day);
              const today = isToday(day);
              if (dayEvents.length === 0 && !today) return null;

              return (
                <div key={i} style={styles.weekDaySection}>
                  <div style={styles.weekDayLabel}>
                    <span style={{
                      color: today ? 'var(--today-ring)' : 'var(--text-secondary)',
                      fontWeight: today ? 600 : 500,
                    }}>
                      {format(day, 'EEE d')}
                      {today && <span style={{ fontSize: '0.7rem', marginLeft: '6px', opacity: 0.7 }}>Today</span>}
                    </span>
                  </div>
                  {dayEvents.length === 0 ? (
                    <div style={styles.noEventsSmall}>No events</div>
                  ) : (
                    dayEvents.map((event) => (
                      <div
                        key={event.id}
                        style={{
                          ...styles.weekEvent,
                          ...getChipStyle(event.person?.color),
                          borderLeftWidth: '3px',
                        }}
                        onClick={() => setSelectedDay(day)}
                      >
                        <div style={styles.weekEventTitle}>{event.title}</div>
                        <div style={styles.weekEventMeta}>
                          {formatEventTime(event.start)}
                          {event.person && ` · ${event.person.name}`}
                          {event.calendarLabel && ` · ${event.calendarLabel}`}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail modal */}
        {selectedDay && renderModal(selectedDay, events, setSelectedDay)}
      </>
    );
  }

  // Month view
  return (
    <>
      <div
        style={styles.monthContainer}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{
          ...styles.grid,
          gridTemplateColumns: 'repeat(7, 1fr)',
        }}>
          {weekdays.map(day => (
            <div key={day + Math.random()} style={styles.weekdayHeader}>{day}</div>
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
                  ...(isMobile ? styles.dayCellMobile : {}),
                  ...(!isCurrentMonth ? styles.dayCellOther : {}),
                  ...(today ? styles.dayCellToday : {}),
                }}
                onClick={() => setSelectedDay(day)}
              >
                <div style={{
                  ...styles.dayNumber,
                  ...(isMobile ? styles.dayNumberMobile : {}),
                  ...(today ? styles.dayNumberToday : {}),
                }}>
                  {format(day, 'd')}
                </div>
                <div style={styles.eventsContainer}>
                  {dayEvents.slice(0, maxVisible).map((event) => (
                    <div
                      key={event.id}
                      style={{
                        ...styles.eventChip,
                        ...(isMobile ? styles.eventChipMobile : {}),
                        ...getChipStyle(event.person?.color),
                      }}
                    >
                      {isMobile ? '' : event.title}
                    </div>
                  ))}
                  {dayEvents.length > maxVisible && (
                    <div style={styles.moreText}>+{dayEvents.length - maxVisible}</div>
                  )}
                  {/* Mobile: show dots instead of chips when many events */}
                  {isMobile && dayEvents.length > 0 && dayEvents.length <= maxVisible && (
                    <div style={styles.mobileDots}>
                      {dayEvents.map((e, j) => (
                        <div key={j} style={{
                          width: '4px', height: '4px', borderRadius: '50%',
                          background: `var(--${e.person?.color || 'accent-1'})`,
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && renderModal(selectedDay, events, setSelectedDay)}
    </>
  );
}

function renderModal(selectedDay, events, setSelectedDay) {
  const dayEvents = getEventsForDay(events, selectedDay);

  return (
    <div style={styles.overlay} onClick={() => setSelectedDay(null)}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalDate}>
          {format(selectedDay, 'EEEE, MMMM d')}
          {isToday(selectedDay) && <span style={{ color: 'var(--today-ring)', marginLeft: '8px', fontSize: '0.8rem' }}>Today</span>}
        </div>
        {dayEvents.length === 0 ? (
          <div style={styles.noEvents}>No events scheduled</div>
        ) : (
          dayEvents.map(event => {
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
                <div style={{ ...styles.modalEventTitle, color: `var(--${c})` }}>
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
        <button style={styles.closeBtn} onClick={() => setSelectedDay(null)}>Close</button>
      </div>
    </div>
  );
}

const styles = {
  // Month view
  monthContainer: {
    touchAction: 'pan-y',
    userSelect: 'none',
  },
  grid: {
    display: 'grid',
    gap: '1px',
    background: 'var(--border-subtle)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    border: '1px solid var(--border-subtle)',
  },
  weekdayHeader: {
    padding: '10px 4px',
    textAlign: 'center',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    background: 'var(--bg-card)',
  },
  dayCell: {
    minHeight: '100px',
    padding: '6px',
    background: 'var(--bg-card)',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    display: 'flex',
    flexDirection: 'column',
  },
  dayCellMobile: {
    minHeight: '60px',
    padding: '4px',
  },
  dayCellOther: { opacity: 0.3 },
  dayCellToday: { background: 'var(--today-bg)' },
  dayNumber: {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: '3px',
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
  },
  dayNumberMobile: {
    fontSize: '0.75rem',
    width: '22px',
    height: '22px',
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
    gap: '1px',
    flex: 1,
    overflow: 'hidden',
  },
  eventChip: {
    padding: '1px 5px',
    borderRadius: 'var(--radius-xs)',
    fontSize: '0.65rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1.5,
  },
  eventChipMobile: {
    padding: '1px 3px',
    fontSize: '0.6rem',
    height: '4px',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  mobileDots: {
    display: 'flex',
    gap: '3px',
    marginTop: '2px',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: '0.6rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    fontWeight: 500,
  },

  // Week view
  weekContainer: {
    touchAction: 'pan-y',
    userSelect: 'none',
  },
  weekHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    marginBottom: '16px',
  },
  weekHeaderDay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 4px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background 0.15s',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
  },
  weekHeaderDayToday: {
    background: 'var(--today-bg)',
    borderColor: 'var(--today-ring)',
  },
  weekDayName: {
    fontSize: '0.65rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '2px',
  },
  weekDayNum: {
    fontSize: '1.1rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  weekDayNumToday: {
    color: 'var(--today-ring)',
    fontWeight: 700,
  },
  weekDotRow: {
    display: 'flex',
    gap: '3px',
    marginTop: '4px',
  },
  weekDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
  },
  weekBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  weekDaySection: {
    padding: '8px 0',
  },
  weekDayLabel: {
    fontSize: '0.8rem',
    marginBottom: '6px',
    paddingLeft: '4px',
  },
  weekEvent: {
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '4px',
    cursor: 'pointer',
    borderLeftStyle: 'solid',
  },
  weekEventTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  weekEventMeta: {
    fontSize: '0.7rem',
    opacity: 0.7,
    marginTop: '2px',
  },
  noEventsSmall: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    paddingLeft: '4px',
  },

  // Modal
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
    padding: '20px',
    maxWidth: '420px',
    width: '92%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: 'var(--shadow-soft)',
  },
  modalDate: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    fontWeight: 500,
    marginBottom: '14px',
  },
  modalEvent: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  modalEventTitle: { fontWeight: 600, fontSize: '0.9rem' },
  modalEventTime: { fontSize: '0.8rem', opacity: 0.7 },
  modalEventDesc: { fontSize: '0.75rem', opacity: 0.6, fontStyle: 'italic' },
  modalEventPerson: { fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' },
  closeBtn: {
    marginTop: '10px',
    padding: '8px 20px',
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-body)',
    width: '100%',
  },
  noEvents: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
};
