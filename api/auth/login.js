// /api/auth/login.js — Redirects to Google OAuth consent screen

export default async function handler(req, res) {
  const { GOOGLE_CLIENT_ID } = process.env;
  const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!appUrl) {
    return res.status(500).json({ error: 'APP_URL or VERCEL_URL environment variable must be set' });
  }
  const redirectUri = `${appUrl}/api/auth/callback`;

  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ].join(' ');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&access_type=offline` +
    `&prompt=consent`;

  return res.redirect(authUrl);
}
