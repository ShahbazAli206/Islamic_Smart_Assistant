'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { Map as MlMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Mosque } from '@/lib/overpass';

// OpenFreeMap: free vector tiles, no API key, no usage limits.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

type Props = {
  center: { lat: number; lng: number };
  zoom?: number;
  mosques: Mosque[];
  selectedId?: string | null;
  clickPin?: { lat: number; lng: number } | null;
  onMoveEnd?: (center: { lat: number; lng: number }, zoom: number) => void;
  onSelectMosque?: (m: Mosque) => void;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
};

export default function MosqueMap({
  center,
  zoom = 13,
  mosques,
  selectedId,
  clickPin,
  onMoveEnd,
  onSelectMosque,
  onMapClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const clickPinMarkerRef = useRef<Marker | null>(null);
  // Keep latest callbacks in refs so the map init effect runs once only.
  const cbRef = useRef({ onMoveEnd, onSelectMosque, onMapClick });
  cbRef.current = { onMoveEnd, onSelectMosque, onMapClick };

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [center.lng, center.lat],
      zoom,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
      'top-right',
    );
    map.on('moveend', () => {
      const c = map.getCenter();
      cbRef.current.onMoveEnd?.({ lat: c.lat, lng: c.lng }, map.getZoom());
    });
    // Mosque marker buttons call stopPropagation, so this only fires on empty map area.
    map.on('click', (e) => {
      cbRef.current.onMapClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when the parent changes center (e.g. geolocate / city jump).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const moved = Math.abs(c.lat - center.lat) > 1e-4 || Math.abs(c.lng - center.lng) > 1e-4;
    if (moved) map.easeTo({ center: [center.lng, center.lat], zoom: Math.max(map.getZoom(), 12) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  // Render mosque markers whenever the list or selection changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const mosque of mosques) {
      const el = document.createElement('button');
      el.type = 'button';
      el.title = mosque.name;
      const active = mosque.id === selectedId;
      el.className = 'isa-mosque-pin';
      el.style.cssText = `
        width:${active ? 30 : 22}px;height:${active ? 30 : 22}px;border:none;cursor:pointer;
        background:${active ? '#b8860b' : '#047857'};border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35);
        display:flex;align-items:center;justify-content:center;`;
      const dot = document.createElement('span');
      dot.style.cssText = 'width:8px;height:8px;background:#fff;border-radius:50%;transform:rotate(45deg);';
      el.appendChild(dot);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        cbRef.current.onSelectMosque?.(mosque);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([mosque.lng, mosque.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [mosques, selectedId]);

  // Render / move the click-pin marker whenever the parent updates it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!clickPin) {
      clickPinMarkerRef.current?.remove();
      clickPinMarkerRef.current = null;
      return;
    }
    if (clickPinMarkerRef.current) {
      clickPinMarkerRef.current.setLngLat([clickPin.lng, clickPin.lat]);
    } else {
      const el = document.createElement('div');
      el.style.cssText = `
        width:18px;height:18px;border-radius:50%;
        background:#0ea5e9;border:3px solid #fff;
        box-shadow:0 0 0 3px rgba(14,165,233,0.35),0 2px 6px rgba(0,0,0,.35);
        cursor:default;`;
      el.title = 'Clicked location';
      clickPinMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([clickPin.lng, clickPin.lat])
        .addTo(map);
    }
  }, [clickPin]);

  return <div ref={containerRef} className="w-full h-[420px] rounded-2xl overflow-hidden" />;
}
