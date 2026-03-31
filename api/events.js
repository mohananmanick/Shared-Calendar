// /api/events.js — Vercel serverless function
// Fetches events from Google Calendar for both persons, including sub-calendars

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { GOOGLE_ACCESS_TOKEN, CALENDAR_ID_1, PERSON_1_NAME, PERSON_2_NAME } = process.env;

  if (!GOOGLE_ACCESS_TOKEN) {
    return res.status(200).json({
      events: [],
      calendars: [],
      message: 'Google Calendar not connected. Using demo events on frontend.',
    });
  }

  // Define all calendars
  // Person 1 (Mohan) - main calendar
  const person1Calendars = [
    { id: CALENDAR_ID_1, label: 'Mohan', color: 'accent-1', person: PERSON_1_NAME || 'Mohan' },
  ];

  // Person 2 (Shreya) - main + sub-calendars, each with a unique color
  const person2Calendars = [
    { id: 'gejashreya@gmail.com', label: 'Main', color: 'accent-2', person: PERSON_2_NAME || 'Shreya' },
    { id: 'dceb8f398265fdef016630832be610b18467c5a410904b021da393f6ed9358d4@group.calendar.google.com', label: 'Socialising', color: 'accent-3', person: PERSON_2_NAME || 'Shreya' },
    { id: '754513285509164f7d82909d4ee317c81088f41dfb3979811f5770a821b26d2e@group.calendar.google.com', label: 'Work', color: 'accent-4', person: PERSON_2_NAME || 'Shreya' },
    { id: 'fd99f09c7f88473421d682b962f03039beb5c229d4ce115bf27f699b7d4f65c0@group.calendar.google.com', label: 'CCA', color: 'accent-5', person: PERSON_2_NAME || 'Shreya' },
  ];

  const allCalendars = [...person1Calendars, ...person2Calendars];

  try {
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

    const fetchCalendar = async (cal) => {
      if (!cal.id) return [];

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?` +
        `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${GOOGLE_ACCESS_TOKEN}` },
      });

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

    const results = await Promise.all(allCalendars.map(fetchCalendar));
    const allEvents = results.flat().sort((a, b) => new Date(a.start) - new Date(b.start));

    // Send calendar metadata for the frontend legend
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
