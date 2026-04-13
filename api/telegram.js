// /api/telegram.js — Full-featured calendar Telegram bot
// Supports: add, delete, modify, reschedule, list events
// Uses Claude AI to understand natural language for all operations

let cachedToken = null;
let tokenExpiry = 0;

async function getValidToken() {
  const { GOOGLE_ACCESS_TOKEN, GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

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
        tokenExpiry = Date.now() + ((tokens.expires_in - 300) * 1000);
        return cachedToken;
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
    }
  }
  return GOOGLE_ACCESS_TOKEN;
}

const TIMEZONE = 'Asia/Singapore';

// ---- Google Calendar API helpers ----

async function listEvents(token, calendarId, timeMin, timeMax) {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
    `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=50`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

async function createEvent(token, calendarId, eventBody) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    console.error('Create event error:', err);
    return null;
  }
  return await res.json();
}

async function deleteEvent(token, calendarId, eventId) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.ok || res.status === 204;
}

async function updateEvent(token, calendarId, eventId, updates) {
  // First get the existing event
  const getRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!getRes.ok) return null;
  const existing = await getRes.json();

  // Merge updates
  const updated = { ...existing, ...updates };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    console.error('Update event error:', err);
    return null;
  }
  return await res.json();
}

async function searchEvents(token, calendarId, query, daysAhead = 30) {
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const timeMax = new Date(now.getTime() + daysAhead * 86400000).toISOString();
  const events = await listEvents(token, calendarId, timeMin, timeMax);
  if (!query) return events;
  const q = query.toLowerCase();
  return events.filter(e => (e.summary || '').toLowerCase().includes(q));
}

// ---- User → calendar routing ----

function getCalendarForUser(userId) {
  const calendarId = process.env[`TELEGRAM_USER_${userId}_CALENDAR`];
  if (!calendarId) {
    console.warn(`[telegram] No calendar mapped for user ${userId}, falling back to CALENDAR_ID_1`);
    return process.env.CALENDAR_ID_1;
  }
  return calendarId;
}

// ---- Formatting helpers ----

function formatEventForTelegram(event, index) {
  const title = event.summary || 'Untitled';
  const isAllDay = !!event.start?.date;
  let timeStr;
  if (isAllDay) {
    timeStr = event.start.date;
  } else {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    const dateStr = start.toLocaleDateString('en-SG', { weekday: 'short', month: 'short', day: 'numeric' });
    const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TIMEZONE });
    const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TIMEZONE });
    timeStr = `${dateStr}, ${startTime} - ${endTime}`;
  }
  const prefix = index !== undefined ? `${index + 1}. ` : '';
  return `${prefix}📌 ${title}\n   🕐 ${timeStr}`;
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  return { start, end };
}

function getTomorrowRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59).toISOString();
  return { start, end };
}

function getWeekRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end = new Date(now.getTime() + 7 * 86400000).toISOString();
  return { start, end };
}

// ---- Claude AI intent parser ----

async function parseUserIntent(text, apiKey, existingEvents) {
  const now = new Date();

  // Build a list of upcoming events for context
  const eventList = existingEvents.map((e, i) => {
    const title = e.summary || 'Untitled';
    const time = e.start?.dateTime || e.start?.date || '';
    return `${i + 1}. "${title}" at ${time} (id: ${e.id})`;
  }).join('\n');

  const systemPrompt = `You are a calendar assistant that parses natural language into structured actions.
Current date/time: ${now.toISOString()} (timezone: ${TIMEZONE})

Here are the user's upcoming events (next 30 days):
${eventList || '(no events)'}

Parse the user's message into ONE of these actions. Respond ONLY with a JSON object, no markdown:

1. ADD a new event:
{"action": "add", "title": "event title", "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "description": "", "allDay": false}

2. DELETE an event:
{"action": "delete", "eventId": "the event id from the list", "title": "event name for confirmation"}

3. MODIFY an event (change title, time, date, description, or any combination):
{"action": "modify", "eventId": "the event id", "title": "current title", "changes": {"summary": "new title", "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "description": "new desc"}}
Only include fields in "changes" that the user wants to change. Omit unchanged fields.

4. RESCHEDULE / PUSH an event to a different day/time:
{"action": "modify", "eventId": "the event id", "title": "event title", "changes": {"date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM"}}

5. LIST events for a time period:
{"action": "list", "period": "today" | "tomorrow" | "week" | "date", "date": "YYYY-MM-DD"}

6. SEARCH for events by keyword:
{"action": "search", "query": "search term"}

If the user says something like "move X to tomorrow" or "push X to Friday", that's a MODIFY with new date.
If the user says "cancel X" or "remove X", that's a DELETE.
If the user says "rename X to Y", that's a MODIFY with new summary.
If the user says "change X from 3pm to 5pm", that's a MODIFY with new times.
If you cannot determine the intent, respond: {"action": "unknown", "message": "explanation"}

IMPORTANT: When matching events, be flexible with titles. "dentist" should match "Dentist appointment". Use the event list to find the closest match.`;

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: text }],
    }),
  });

  const data = await claudeRes.json();
  try {
    return JSON.parse(data.content[0].text);
  } catch {
    return { action: 'unknown', message: 'Could not parse response' };
  }
}

// ---- Telegram message sender ----

async function sendMsg(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

// ---- Main handler ----

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { TELEGRAM_BOT_TOKEN, ANTHROPIC_API_KEY } = process.env;
  const ALLOWED_USERS = (process.env.ALLOWED_TELEGRAM_USERS || '').split(',').map(s => s.trim());

  const update = req.body;
  const message = update?.message;
  if (!message?.text) return res.status(200).json({ ok: true });

  const chatId = message.chat.id;
  const userId = String(message.from.id);
  const text = message.text.trim();
  const calendarId = getCalendarForUser(userId);

  // Auth check
  if (ALLOWED_USERS.length > 0 && ALLOWED_USERS[0] !== '' && !ALLOWED_USERS.includes(userId)) {
    await sendMsg(TELEGRAM_BOT_TOKEN, chatId, '⛔ Sorry, you are not authorized to use this bot.');
    return res.status(200).json({ ok: true });
  }

  // Commands
  if (text === '/start') {
    await sendMsg(TELEGRAM_BOT_TOKEN, chatId,
      `👋 Hi! I'm your calendar bot.\n\n` +
      `I can do everything with your calendar:\n\n` +
      `📝 <b>Add events</b>\n"Lunch with Alex tomorrow at 1pm"\n\n` +
      `🗑 <b>Delete events</b>\n"Cancel the dentist appointment"\n"Delete lunch tomorrow"\n\n` +
      `✏️ <b>Modify events</b>\n"Rename team meeting to sprint review"\n"Change dinner to 8pm"\n\n` +
      `📅 <b>Reschedule events</b>\n"Move gym to Friday"\n"Push dentist to next week"\n\n` +
      `📋 <b>View events</b>\n"What's on today?"\n"Show me this week"\n"What do I have on Friday?"\n\n` +
      `🔍 <b>Search events</b>\n"Find all meetings"\n"Search for dinner"\n\n` +
      `Just type naturally — I'll figure out what you want!`
    );
    return res.status(200).json({ ok: true });
  }

  if (text === '/help') {
    await sendMsg(TELEGRAM_BOT_TOKEN, chatId,
      `📖 <b>Commands:</b>\n` +
      `/start — Welcome & examples\n` +
      `/today — Today's events\n` +
      `/tomorrow — Tomorrow's events\n` +
      `/week — This week's events\n` +
      `/help — This help\n\n` +
      `Or just type naturally!\n` +
      `"Add dinner Friday 7pm"\n` +
      `"Cancel yoga class"\n` +
      `"Move meeting to 3pm"\n` +
      `"What's on this week?"`
    );
    return res.status(200).json({ ok: true });
  }

  // Quick commands for listing
  if (text === '/today') {
    const token = await getValidToken();
    const { start, end } = getTodayRange();
    const events = await listEvents(token, calendarId, start, end);
    if (events.length === 0) {
      await sendMsg(TELEGRAM_BOT_TOKEN, chatId, '📅 No events today! Enjoy your free day.');
    } else {
      const list = events.map((e, i) => formatEventForTelegram(e, i)).join('\n\n');
      await sendMsg(TELEGRAM_BOT_TOKEN, chatId, `📅 <b>Today's events:</b>\n\n${list}`);
    }
    return res.status(200).json({ ok: true });
  }

  if (text === '/tomorrow') {
    const token = await getValidToken();
    const { start, end } = getTomorrowRange();
    const events = await listEvents(token, calendarId, start, end);
    if (events.length === 0) {
      await sendMsg(TELEGRAM_BOT_TOKEN, chatId, '📅 Nothing scheduled for tomorrow.');
    } else {
      const list = events.map((e, i) => formatEventForTelegram(e, i)).join('\n\n');
      await sendMsg(TELEGRAM_BOT_TOKEN, chatId, `📅 <b>Tomorrow's events:</b>\n\n${list}`);
    }
    return res.status(200).json({ ok: true });
  }

  if (text === '/week') {
    const token = await getValidToken();
    const { start, end } = getWeekRange();
    const events = await listEvents(token, calendarId, start, end);
    if (events.length === 0) {
      await sendMsg(TELEGRAM_BOT_TOKEN, chatId, '📅 Nothing scheduled this week.');
    } else {
      const list = events.map((e, i) => formatEventForTelegram(e, i)).join('\n\n');
      await sendMsg(TELEGRAM_BOT_TOKEN, chatId, `📅 <b>This week:</b>\n\n${list}`);
    }
    return res.status(200).json({ ok: true });
  }

  // ---- Natural language processing ----
  try {
    await sendMsg(TELEGRAM_BOT_TOKEN, chatId, '🔄 Processing...');

    const token = await getValidToken();

    // Get upcoming events for context (so Claude can match event names)
    const upcoming = await searchEvents(token, calendarId, null, 60);
    const intent = await parseUserIntent(text, ANTHROPIC_API_KEY, upcoming);

    // ---- HANDLE ACTIONS ----

    if (intent.action === 'add') {
      let eventBody;
      if (intent.allDay) {
        eventBody = {
          summary: intent.title,
          description: intent.description || `Added via Telegram by ${message.from.first_name}`,
          start: { date: intent.date },
          end: { date: intent.date },
        };
      } else {
        eventBody = {
          summary: intent.title,
          description: intent.description || `Added via Telegram by ${message.from.first_name}`,
          start: { dateTime: `${intent.date}T${intent.startTime}:00`, timeZone: TIMEZONE },
          end: { dateTime: `${intent.date}T${intent.endTime}:00`, timeZone: TIMEZONE },
        };
      }

      const created = await createEvent(token, calendarId, eventBody);
      if (created) {
        const timeStr = intent.allDay ? `📅 ${intent.date} (all day)` : `🕐 ${intent.startTime} — ${intent.endTime}`;
        await sendMsg(TELEGRAM_BOT_TOKEN, chatId,
          `✅ Event created!\n\n📌 ${intent.title}\n${timeStr}\n📅 ${intent.date}`
        );
      } else {
        await sendMsg(TELEGRAM_BOT_TOKEN, chatId, '❌ Failed to create event. Please try again.');
      }
    }

    else if (intent.action === 'delete') {
      if (!intent.eventId) {
        await sendMsg(TELEGRAM_BOT_TOKEN, chatId, `🤔 I couldn't find an event matching that. Try /today or /week to see your events.`);
        return res.status(200).json({ ok: true });
      }

      const success = await deleteEvent(token, calendarId, intent.eventId);
      if (success) {
        await sendMsg(TELEGRAM_BOT_TOKEN, chatId, `🗑 Deleted: "${intent.title}"`);
      } else {
        await sendMsg(TELEGRAM_BOT_TOKEN, chatId, '❌ Failed to delete event. It may have already been removed.');
      }
    }

    else if (intent.action === 'modify') {
      if (!intent.eventId) {
        await sendMsg(TELEGRAM_BOT_TOKEN, chatId, `🤔 I couldn't find an event matching that. Try /today or /week to see your events.`);
        return res.status(200).json({ ok: true });
      }

      const changes = intent.changes || {};
      const updates = {};

      if (changes.summary) {
        updates.summary = changes.summary;
      }
      if (changes.description) {
        updates.description = changes.description;
      }

      // Handle date/time changes
      if (changes.date || changes.startTime || changes.endTime) {
        // Get current event to preserve existing times if only date or only time changes
        const getRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${intent.eventId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const current = await getRes.json();

        let currentDate, currentStartTime, currentEndTime;

        if (current.start?.dateTime) {
          const startDt = new Date(current.start.dateTime);
          const endDt = new Date(current.end.dateTime);
          currentDate = startDt.toISOString().split('T')[0];
          currentStartTime = startDt.toTimeString().slice(0, 5);
          currentEndTime = endDt.toTimeString().slice(0, 5);
        } else {
          currentDate = current.start?.date;
          currentStartTime = '09:00';
          currentEndTime = '10:00';
        }

        const newDate = changes.date || currentDate;
        const newStart = changes.startTime || currentStartTime;
        const newEnd = changes.endTime || currentEndTime;

        updates.start = { dateTime: `${newDate}T${newStart}:00`, timeZone: TIMEZONE };
        updates.end = { dateTime: `${newDate}T${newEnd}:00`, timeZone: TIMEZONE };
      }

      const updated = await updateEvent(token, calendarId, intent.eventId, updates);
      if (updated) {
        const changeList = [];
        if (changes.summary) changeList.push(`Title → "${changes.summary}"`);
        if (changes.date) changeList.push(`Date → ${changes.date}`);
        if (changes.startTime) changeList.push(`Start → ${changes.startTime}`);
        if (changes.endTime) changeList.push(`End → ${changes.endTime}`);
        if (changes.description) changeList.push(`Description updated`);

        await sendMsg(TELEGRAM_BOT_TOKEN, chatId,
          `✏️ Updated: "${intent.title}"\n\n${changeList.map(c => `  ✓ ${c}`).join('\n')}`
        );
      } else {
        await sendMsg(TELEGRAM_BOT_TOKEN, chatId, '❌ Failed to update event. Please try again.');
      }
    }

    else if (intent.action === 'list') {
      let timeMin, timeMax, label;

      if (intent.period === 'today') {
        const r = getTodayRange();
        timeMin = r.start; timeMax = r.end; label = "Today's events";
      } else if (intent.period === 'tomorrow') {
        const r = getTomorrowRange();
        timeMin = r.start; timeMax = r.end; label = "Tomorrow's events";
      } else if (intent.period === 'week') {
        const r = getWeekRange();
        timeMin = r.start; timeMax = r.end; label = "This week";
      } else if (intent.period === 'date' && intent.date) {
        const d = new Date(intent.date);
        timeMin = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
        timeMax = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
        label = `Events on ${intent.date}`;
      } else {
        const r = getWeekRange();
        timeMin = r.start; timeMax = r.end; label = "This week";
      }

      const events = await listEvents(token, calendarId, timeMin, timeMax);
      if (events.length === 0) {
        await sendMsg(TELEGRAM_BOT_TOKEN, chatId, `📅 No events for: ${label}`);
      } else {
        const list = events.map((e, i) => formatEventForTelegram(e, i)).join('\n\n');
        await sendMsg(TELEGRAM_BOT_TOKEN, chatId, `📅 <b>${label}:</b>\n\n${list}`);
      }
    }

    else if (intent.action === 'search') {
      const results = await searchEvents(token, calendarId, intent.query, 60);
      if (results.length === 0) {
        await sendMsg(TELEGRAM_BOT_TOKEN, chatId, `🔍 No events found matching "${intent.query}"`);
      } else {
        const list = results.map((e, i) => formatEventForTelegram(e, i)).join('\n\n');
        await sendMsg(TELEGRAM_BOT_TOKEN, chatId, `🔍 <b>Found ${results.length} event(s) for "${intent.query}":</b>\n\n${list}`);
      }
    }

    else {
      await sendMsg(TELEGRAM_BOT_TOKEN, chatId,
        `🤔 ${intent.message || "I'm not sure what you want to do."}\n\nTry:\n` +
        `• "Add dinner Friday 7pm"\n` +
        `• "Cancel yoga class"\n` +
        `• "Move meeting to 3pm"\n` +
        `• "What's on today?"\n` +
        `• "Search for lunch"`
      );
    }

  } catch (error) {
    console.error('Bot error:', error);
    await sendMsg(TELEGRAM_BOT_TOKEN, chatId, '❌ Something went wrong. Please try again.');
  }

  return res.status(200).json({ ok: true });
}
