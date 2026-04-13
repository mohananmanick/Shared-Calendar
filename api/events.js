// /api/events.js — Vercel serverless function
// Fetches events from Google Calendar with auto token refresh

// In-memory token cache (persists across warm invocations on same Vercel instance)
let cachedToken = null;
let tokenExpiry = 0;

async function getValidToken() {
  const { GOOGLE_ACCESS_TOKEN, GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

  // If we have a cached token that hasn't expired, use it
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // Try to refresh using the refresh token
  if (GOOGLE_REFRESH_TOKEN && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: GOOGLE_REFRESH_TOKEN,
          grant_type: 'refresh_token',
        }),
      });

      const tokens = await tokenRes.json();

      if (tokens.access_token) {
        cachedToken = tokens.access_token;
        // Expire 5 minutes early to avoid edge cases
        tokenExpiry = Date.now() + ((tokens.expires_in - 300) * 1000);
        return cachedToken;
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
    }
  }

  // Fallback to the env var token
  return GOOGLE_ACCESS_TOKEN;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const {
    GOOGLE_ACCESS_TOKEN, CALENDAR_ID_1, PERSON_1_NAME, PERSON_2_NAME,
    CALENDAR_ID_2_MAIN, CALENDAR_ID_2_SOCIAL, CALENDAR_ID_2_WORK, CALENDAR_ID_2_CCA,
  } = process.env;

  if (!GOOGLE_ACCESS_TOKEN && !process.env.GOOGLE_REFRESH_TOKEN) {
    return res.status(200).json({
      events: [],
      calendars: [],
      message: 'Google Calendar not connected.',
    });
  }

  const person1Calendars = [
    { id: CALENDAR_ID_1, label: 'Mohan', color: 'accent-1', person: PERSON_1_NAME || 'Mohan' },
  ];

  // IDs are read from env vars — calendars with no ID set are silently skipped
  const person2Calendars = [
    { id: CALENDAR_ID_2_MAIN,   label: 'Main',        color: 'accent-2', person: PERSON_2_NAME || 'Shreya' },
    { id: CALENDAR_ID_2_SOCIAL, label: 'Socialising', color: 'accent-3', person: PERSON_2_NAME || 'Shreya' },
    { id: CALENDAR_ID_2_WORK,   label: 'Work',        color: 'accent-4', person: PERSON_2_NAME || 'Shreya' },
    { id: CALENDAR_ID_2_CCA,    label: 'CCA',         color: 'accent-5', person: PERSON_2_NAME || 'Shreya' },
  ];

  const allCalendars = [...person1Calendars, ...person2Calendars];

  try {
    const accessToken = await getValidToken();
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

    const fetchCalendar = async (cal, token, isRetry = false) => {
      if (!cal.id) return [];

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?` +
        `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // If token expired (401), force refresh and retry once
      if (response.status === 401 && !isRetry) {
        cachedToken = null;
        tokenExpiry = 0;
        const newToken = await getValidToken();
        return fetchCalendar(cal, newToken, true);
      }

      if (!response.ok) {
        console.error(`Calendar API error for ${cal.label} (${cal.id}):`, response.status);
        return [];
      }

      const data = await response.json();
      return (data.items || []).map(item => ({
        id: item.id,
        title: item.summary || 'Untitled',
        start: item.start?.dateTime || item.start?.date || '',
        end: item.end?.dateTime || item.end?.date || '',
        description: item.description || '',
        person: { name: cal.person, color: cal.color },
        calendarLabel: cal.label,
      }));
    };

    const results = await Promise.all(allCalendars.map(cal => fetchCalendar(cal, accessToken)));
    const allEvents = results.flat().sort((a, b) => new Date(a.start) - new Date(b.start));

    const calendarMeta = allCalendars.map(c => ({
      label: c.label,
      color: c.color,
      person: c.person,
    }));

    return res.status(200).json({ events: allEvents, calendars: calendarMeta });
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}
