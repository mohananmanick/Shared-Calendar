import React from 'react';
import { format } from '../utils/dateUtils';

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '32px 0 24px',
  },
  titleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  month: {
    fontFamily: 'var(--font-display)',
    fontSize: '2.4rem',
    fontWeight: 500,
    letterSpacing: '-0.02em',
    color: 'var(--text-primary)',
    lineHeight: 1.1,
  },
  year: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.85rem',
    fontWeight: 400,
    color: 'var(--text-muted)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  btn: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '1.1rem',
    transition: 'all 0.2s ease',
  },
  todayBtn: {
    padding: '8px 16px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    transition: 'all 0.2s ease',
    marginRight: '8px',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#4ade80',
    animation: 'pulse 2s infinite',
  },
};

export default function CalendarHeader({ currentDate, onPrev, onNext, onToday, isConnected }) {
  return (
    <div style={styles.header}>
      <div style={styles.titleGroup}>
        <div style={styles.month}>{format(currentDate, 'MMMM')}</div>
        <div style={styles.year}>{format(currentDate, 'yyyy')}</div>
        {isConnected && (
          <div style={styles.status}>
            <span style={styles.dot}></span>
            Synced with Google Calendar
          </div>
        )}
      </div>
      <div style={styles.nav}>
        <button
          style={styles.todayBtn}
          onClick={onToday}
          onMouseOver={e => { e.target.style.background = 'var(--bg-hover)'; e.target.style.color = 'var(--text-primary)'; }}
          onMouseOut={e => { e.target.style.background = 'var(--bg-elevated)'; e.target.style.color = 'var(--text-secondary)'; }}
        >
          Today
        </button>
        <button
          style={styles.btn}
          onClick={onPrev}
          onMouseOver={e => { e.target.style.background = 'var(--bg-hover)'; e.target.style.color = 'var(--text-primary)'; }}
          onMouseOut={e => { e.target.style.background = 'var(--bg-elevated)'; e.target.style.color = 'var(--text-secondary)'; }}
        >
          ‹
        </button>
        <button
          style={styles.btn}
          onClick={onNext}
          onMouseOver={e => { e.target.style.background = 'var(--bg-hover)'; e.target.style.color = 'var(--text-primary)'; }}
          onMouseOut={e => { e.target.style.background = 'var(--bg-elevated)'; e.target.style.color = 'var(--text-secondary)'; }}
        >
          ›
        </button>
      </div>
    </div>
  );
}
