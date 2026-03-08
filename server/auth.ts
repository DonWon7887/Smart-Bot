import express from 'express';

const router = express.Router();

// OAuth Configuration
const OAUTH_CONFIG = {
  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
    scope: 'tweet.read users.read',
  },
  tiktok: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    clientId: process.env.TIKTOK_CLIENT_ID,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
    scope: 'video.list',
  },
  instagram: {
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    clientId: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    scope: 'instagram_basic',
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    scope: 'public_profile',
  },
};

router.get('/auth/url/:platform', (req, res) => {
  const platform = req.params.platform as keyof typeof OAUTH_CONFIG;
  const config = OAUTH_CONFIG[platform];

  if (!config) {
    return res.status(400).json({ error: 'Platform not supported' });
  }

  const redirectUri = `${process.env.APP_URL}/auth/callback/${platform}`;
  
  const params = new URLSearchParams({
    client_id: config.clientId!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
    state: Math.random().toString(36).substring(7),
  });

  res.json({ url: `${config.authUrl}?${params.toString()}` });
});

router.get('/auth/callback/:platform', async (req, res) => {
  // Implementation for token exchange would go here
  res.send(`
    <html>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', platform: '${req.params.platform}' }, '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        </script>
        <p>Authentication successful. This window should close automatically.</p>
      </body>
    </html>
  `);
});

export default router;
