// /api/auth/callback.js — Handles Google OAuth callback
// Exchanges authorization code for access + refresh tokens

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, VERCEL_URL } = process.env;
  const redirectUri = `https://${VERCEL_URL}/api/auth/callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      return res.status(400).json({ error: tokens.error_description || tokens.error });
    }

    // In production, you'd store the refresh_token securely
    // For now, display the tokens so you can add them as env vars
    return res.status(200).json({
      message: 'Success! Copy these tokens to your Vercel environment variables.',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      instructions: [
        'Add GOOGLE_ACCESS_TOKEN to your Vercel env vars',
        'Add GOOGLE_REFRESH_TOKEN for automatic renewal',
        'The access token expires in ~1 hour',
        'The refresh token is used to get new access tokens automatically',
      ],
    });
  } catch (error) {
    console.error('OAuth error:', error);
    return res.status(500).json({ error: 'OAuth exchange failed' });
  }
}
