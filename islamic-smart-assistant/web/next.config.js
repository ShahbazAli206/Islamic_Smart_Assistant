/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  async redirects() {
    return [
      {
        // The route moved from /dashboard/azan to /dashboard/azan-voices after
        // Vercel's build cache persistently dropped the old path from production
        // deployments (404) even though local builds emitted it. A fresh route
        // key can't collide with any stale cached artifact; this redirect keeps
        // old links and bookmarks working.
        source: '/dashboard/azan',
        destination: '/dashboard/azan-voices',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        // Ensure .m4a files are served as audio/mp4 — some mime-db versions map
        // .m4a to audio/x-m4a which Chromium rejects, causing silent azan failures.
        source: '/audio/:path*.m4a',
        headers: [{ key: 'Content-Type', value: 'audio/mp4' }],
      },
    ];
  },
};
