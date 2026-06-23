/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
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
