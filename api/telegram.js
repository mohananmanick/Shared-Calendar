// /api/telegram.js — Telegram bot webhook handler
// Receives messages, uses Claude to parse natural language into calendar events,
// then creates them on Google Calendar. Auto-refreshes tokens.

let cachedToken = null;
let tokenExpiry = 0;

async function getValidToken() {
  const { GOOGLE_ACCESS_TOKEN, GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { TELEGRAM_BOT_TOKEN, ANTHROPIC_API_KEY, CALENDAR_ID_1 } = process.env;
  const ALLOWED_USERS = (process.env.ALLOWED_TELEGRAM_USERS || '').split(',').map(s => s.trim());

  const update = req.body;
  const message = update?.message;

  if (!message?.text) {
    return res.status(200).json({ ok: true });
  }

  const chatId = message.chat.id;
  const userId = String(message.from.id);
  const text = message.text;

  if (ALLOWED_USERS.length > 0 && ALLOWED_USERS[0] !== '' && !ALLOWED_USERS.includes(userId)) {
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, '⛔ Sorry, you are not authorized to use this bot.');
    return res.status(200).json({ ok: true });
  }

  if (text === '/start') {
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId,
      `👋 Hi! I'm your calendar bot.\n\n` +
      `Just tell me about an event in natural language and I'll add it to the calendar.\n\n` +
      `Examples:\n` +
      `• "Lunch with Alex tomorrow at 1pm"\n` +
      `• "Dentist on Friday 3pm-4pm"\n` +
      `• "Team meeting next Monday 10am"\n\n` +
      `I'll parse the details and create the event for you!`
    );
    return res.status(200).json({ ok: true });
  }

  if (text === '/help') {
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId,
      `📖 Commands:\n` +
      `/start — Welcome message\n` +
      `/help — This help\n` +
      `/today — Show today's events\n\n` +
      `Or just type an event description!`
    );
    return res.status(200).json({ ok: true });
  }

  if (text === '/today') {
    try {
      const token = await getValidToken();
      const events = await getTodayEvents(token, CALENDAR_ID_1);
      if (events.length === 0) {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, '📅 No events today!');
      } else {
        const list = events.map(e => {
          const time = e.start?.dateTime
            ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            : 'All day';
          return `• ${time} — ${e.summary}`;
        }).join('\n');
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, `📅 Today's events:\n\n${list}`);
      }
    } catch (err) {
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, '❌ Error fetching events. Is Google Calendar connected?');
    }
    return res.status(200).json({ ok: true });
  }

  // Parse natural language event using Claude
  try {
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, '🔄 Parsing your event...');

    const now = new Date();
    const timezone = 'Asia/Singapore';

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: `You are an event parser. Extract calendar event details from natural language.
Current date/time: ${now.toISOString()} (timezone: ${timezone})
Respond ONLY with a JSON object, no markdown, no explanation:
{
  "title": "event title",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM" (24h format),
  "endTime": "HH:MM" (24h format, default 1hr after start),
  "description": "any extra details or empty string",
  "allDay": false
}
If it's an all-day event, set allDay to true and omit times.
If you cannot parse an event, respond: {"error": "reason"}`,
        messages: [{ role: 'user', content: text }],
      }),
    });

    const claudeData = await claudeRes.json();
    const parsed = JSON.parse(claudeData.content[0].text);

    if (parsed.error) {
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, `🤔 I couldn't parse that: ${parsed.error}\n\nTry something like "Dinner tomorrow at 7pm"`);
      return res.status(200).json({ ok: true });
    }

    // Create Google Calendar event
    const token = await getValidToken();
    const calendarId = CALENDAR_ID_1;
    let eventBody;

    if (parsed.allDay) {
      eventBody = {
        summary: parsed.title,
        description: parsed.description || `Added via Telegram by ${message.from.first_name}`,
        start: { date: parsed.date },
        end: { date: parsed.date },
      };
    } else {
      eventBody = {
        summary: parsed.title,
        description: parsed.description || `Added via Telegram by ${message.from.first_name}`,
        start: {
          dateTime: `${parsed.date}T${parsed.startTime}:00`,
          timeZone: timezone,
        },
        end: {
          dateTime: `${parsed.date}T${parsed.endTime}:00`,
          timeZone: timezone,
        },
      };
    }

    const gcalRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (!gcalRes.ok) {
      const err = await gcalRes.json();
      console.error('Google Calendar error:', err);
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, `❌ Failed to create event. Google Calendar returned an error.`);
      return res.status(200).json({ ok: true });
    }

    const timeStr = parsed.allDay
      ? `📅 ${parsed.date}`
      : `🕐 ${parsed.startTime} — ${parsed.endTime}`;

    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId,
      `✅ Event created!\n\n` +
      `📌 ${parsed.title}\n` +
      `${timeStr}\n` +
      `📅 ${parsed.date}\n\n` +
      `It'll appear on the calendar shortly.`
    );
  } catch (error) {
    console.error('Bot error:', error);
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, `❌ Something went wrong. Please try again.`);
  }

  return res.status(200).json({ ok: true });
}

async function sendTelegramMessage(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

async function getTodayEvents(accessToken, calendarId) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
    `timeMin=${startOfDay}&timeMax=${endOfDay}&singleEvents=true&orderBy=startTime`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  return data.items || [];
}
