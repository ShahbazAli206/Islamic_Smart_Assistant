'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Square, Copy, X } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { useIsDesktop } from '@/lib/useIsDesktop';

// Electron preload bridge (desktop/electron/preload.js → window.desktop).
type DesktopBridge = {
  platform?: string;
  win?: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizedChanged: (cb: (v: boolean) => void) => () => void;
  };
};

// `-webkit-app-region` isn't in the standard CSSProperties type.
const DRAG = { WebkitAppRegion: 'drag' } as unknown as React.CSSProperties;
const NO_DRAG = { WebkitAppRegion: 'no-drag' } as unknown as React.CSSProperties;

export const TITLEBAR_HEIGHT = 40; // px — kept in sync with globals.css --titlebar-h

/**
 * Custom window title bar for the Electron desktop app. Renders nothing on the
 * plain web build. Replaces the native OS frame (which is disabled via
 * `frame: false` in the Electron main process) with a themed, branded strip:
 * the ISMAA logo on the left and animated minimize / maximize / close controls
 * on the right (Windows & Linux). On macOS the native traffic lights are kept,
 * so we only render the brand and reserve space for them.
 */
export function DesktopTitleBar() {
  const isDesktop = useIsDesktop();
  const { isDark } = useTheme();
  const [isMax, setIsMax] = useState(false);

  const bridge = (typeof window !== 'undefined' ? (window as unknown as { desktop?: DesktopBridge }).desktop : undefined);
  const isMac = bridge?.platform === 'darwin';

  // Reserve the bar's height across the whole app (see globals.css .is-desktop).
  useEffect(() => {
    const root = document.documentElement;
    if (isDesktop) root.classList.add('is-desktop');
    else root.classList.remove('is-desktop');
    return () => root.classList.remove('is-desktop');
  }, [isDesktop]);

  // Track the real window state so the maximize/restore icon stays accurate.
  useEffect(() => {
    if (!isDesktop || !bridge?.win) return;
    bridge.win.isMaximized().then(setIsMax).catch(() => {});
    return bridge.win.onMaximizedChanged(setIsMax);
  }, [isDesktop, bridge]);

  if (!isDesktop) return null;

  const win = bridge?.win;

  return (
    <header
      style={{ ...DRAG, height: TITLEBAR_HEIGHT }}
      className="fixed inset-x-0 top-0 z-[1000] flex select-none items-center overflow-hidden"
    >
      {/* themed background */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: isDark
            ? 'linear-gradient(90deg, #052018 0%, #0b3628 45%, #0a3022 70%, #052018 100%)'
            : 'linear-gradient(90deg, #ffffff 0%, #eafaf1 45%, #e4f6ec 70%, #ffffff 100%)',
        }}
      />
      {/* soft top highlight for depth */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.9)' }}
      />

      {/* animated accent line along the bottom edge — the "live" shimmer */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px]"
        animate={{ opacity: isDark ? [0.5, 1, 0.5] : [0.4, 0.85, 0.4] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: isDark
            ? 'linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.85) 30%, rgba(233,207,122,0.8) 60%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.7) 30%, rgba(201,162,39,0.65) 60%, transparent 100%)',
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-0 h-[2px] w-1/3"
        animate={{ x: ['-40%', '340%'] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)' }}
      />

      {/* macOS traffic-light spacer */}
      {isMac && <div className="w-[74px] shrink-0" />}

      {/* brand: logo + title */}
      <div className="relative z-10 flex items-center gap-2.5 pl-3.5 pr-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ismaa_logo3.png"
          alt="ISMAA"
          className="h-[24px] w-auto object-contain"
          style={{ filter: isDark ? 'drop-shadow(0 1px 3px rgba(0,0,0,0.5)) brightness(1.15)' : 'drop-shadow(0 1px 2px rgba(16,40,30,0.15))' }}
          draggable={false}
        />
        <span className={`h-4 w-px ${isDark ? 'bg-white/15' : 'bg-emerald-900/15'}`} />
        <span
          className={`text-[12.5px] font-semibold tracking-wide ${isDark ? 'text-parchment/90' : 'text-emerald-900'}`}
        >
          Islamic Smart Assistant
        </span>
      </div>

      {/* draggable filler */}
      <div className="relative z-10 flex-1" />

      {/* window controls (Windows / Linux) */}
      {!isMac && win && (
        <div className="relative z-10 flex h-full items-stretch" style={NO_DRAG}>
          <WinButton
            label="Minimize"
            onClick={() => win.minimize()}
            isDark={isDark}
          >
            <Minus size={16} strokeWidth={2} />
          </WinButton>

          <WinButton
            label={isMax ? 'Restore' : 'Maximize'}
            onClick={() => win.maximize()}
            isDark={isDark}
          >
            {isMax ? <Copy size={13} strokeWidth={2} /> : <Square size={13} strokeWidth={2} />}
          </WinButton>

          <WinButton
            label="Close"
            onClick={() => win.close()}
            isDark={isDark}
            danger
          >
            <X size={17} strokeWidth={2} />
          </WinButton>
        </div>
      )}
    </header>
  );
}

function WinButton({
  children, onClick, label, isDark, danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  isDark: boolean;
  danger?: boolean;
}) {
  const base = isDark ? 'text-parchment/80' : 'text-emerald-900/80';
  const hover = danger
    ? 'hover:bg-red-600 hover:text-white'
    : isDark
      ? 'hover:bg-white/12 hover:text-white'
      : 'hover:bg-emerald-900/[0.08] hover:text-emerald-950';
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-full w-[46px] place-items-center transition-colors duration-150 ${base} ${hover}`}
    >
      {children}
    </button>
  );
}
