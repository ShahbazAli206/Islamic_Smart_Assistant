'use client';

/**
 * Full-bleed background image + dark transparent veil for a page's content
 * area (everything below the hero/first section). Matches the treatment on
 * the Settings page: the hero keeps its own clean image, the rest of the
 * page sits on the same image dimmed for readability.
 */
export function ContentBackdrop({
  isDark,
  className = '',
  children,
}: {
  isDark: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Overview_Light_Theme_Updated background images first section.png"
        alt=""
        className="absolute inset-0 h-full w-full select-none object-cover object-center"
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: isDark ? 'rgba(4,12,8,0.72)' : 'rgba(0,0,0,0.38)' }}
      />
      <div className={`relative ${className}`}>{children}</div>
    </div>
  );
}
