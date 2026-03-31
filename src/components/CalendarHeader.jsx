import React from 'react';
import { format, isSameMonth } from '../utils/dateUtils';

const s = {
  header: {
    padding: '16px 0 12px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  month: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.8rem',
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
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  btn: {
    width: '36px',
    height: '36px',
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
    padding: '6px 12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    transition: 'all 0.2s ease',
    marginRight: '4px',
  },
  bottomRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabs: {
    display: 'flex',
    background: 'var(--bg-elevated)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    overflow: 'hidden',
  },
  tab: {
    padding: '6px 16px',
    fontSize: '0.75rem',
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    letterSpacing: '0.03em',
    color: 'var(--text-muted)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    background: 'var(--bg-hover)',
    color: 'var(--text-primary)',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  statusDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: '#4ade80',
    animation: 'pulse 2s infinite',
  },
};

export default function CalendarHeader({ currentDate, onPrev, onNext, onToday, isConnected, viewMode, onViewChange }) {
  return (
    <div style={s.header}>
      <div style={s.topRow}>
        <div style={s.titleGroup}>
          <div style={s.month}>{format(currentDate, 'MMMM')}</div>
          <div style={s.year}>{format(currentDate, 'yyyy')}</div>
        </div>
        <div style={s.nav}>
          <button style={s.todayBtn} onClick={onToday}>Today</button>
          <button style={s.btn} onClick={onPrev}>‹</button>
          <button style={s.btn} onClick={onNext}>›</button>
        </div>
      </div>
      <div style={s.bottomRow}>
        <div style={s.tabs}>
          {['week', 'month'].map(mode => (
            <button
              key={mode}
              style={{ ...s.tab, ...(viewMode === mode ? s.tabActive : {}) }}
              onClick={() => onViewChange(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        {isConnected && (
          <div style={s.status}>
            <span style={s.statusDot}></span>
            Synced
          </div>
        )}
      </div>
    </div>
  );
}
