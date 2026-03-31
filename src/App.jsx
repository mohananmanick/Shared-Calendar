import React, { useState, useEffect, useCallback } from 'react';
import CalendarHeader from './components/CalendarHeader';
import CalendarGrid from './components/CalendarGrid';
import Sidebar from './components/Sidebar';
import { addMonths, subMonths, addWeeks, subWeeks } from './utils/dateUtils';
import { demoEvents, PERSON_1, PERSON_2 } from './utils/demoEvents';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = e => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState(demoEvents);
  const [isConnected, setIsConnected] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Default to week view on mobile, month on desktop
  const [viewMode, setViewMode] = useState(isMobile ? 'week' : 'month');

  // Update view mode when screen size changes
  useEffect(() => {
    setViewMode(isMobile ? 'week' : 'month');
  }, [isMobile]);

  const persons = [PERSON_1, PERSON_2];

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        if (data.events && data.events.length > 0) {
          setEvents(data.events);
          setIsConnected(true);
        }
        if (data.calendars) {
          setCalendars(data.calendars);
        }
      }
    } catch (err) {
      console.log('Using demo events (API not connected)');
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 60000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const goNext = () => {
    if (viewMode === 'week') setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addMonths(d, 1));
  };

  const goPrev = () => {
    if (viewMode === 'week') setCurrentDate(d => subWeeks(d, 1));
    else setCurrentDate(d => subMonths(d, 1));
  };

  const goToday = () => setCurrentDate(new Date());

  return (
    <div style={styles.container}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>📅</div>
          <span style={{ fontSize: isMobile ? '0.95rem' : '1.1rem' }}>Our Calendar</span>
        </div>
        <div style={{
          ...styles.connectionBadge,
          ...(isConnected ? styles.connected : styles.demo),
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: isConnected ? '#4ade80' : '#ffd93d',
          }}></span>
          {isConnected ? 'Live' : 'Demo'}
        </div>
      </div>

      {/* Header */}
      <CalendarHeader
        currentDate={currentDate}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        isConnected={isConnected}
        viewMode={viewMode}
        onViewChange={setViewMode}
      />

      {/* Main layout */}
      <div style={{
        ...styles.layout,
        ...(isMobile ? { gridTemplateColumns: '1fr', gap: '16px' } : {}),
      }}>
        <div style={styles.mainCol}>
          <CalendarGrid
            currentDate={currentDate}
            events={events}
            viewMode={viewMode}
            onSwipeLeft={goNext}
            onSwipeRight={goPrev}
            isMobile={isMobile}
          />
        </div>
        <Sidebar
          events={events}
          persons={persons}
          calendars={calendars}
          telegramBotUrl={null}
        />
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px 48px',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid var(--border-subtle)',
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
  },
  connectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 10px',
    borderRadius: 'var(--radius-xs)',
    fontSize: '0.7rem',
    fontWeight: 500,
  },
  connected: {
    background: 'rgba(74, 222, 128, 0.1)',
    color: '#4ade80',
    border: '1px solid rgba(74, 222, 128, 0.2)',
  },
  demo: {
    background: 'rgba(255, 217, 61, 0.1)',
    color: '#ffd93d',
    border: '1px solid rgba(255, 217, 61, 0.2)',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 260px',
    gap: '20px',
    alignItems: 'start',
  },
  mainCol: {
    minWidth: 0,
  },
};
