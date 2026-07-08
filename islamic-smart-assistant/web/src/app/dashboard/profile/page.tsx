'use client';

// Profile route. Profile management is desktop-only: the editable form renders
// inside the Syedi-ISMAA Desktop app; on the web build we show the download notice.
// (The sidebar "Profile" item opens this same content as a popup.)

import { Sparkles } from 'lucide-react';
import { useIsDesktop } from '@/lib/useIsDesktop';
import { useTheme } from '@/lib/ThemeContext';
import { ProfileForm, DesktopRequiredNotice } from '@/components/ProfileForm';
import { ContentBackdrop } from '@/components/ContentBackdrop';

export default function ProfilePage() {
  const isDesktop = useIsDesktop();
  const { isDark } = useTheme();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="chip-gold mb-2"><Sparkles size={12} /> Your account</p>
        <h1 className="h-display text-4xl font-bold">My Profile</h1>
        <p className="text-ink/60 mt-1">
          {isDesktop
            ? 'Your details are saved to your account and synced to every device.'
            : 'Profile management is available in the ISMAA Desktop app.'}
        </p>
      </div>

      <div className="rounded-3xl overflow-hidden">
        <ContentBackdrop isDark={isDark} className="p-5">
          {isDesktop ? <ProfileForm /> : <DesktopRequiredNotice />}
        </ContentBackdrop>
      </div>
    </div>
  );
}
