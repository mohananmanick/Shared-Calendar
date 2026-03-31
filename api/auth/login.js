// /api/auth/login.js — Redirects to Google OAuth consent screen

export default async function handler(req, res) {
  const { GOOGLE_CLIENT_ID } = process.env;
  const redirectUri = `${process.env.APP_URL}/api/auth/callback`;

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
