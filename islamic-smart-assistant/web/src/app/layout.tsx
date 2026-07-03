// Root layout for the App Router: renders the top-level <html>/<body> shell,
// loads global styles, exposes default <head> metadata, and wraps every route
// in the shared client providers (React Query).
import './globals.css';
import { Providers } from '@/components/Providers';

// Default document metadata (title / description) applied to all pages unless
// a route overrides it.
export const metadata = {
  title: 'ISMAA — Islamic Smart Assistant',
  description: 'Prayer times, Azan, Quran with translation, multi-device sync — all in one beautifully crafted assistant.',
  icons: {
    icon: '/ismaa_logo.png',
    shortcut: '/ismaa_logo.png',
    apple: '/ismaa_logo.png',
  },
};

/** Root HTML wrapper rendered around every page; mounts the global providers. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {/* All routes render inside the shared provider tree. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
