import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata = {
  title: 'Noor — Islamic Smart Assistant',
  description: 'Prayer times, Azan, Quran with translation, multi-device sync — all in one beautifully crafted assistant.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
