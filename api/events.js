// /api/events.js — Vercel serverless function
// Fetches events from Google Calendar for both persons

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { GOOGLE_ACCESS_TOKEN, CALENDAR_ID_1, CALENDAR_ID_2, PERSON_1_NAME, PERSON_2_NAME } = process.env;

  if (!GOOGLE_ACCESS_TOKEN) {
    return res.status(200).json({
      events: [],
      message: 'Google Calendar not connected. Using demo events on frontend.',
    });
  }

  try {
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

    const fetchCalendar = async (calendarId, personName, personColor) => {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
        `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${GOOGLE_ACCESS_TOKEN}` },
      });

      if (!response.ok) {
        console.error(`Calendar API error for ${calendarId}:`, response.status);
        return [];
      }

      const data = await response.json();
      return (data.items || []).map(item => ({
        id: item.id,
        title: item.summary || 'Untitled',
        start: item.start?.dateTime || item.start?.date || '',
        end: item.end?.dateTime || item.end?.date || '',
        description: item.description || '',
        person: { name: personName, color: personColor },
      }));
    };

    const [events1, events2] = await Promise.all([
      CALENDAR_ID_1 ? fetchCalendar(CALENDAR_ID_1, PERSON_1_NAME || 'Person 1', 'accent-1') : [],
      CALENDAR_ID_2 ? fetchCalendar(CALENDAR_ID_2, PERSON_2_NAME || 'Person 2', 'accent-2') : [],
    ]);

    const allEvents = [...events1, ...events2].sort((a, b) =>
      new Date(a.start) - new Date(b.start)
    );

    return res.status(200).json({ events: allEvents });
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}
