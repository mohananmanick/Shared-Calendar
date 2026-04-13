# 📅 Our Calendar — Shared Calendar with Telegram Bot

A live shared calendar website that syncs with Google Calendar and lets you add events via an AI-powered Telegram bot.

## Architecture

```
Google Calendar ──→ Vercel API ──→ React Frontend (live sync every 60s)
                        ↑
Telegram Bot ──→ Claude AI (parse) ──→ Google Calendar API (create event)
```

## Quick Setup (4 Steps)

### Step 1: Deploy to Vercel

```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
gh repo create shared-calendar --public --push

# Deploy
npx vercel --prod
```

Note your Vercel URL (e.g., `shared-calendar-xxx.vercel.app`).

### Step 2: Configure Google OAuth

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://YOUR-VERCEL-URL.vercel.app/api/auth/callback
   ```
4. Save

5. Go to **OAuth consent screen → Test users** and add both Gmail accounts.

6. Visit `https://YOUR-VERCEL-URL.vercel.app/api/auth/login` in your browser
7. Sign in with your Google account and grant calendar access
8. You'll see your `access_token` and `refresh_token` — copy them

9. In Vercel dashboard → Settings → Environment Variables, add:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_ACCESS_TOKEN` (from step 8)
   - `GOOGLE_REFRESH_TOKEN` (from step 8)
   - `CALENDAR_ID_1` (your Gmail)
   - `CALENDAR_ID_2` (partner's Gmail)
   - `PERSON_1_NAME` (e.g., "MK")
   - `PERSON_2_NAME` (e.g., "Partner")

10. Redeploy: `npx vercel --prod`

### Step 3: Set Up Telegram Bot

1. Open Telegram → search **@BotFather** → send `/newbot`
2. Follow prompts to name your bot
3. Copy the **Bot Token**
4. Add `TELEGRAM_BOT_TOKEN` to Vercel env vars

5. Set the webhook (run this in terminal):
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://YOUR-VERCEL-URL.vercel.app/api/telegram"
   ```

6. Optional: Get your Telegram user ID by messaging **@userinfobot**, then add it to `ALLOWED_TELEGRAM_USERS` env var for security.

### Step 4: Add Anthropic API Key

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Add `ANTHROPIC_API_KEY` to Vercel env vars
3. Redeploy: `npx vercel --prod`

## Usage

### Website
- Visit your Vercel URL to see the calendar
- Click any day to see event details
- Navigate months with the arrows
- Events are color-coded by person

### Telegram Bot
Send natural language messages to create events:
- "Lunch with Alex tomorrow at 1pm"
- "Dentist on Friday 3pm-4pm"
- "Team meeting next Monday 10am"
- "Birthday party Saturday all day"

Commands:
- `/start` — Welcome message
- `/help` — Help
- `/today` — See today's events

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_URL` | Recommended | Your deployed URL (e.g., `https://shared-calendar-delta.vercel.app`). Must match the redirect URI in Google Cloud Console. Falls back to `VERCEL_URL` if unset. |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_ACCESS_TOKEN` | Yes | OAuth access token |
| `GOOGLE_REFRESH_TOKEN` | Yes | OAuth refresh token (for auto-renewal) |
| `CALENDAR_ID_1` | Yes | Your (person 1) primary Google Calendar ID — default write target for the bot |
| `CALENDAR_ID_2_MAIN` | No | Partner's main calendar ID (Gmail address) |
| `CALENDAR_ID_2_SOCIAL` | No | Partner's Socialising calendar ID |
| `CALENDAR_ID_2_WORK` | No | Partner's Work calendar ID |
| `CALENDAR_ID_2_CCA` | No | Partner's CCA calendar ID |
| `PERSON_1_NAME` | No | Display name for person 1 |
| `PERSON_2_NAME` | No | Display name for person 2 |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram bot token from BotFather |
| `ANTHROPIC_API_KEY` | Yes | For AI event parsing |
| `ALLOWED_TELEGRAM_USERS` | No | Comma-separated Telegram user IDs allowed to use the bot |
| `TELEGRAM_USER_<id>_CALENDAR` | No | Maps a Telegram user ID to their calendar. E.g. `TELEGRAM_USER_123456_CALENDAR=you@gmail.com`. Falls back to `CALENDAR_ID_1` if unset. |

## Token Refresh

Google access tokens expire after 1 hour. To refresh:
- Call `GET /api/auth/refresh` — returns a new access token
- For a production setup, you'd want a cron job or middleware that auto-refreshes

## Tech Stack
- **Frontend**: React + Vite + date-fns
- **Backend**: Vercel Serverless Functions
- **Calendar**: Google Calendar API
- **Bot**: Telegram Bot API + Claude AI
- **Hosting**: Vercel
