import React from 'react';
import { getUpcomingEvents, format, parseISO, formatEventTime, isToday, addDays, isSameDay } from '../utils/dateUtils';

const styles = {
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius)',
    padding: '20px',
  },
  cardTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    marginBottom: '16px',
    letterSpacing: '-0.01em',
  },
  legend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  legendName: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  upcomingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  upcomingItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px',
    borderRadius: 'var(--radius-sm)',
    transition: 'background 0.15s ease',
    cursor: 'default',
  },
  timelineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginTop: '5px',
    flexShrink: 0,
  },
  upcomingContent: {
    flex: 1,
    minWidth: 0,
  },
  upcomingTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  upcomingMeta: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  noEvents: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '8px 0',
  },
  telegramCard: {
    background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.08), rgba(255, 107, 107, 0.08))',
    border: '1px solid var(--border)',
  },
  telegramIcon: {
    fontSize: '1.5rem',
    marginBottom: '8px',
  },
  telegramText: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  telegramLink: {
    display: 'inline-block',
    marginTop: '10px',
    padding: '6px 14px',
    background: '#2AABEE',
    color: '#fff',
    borderRadius: 'var(--radius-xs)',
    fontSize: '0.8rem',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  },
};

function getRelativeDay(dateStr) {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (isToday(date)) return 'Today';
  if (isSameDay(date, addDays(new Date(), 1))) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

export default function Sidebar({ events, persons, calendars, telegramBotUrl }) {
  const upcoming = getUpcomingEvents(events, 6);

  // Group calendars by person
  const calsByPerson = {};
  if (calendars && calendars.length > 0) {
    calendars.forEach(c => {
      if (!calsByPerson[c.person]) calsByPerson[c.person] = [];
      calsByPerson[c.person].push(c);
    });
  }

  return (
    <div style={styles.sidebar}>
      {/* Legend */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Calendars</div>
        <div style={styles.legend}>
          {Object.keys(calsByPerson).length > 0 ? (
            Object.entries(calsByPerson).map(([person, cals]) => (
              <div key={person} style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  {person}
                </div>
                {cals.map(c => (
                  <div key={c.label} style={{ ...styles.legendItem, marginBottom: '4px' }}>
                    <div style={{
                      ...styles.legendDot,
                      background: `var(--${c.color})`,
                      boxShadow: `0 0 8px var(--${c.color}-glow)`,
                    }} />
                    <span style={styles.legendName}>{c.label}</span>
                  </div>
                ))}
              </div>
            ))
          ) : (
            persons.map(p => (
              <div key={p.name} style={styles.legendItem}>
                <div style={{
                  ...styles.legendDot,
                  background: `var(--${p.color})`,
                  boxShadow: `0 0 8px var(--${p.color}-glow)`,
                }} />
                <span style={styles.legendName}>{p.name}</span>
              </div>
            ))
          )}
          ))}
        </div>
      </div>

      {/* Upcoming */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Coming Up</div>
        {upcoming.length === 0 ? (
          <div style={styles.noEvents}>No upcoming events</div>
        ) : (
          <div style={styles.upcomingList}>
            {upcoming.map((event, i) => (
              <div
                key={event.id}
                style={{
                  ...styles.upcomingItem,
                  animation: `slideIn 0.3s ease ${i * 60}ms both`,
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  ...styles.timelineDot,
                  background: `var(--${event.person?.color || 'accent-1'})`,
                }} />
                <div style={styles.upcomingContent}>
                  <div style={styles.upcomingTitle}>{event.title}</div>
                  <div style={styles.upcomingMeta}>
                    {getRelativeDay(event.start)} · {formatEventTime(event.start)}
                    {event.person && ` · ${event.person.name}`}
                    {event.calendarLabel && ` · ${event.calendarLabel}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Telegram bot card */}
      <div style={{ ...styles.card, ...styles.telegramCard }}>
        <div style={styles.telegramIcon}>🤖</div>
        <div style={styles.cardTitle}>Add Events via Telegram</div>
        <div style={styles.telegramText}>
          Send a message like "Dinner tomorrow at 7pm" to the bot and it'll add it to the calendar automatically.
        </div>
        {telegramBotUrl && (
          <a
            href={telegramBotUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.telegramLink}
            onMouseOver={e => { e.target.style.opacity = '0.85'; }}
            onMouseOut={e => { e.target.style.opacity = '1'; }}
          >
            Open Telegram Bot →
          </a>
        )}
      </div>
    </div>
  );
}
