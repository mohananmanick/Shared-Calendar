import React, { useState, useEffect, useCallback } from 'react';
import CalendarHeader from './components/CalendarHeader';
import CalendarGrid from './components/CalendarGrid';
import Sidebar from './components/Sidebar';
import { addMonths, subMonths } from './utils/dateUtils';
import { demoEvents, PERSON_1, PERSON_2 } from './utils/demoEvents';

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px 48px',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 0',
    borderBottom: '1px solid var(--border-subtle)',
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
  },
  connectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: 'var(--radius-xs)',
    fontSize: '0.75rem',
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
    gridTemplateColumns: '1fr 280px',
    gap: '24px',
    alignItems: 'start',
  },
  mainCol: {
    minWidth: 0,
  },
  // Responsive
  '@media (max-width: 900px)': {
    layout: {
      gridTemplateColumns: '1fr',
    },
  },
};

// Responsive layout helper
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
  const isMobile = useMediaQuery('(max-width: 900px)');

  const persons = [PERSON_1, PERSON_2];

  // Fetch events from API (when Google Calendar is connected)
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        if (data.events && data.events.length > 0) {
          setEvents(data.events);
          setIsConnected(true);
        }
      }
    } catch (err) {
      // API not available, use demo events
      console.log('Using demo events (API not connected)');
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    // Poll every 60 seconds for live sync
    const interval = setInterval(fetchEvents, 60000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  return (
    <div style={styles.container}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>📅</div>
          Our Calendar
        </div>
        <div style={{
          ...styles.connectionBadge,
          ...(isConnected ? styles.connected : styles.demo),
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isConnected ? '#4ade80' : '#ffd93d',
          }}></span>
          {isConnected ? 'Live' : 'Demo Mode'}
        </div>
      </div>

      {/* Header with month nav */}
      <CalendarHeader
        currentDate={currentDate}
        onPrev={() => setCurrentDate(d => subMonths(d, 1))}
        onNext={() => setCurrentDate(d => addMonths(d, 1))}
        onToday={() => setCurrentDate(new Date())}
        isConnected={isConnected}
      />

      {/* Main layout */}
      <div style={{
        ...styles.layout,
        ...(isMobile ? { gridTemplateColumns: '1fr' } : {}),
      }}>
        <div style={styles.mainCol}>
          <CalendarGrid currentDate={currentDate} events={events} />
        </div>
        <Sidebar
          events={events}
          persons={persons}
          telegramBotUrl={null} // Will be set once bot is created
        />
      </div>
    </div>
  );
}
