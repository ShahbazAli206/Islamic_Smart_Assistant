'use client';
// QiblaMap — desktop / no-compass fallback for the Qibla Finder page.
// Shows the user's location, the Kaaba, and a great-circle bearing line
// between them on a MapLibre map. Dynamically imported (ssr: false) so the
// MapLibre DOM API never runs during SSR.

import { useEffect, useRef } from 'react';
import maplibregl, { Map as MlMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { KAABA } from '@/lib/qibla';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

type Props = {
  userLat: number;
  userLng: number;
};

// Interpolate N+1 points along the great-circle arc from (lat1,lng1) to Kaaba.
// Returns GeoJSON-style [lng, lat] pairs. Using 80 segments gives a smooth curve
// on any map projection without noticeable kink at the dateline.
function greatCircleCoords(lat1: number, lng1: number, steps = 80): [number, number][] {
  const lat2 = KAABA.lat;
  const lng2 = KAABA.lng;
  const toR  = (d: number) => (d * Math.PI) / 180;
  const toD  = (r: number) => (r * 180) / Math.PI;
  const pts: [number, number][] = [];

  // Haversine central angle.
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  const d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (d < 1e-10) return [[lng1, lat1]]; // same point as Kaaba

  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x =
      A * Math.cos(toR(lat1)) * Math.cos(toR(lng1)) +
      B * Math.cos(toR(lat2)) * Math.cos(toR(lng2));
    const y =
      A * Math.cos(toR(lat1)) * Math.sin(toR(lng1)) +
      B * Math.cos(toR(lat2)) * Math.sin(toR(lng2));
    const z = A * Math.sin(toR(lat1)) + B * Math.sin(toR(lat2));
    pts.push([
      toD(Math.atan2(y, x)),                      // lng
      toD(Math.atan2(z, Math.sqrt(x * x + y * y))), // lat
    ]);
  }
  return pts;
}

// The map uses an intermediate zoom that shows both the user and Kaaba when
// possible. We compute the bounding-box midpoint and a rough zoom level.
function fitParams(
  lat1: number, lng1: number,
): { center: [number, number]; zoom: number } {
  const lat2 = KAABA.lat, lng2 = KAABA.lng;
  const midLat = (lat1 + lat2) / 2;
  // Wrap longitude: if the points straddle the antimeridian, average the long way.
  let midLng = (lng1 + lng2) / 2;
  if (Math.abs(lng2 - lng1) > 180) midLng = midLng > 0 ? midLng - 180 : midLng + 180;
  const degDist = Math.sqrt((lat2 - lat1) ** 2 + (lng2 - lng1) ** 2);
  // Rough zoom: ~1 per 30 degrees, clamped to [2, 8].
  const zoom = Math.max(2, Math.min(8, Math.round(10 - degDist / 30)));
  return { center: [midLng, midLat], zoom };
}

export default function QiblaMap({ userLat, userLng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<MlMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const { center, zoom } = fitParams(userLat, userLng);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center,
      zoom,
      attributionControl: { compact: true },
      interactive: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      const coords = greatCircleCoords(userLat, userLng);

      // ── Great-circle bearing line ─────────────────────────────────────
      map.addSource('qibla-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: {},
        },
      });
      // Glow (wider, semi-transparent) + main line (thinner, opaque).
      map.addLayer({
        id: 'qibla-glow',
        type: 'line',
        source: 'qibla-line',
        paint: { 'line-color': '#059669', 'line-width': 6, 'line-opacity': 0.25 },
      });
      map.addLayer({
        id: 'qibla-line',
        type: 'line',
        source: 'qibla-line',
        paint: {
          'line-color': '#059669',
          'line-width': 2.5,
          'line-dasharray': [6, 3],
        },
      });

      // ── User location marker (blue pulsing dot) ────────────────────────
      const userEl = document.createElement('div');
      userEl.className = 'qibla-user-dot';
      userEl.style.cssText = `
        width: 16px; height: 16px; border-radius: 50%;
        background: #2563eb; border: 3px solid white;
        box-shadow: 0 0 0 4px rgba(37,99,235,0.25);
      `;
      new maplibregl.Marker({ element: userEl })
        .setLngLat([userLng, userLat])
        .addTo(map);

      // ── Kaaba marker (gold star pin) ───────────────────────────────────
      const kaabaEl = document.createElement('div');
      kaabaEl.innerHTML = `
        <div style="
          display:flex; flex-direction:column; align-items:center; gap:2px;
          cursor:default; pointer-events:none;
        ">
          <div style="
            width:32px; height:32px; border-radius:50%;
            background:linear-gradient(135deg,#D4AF37,#B8860B);
            border:2px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex; align-items:center; justify-content:center;
            font-size:16px;
          ">🕋</div>
          <div style="
            background:rgba(15,23,42,0.85); color:white;
            font-size:10px; font-weight:600; letter-spacing:0.05em;
            padding:2px 6px; border-radius:4px; white-space:nowrap;
          ">Makkah</div>
        </div>
      `;
      new maplibregl.Marker({ element: kaabaEl, anchor: 'bottom' })
        .setLngLat([KAABA.lng, KAABA.lat])
        .addTo(map);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-[340px] rounded-2xl overflow-hidden"
    />
  );
}
