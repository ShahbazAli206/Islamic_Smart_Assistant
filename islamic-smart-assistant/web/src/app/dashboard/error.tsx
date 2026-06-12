'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RotateCw, MapPin, Settings } from 'lucide-react';
import { OnboardingSetup } from '@/components/OnboardingSetup';

/**
 * Error boundary for the /dashboard segment (Next.js `error.tsx`). Catches
 * render-time errors in any dashboard page and offers two recoveries: retry
 * (`reset`) or fix the most common root cause — a bad location — by reopening
 * onboarding. Tailors its copy when the failure looks location-related.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showSetup, setShowSetup] = useState(false);

  // Surface the error to the console for debugging; re-runs if a new error arrives.
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  // Heuristic: many dashboard failures stem from an unresolvable city/country.
  // Match on error type or keywords so we can show targeted "update location" copy.
  const isLocationRelated =
    error.name === 'LocationError' ||
    error.message.toLowerCase().includes('location') ||
    error.message.toLowerCase().includes('prayer') ||
    error.message.toLowerCase().includes('city');

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center">
          <AlertTriangle size={32} className="text-rose-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isLocationRelated ? 'Location issue detected' : 'Something went wrong'}
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          {isLocationRelated
            ? 'Your current city/country setting could not be resolved. Please update your location to continue.'
            : 'An unexpected error occurred in the dashboard. You can try again or update your settings.'
          }
        </p>
        {/* Raw error message — dev only, hidden from end users in production */}
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-2 text-xs text-left text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 max-h-32 overflow-auto whitespace-pre-wrap">
            {error.message}
          </pre>
        )}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition"
          >
            <RotateCw size={16} /> Try again
          </button>
          <button
            onClick={() => setShowSetup(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold text-sm hover:border-emerald-400 transition"
          >
            <MapPin size={16} /> Update location
          </button>
        </div>
      </div>

      {/* Onboarding modal launched by "Update location"; closing it also
          retries the boundary so the fixed location takes effect immediately. */}
      {showSetup && (
        <OnboardingSetup
          forceOpen
          onClose={() => {
            setShowSetup(false);
            reset();
          }}
        />
      )}
    </div>
  );
}
