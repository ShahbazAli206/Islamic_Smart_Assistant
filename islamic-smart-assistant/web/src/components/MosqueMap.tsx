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
  /** The user's saved location — drawn as a precise, static pin-point marker. */
  userLocation?: { lat: number; lng: number } | null;
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
  userLocation,
  onMoveEnd,
  onSelectMosque,
  onMapClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const clickPinMarkerRef = useRef<Marker | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
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
    // Use the requested zoom as a floor so explicit actions (e.g. "My Location")
    // can pull the view in close, without ever zooming further out than the user is.
    if (moved) map.easeTo({ center: [center.lng, center.lat], zoom: Math.max(map.getZoom(), zoom) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, zoom]);

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
      // A prominent teardrop "location" pin whose tip sits exactly on the point —
      // unmistakable next to the green mosque markers (which are a different shape
      // and colour). Blue keeps the existing "selected spot is blue" convention.
      const el = document.createElement('div');
      el.title = 'Selected location';
      el.style.cssText = `
        width:30px;height:30px;border:2px solid #fff;cursor:default;
        background:#2563eb;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 3px 9px rgba(0,0,0,.45);
        display:flex;align-items:center;justify-content:center;`;
      const inner = document.createElement('span');
      inner.style.cssText = 'width:10px;height:10px;background:#fff;border-radius:50%;transform:rotate(45deg);';
      el.appendChild(inner);
      clickPinMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([clickPin.lng, clickPin.lat])
        .addTo(map);
    }
  }, [clickPin]);

  // Render the user's saved location as a precise, static pin-point.
  // anchor:'center' places the dot's centre exactly on the coordinate, and there's
  // no animation — so it reads as an exact point, not the blinking geolocate dot.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    } else {
      const el = document.createElement('div');
      el.title = 'Your location';
      el.style.cssText =
        'position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;pointer-events:none;';
      // Soft static halo (no animation) for an "accuracy" feel.
      const halo = document.createElement('span');
      halo.style.cssText =
        'position:absolute;inset:0;border-radius:50%;background:rgba(201,162,39,0.22);border:1px solid rgba(201,162,39,0.45);';
      // Crisp centre dot sitting exactly on the point.
      const dot = document.createElement('span');
      dot.style.cssText =
        'position:relative;width:14px;height:14px;border-radius:50%;background:#C9A227;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45);';
      el.appendChild(halo);
      el.appendChild(dot);
      userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
    }
  }, [userLocation]);

  return <div ref={containerRef} className="w-full h-[420px] rounded-2xl overflow-hidden" />;
}
