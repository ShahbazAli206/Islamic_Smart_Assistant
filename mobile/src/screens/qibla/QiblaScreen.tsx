import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform, Dimensions,
  Animated, TouchableOpacity, Easing,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useCompassHeading } from '../../services/compass';
import {
  qiblaBearing, distanceToKaaba, compassPoint, formatDistance, isAligned,
} from '../../services/qibla';

const { width: SW } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SW - 80, 280);
const CX = COMPASS_SIZE / 2;

// ─── Design palette (light mode to match design) ─────────────────────────────
const BG      = '#FFFFFF';
const CARD    = '#FFFFFF';
const CARD_D  = '#1A2A1A';   // dark compass card
const EMERALD = '#10B981';
const GOLD    = '#DDB94B';
const TEXT    = '#0B1410';
const SUBTEXT = '#5C5A50';
const DIVIDER = '#E5E4DA';
const GREEN_DARK = '#0D3320';

// ─── Arabic verse image-area (decorative header) ─────────────────────────────
function VerseHeader() {
  return (
    <View style={vh.wrap}>
      {/* Background texture suggestion: mosque image, use layered views */}
      <View style={vh.imgBg} />
      {/* Overlay */}
      <View style={vh.overlay} />
      <View style={vh.content}>
        <Text style={vh.arabic}>
          {'قُلْ وَجَّهْتُ وَجْهِيَ لِلَّذِي فَطَرَ السَّمَاوَاتِ وَالْأَرْضَ'}
        </Text>
        <Text style={vh.en}>
          So turn your face toward Al-Masjid Al-Haram.
        </Text>
        <Text style={vh.ref}>Surah Al-Baqarah (2:144)</Text>
      </View>
    </View>
  );
}

const vh = StyleSheet.create({
  wrap:    { position: 'relative', backgroundColor: '#E8F5EE', overflow: 'hidden' },
  imgBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#D4EDDA',
  },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.4)' },
  content: { padding: 20, paddingVertical: 22 },
  arabic:  { fontSize: 16, fontWeight: '700', color: TEXT, textAlign: 'center', lineHeight: 26, marginBottom: 8 },
  en:      { fontSize: 13, color: SUBTEXT, textAlign: 'center', marginBottom: 4 },
  ref:     { fontSize: 11, color: EMERALD, fontWeight: '600', textAlign: 'center' },
});

// ─── Compass rose ─────────────────────────────────────────────────────────────
function CompassRose({
  rotation, aligned, noSensor,
}: {
  rotation: Animated.Value;
  aligned: boolean;
  noSensor: boolean;
}) {
  const ringColor = aligned ? '#22C55E' : EMERALD;

  const spin = rotation.interpolate({
    inputRange: [-3600, 3600],
    outputRange: ['-3600deg', '3600deg'],
  });

  return (
    <View style={[cp.outer, {
      width: COMPASS_SIZE, height: COMPASS_SIZE,
      borderColor: aligned ? '#22C55E60' : 'rgba(16,185,129,0.25)',
    }]}>
      {/* Outer ring */}
      <View style={[cp.ring, {
        width: COMPASS_SIZE - 16, height: COMPASS_SIZE - 16,
        top: 8, left: 8,
        borderColor: 'rgba(16,185,129,0.15)',
      }]} />
      {/* Inner ring */}
      <View style={[cp.ring, {
        width: COMPASS_SIZE * 0.55, height: COMPASS_SIZE * 0.55,
        top: CX - COMPASS_SIZE * 0.275, left: CX - COMPASS_SIZE * 0.275,
        borderColor: 'rgba(16,185,129,0.10)',
      }]} />

      {/* Cardinal letters */}
      {(['N', 'E', 'S', 'W'] as const).map((lbl, i) => {
        const rad = ((i * 90 - 90) * Math.PI) / 180;
        const r   = CX - 18;
        return (
          <Text key={lbl} style={[cp.cardinal, {
            color:      lbl === 'N' ? ringColor : 'rgba(255,255,255,0.6)',
            fontWeight: lbl === 'N' ? '800' : '500',
            fontSize:   lbl === 'N' ? 14 : 11,
            left: CX + r * Math.cos(rad) - 9,
            top:  CX + r * Math.sin(rad) - 9,
          }]}>{lbl}</Text>
        );
      })}

      {/* Degree marks */}
      {Array.from({ length: 36 }).map((_, i) => {
        const angle = i * 10;
        const rad   = (angle - 90) * Math.PI / 180;
        const r1    = CX - 28;
        const r2    = CX - (i % 9 === 0 ? 40 : 34);
        return (
          <View key={i} style={{
            position: 'absolute',
            width: i % 9 === 0 ? 2 : 1,
            height: i % 9 === 0 ? 12 : 7,
            backgroundColor: 'rgba(255,255,255,0.3)',
            left: CX + r1 * Math.cos(rad) - 0.5,
            top:  CX + r1 * Math.sin(rad) - 3,
            transform: [{ rotate: `${angle}deg` }],
          }} />
        );
      })}

      {/* Animated needle */}
      <Animated.View style={[cp.needleWrap, {
        width: COMPASS_SIZE, height: COMPASS_SIZE,
        transform: [{ rotate: spin }],
      }]}>
        {/* Tip (pointing to Qibla) */}
        <View style={{
          position: 'absolute',
          width: 0, height: 0,
          borderLeftWidth: 7, borderRightWidth: 7,
          borderBottomWidth: 28,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: noSensor ? '#555' : EMERALD,
          left: CX - 7, top: COMPASS_SIZE * 0.12,
        }} />
        <View style={{
          position: 'absolute',
          width: 6, height: COMPASS_SIZE * 0.3,
          backgroundColor: noSensor ? '#555' : EMERALD,
          borderRadius: 3,
          left: CX - 3, top: COMPASS_SIZE * 0.12 + 28,
        }} />
        {/* Kaaba emoji at tip */}
        <Text style={{ position: 'absolute', top: COMPASS_SIZE * 0.06, left: CX - 10, fontSize: 14 }}>🕋</Text>
        {/* Pivot */}
        <View style={[cp.pivotOuter, { left: CX - 11, top: CX - 11, borderColor: ringColor }]} />
        <View style={[cp.pivotInner, { left: CX - 5, top: CX - 5, backgroundColor: ringColor }]} />
        {/* Tail */}
        <View style={{
          position: 'absolute',
          width: 6, height: COMPASS_SIZE * 0.22,
          backgroundColor: '#EF4444',
          borderRadius: 3,
          left: CX - 3, top: CX + 12,
        }} />
      </Animated.View>

      {/* Aligned glow ring */}
      {aligned && (
        <View style={[StyleSheet.absoluteFillObject, {
          borderRadius: COMPASS_SIZE / 2,
          borderWidth: 3, borderColor: '#22C55E30',
        }]} />
      )}
    </View>
  );
}

const cp = StyleSheet.create({
  outer: {
    borderWidth: 2, borderRadius: 999,
    backgroundColor: '#0D2818',
    position: 'relative',
    alignItems: 'center', justifyContent: 'center',
  },
  ring: { position: 'absolute', borderWidth: 1, borderRadius: 999 },
  cardinal: { position: 'absolute', width: 20, textAlign: 'center', zIndex: 10 },
  needleWrap: { position: 'absolute', top: 0, left: 0 },
  pivotOuter: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    borderWidth: 2.5, backgroundColor: '#0D2818',
  },
  pivotInner: {
    position: 'absolute', width: 10, height: 10, borderRadius: 5,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function QiblaScreen() {
  const location = useSelector((s: RootState) => s.user.location);
  const { heading, accuracy, supported } = useCompassHeading(2);

  const bearing = useMemo(
    () => (location ? qiblaBearing(location.lat, location.lng) : null),
    [location],
  );
  const distKm = useMemo(
    () => (location ? distanceToKaaba(location.lat, location.lng) : null),
    [location],
  );
  const qiblaMagnetic = useMemo(
    () => (bearing != null ? ((bearing) % 360 + 360) % 360 : null),
    [bearing],
  );
  const aligned = useMemo(
    () => heading != null && qiblaMagnetic != null ? isAligned(heading, qiblaMagnetic) : false,
    [heading, qiblaMagnetic],
  );

  const rotAnim    = useRef(new Animated.Value(qiblaMagnetic ?? 0)).current;
  const lastRotRef = useRef(qiblaMagnetic ?? 0);

  useEffect(() => {
    if (heading == null || qiblaMagnetic == null) return;
    const target = qiblaMagnetic - heading;
    const cur    = lastRotRef.current;
    const delta  = ((target - cur + 540) % 360) - 180;
    const next   = cur + delta;
    lastRotRef.current = next;
    Animated.timing(rotAnim, {
      toValue: next, duration: 200,
      easing: Easing.out(Easing.ease), useNativeDriver: true,
    }).start();
  }, [heading, qiblaMagnetic, rotAnim]);

  useEffect(() => {
    if (heading != null || qiblaMagnetic == null) return;
    rotAnim.setValue(qiblaMagnetic);
    lastRotRef.current = qiblaMagnetic;
  }, [qiblaMagnetic, heading, rotAnim]);

  const needsCalibration =
    Platform.OS === 'ios' && typeof accuracy === 'number' && (accuracy < 0 || accuracy > 20);

  const cityName = location?.city ?? (location ? `${location.lat.toFixed(2)}°N` : null);
  const dirLabel = bearing != null ? compassPoint(bearing) : '—';
  const distLabel = distKm != null ? formatDistance(distKm) : '—';

  const qiblaDir = bearing != null
    ? `${bearing.toFixed(0)}° ${compassPoint(bearing)}`
    : '—';

  return (
    <ScrollView style={S.root} contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>

      {/* ── Arabic verse header ── */}
      <VerseHeader />

      {/* ── Location + distance row ── */}
      <View style={S.infoRow}>
        <View style={S.infoCell}>
          <View style={S.locChip}>
            <Text style={{ fontSize: 12 }}>📍</Text>
            <Text style={S.locText}>{cityName ?? 'Set Location'}</Text>
          </View>
        </View>
        <View style={S.infoCell2}>
          <Text style={S.distLabel}>Distance to Kaaba</Text>
          <Text style={S.distValue}>{distLabel}</Text>
        </View>
      </View>

      {/* ── Main compass card ── */}
      <View style={S.compassCard}>
        {/* Card header */}
        <View style={S.compassCardHeader}>
          <Text style={S.compassCardTitle}>Qibla Direction</Text>
          <Text style={S.compassDirValue}>{qiblaDir}</Text>
        </View>

        {/* Live badge */}
        {supported && heading != null && (
          <View style={S.liveBadge}>
            <View style={S.liveDot} />
            <Text style={S.liveText}>Live</Text>
          </View>
        )}

        {/* Compass */}
        <View style={S.compassWrap}>
          {bearing != null ? (
            <CompassRose
              rotation={rotAnim}
              aligned={aligned}
              noSensor={!supported}
            />
          ) : (
            <View style={[S.emptyCompass, { width: COMPASS_SIZE, height: COMPASS_SIZE }]}>
              <Text style={{ fontSize: 40 }}>🧭</Text>
              <Text style={S.emptyText}>Set location to find Qibla</Text>
            </View>
          )}
        </View>

        {/* Aligned banner */}
        {aligned && (
          <View style={S.alignedBanner}>
            <Text style={S.alignedText}>✓  You are facing the Qibla!</Text>
          </View>
        )}

        {/* Calibration warning */}
        {needsCalibration && (
          <View style={S.calibWarn}>
            <Text style={S.calibText}>⚠️ Wave device in a figure-8 to calibrate</Text>
          </View>
        )}

        {/* Side action buttons */}
        <View style={S.sideActions}>
          {[
            { icon: '📷', label: 'AR View'  },
            { icon: '🗺', label: 'Map View' },
            { icon: '🔦', label: 'Flashlight' },
          ].map(a => (
            <TouchableOpacity key={a.label} style={S.sideActionBtn}>
              <Text style={{ fontSize: 18 }}>{a.icon}</Text>
              <Text style={S.sideActionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Tips ── */}
      <View style={S.tipsSection}>
        <Text style={S.tipsSectionTitle}>Tips for Accurate Qibla Direction</Text>
        {[
          'For accuracy, keep your device flat and away from metal objects and magnetic cases.',
          'Ensure your location services and internet are enabled for best results.',
          'If your device doesn\'t have a compass, Qibla direction may be less accurate.',
          'Move away from large buildings or objects that may block signal.',
        ].map((tip, i) => (
          <View key={i} style={S.tipRow}>
            <View style={S.tipCheck}><Text style={{ fontSize: 11, color: EMERALD }}>✓</Text></View>
            <Text style={S.tipText}>{tip}</Text>
          </View>
        ))}
      </View>

      {/* ── Qibla Information ── */}
      <View style={S.infoCard}>
        <Text style={S.infoCardTitle}>Qibla Information</Text>
        <View style={S.infoGrid}>
          <View style={S.infoItem}>
            <Text style={S.infoItemIcon}>📍</Text>
            <Text style={S.infoItemLabel}>Latitude</Text>
            <Text style={S.infoItemValue}>
              {location ? `${location.lat.toFixed(4)}° N` : '—'}
            </Text>
          </View>
          <View style={S.infoItem}>
            <Text style={S.infoItemIcon}>📍</Text>
            <Text style={S.infoItemLabel}>Longitude</Text>
            <Text style={S.infoItemValue}>
              {location ? `${location.lng.toFixed(4)}° E` : '—'}
            </Text>
          </View>
          <View style={S.infoItem}>
            <Text style={S.infoItemIcon}>🧭</Text>
            <Text style={S.infoItemLabel}>Qibla Direction</Text>
            <Text style={S.infoItemValue}>{qiblaDir}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 48 },

  // ── Location + distance ───────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    gap: 12,
  },
  infoCell:  { flex: 1 },
  infoCell2: { flex: 1, alignItems: 'flex-end' },
  locChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: EMERALD + '18', borderWidth: 1,
    borderColor: EMERALD + '40', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  locText:   { color: EMERALD, fontSize: 13, fontWeight: '600' },
  distLabel: { color: SUBTEXT, fontSize: 10, fontWeight: '600' },
  distValue: { color: TEXT,    fontSize: 15, fontWeight: '700' },

  // ── Compass card ──────────────────────────────────────────────────────────
  compassCard: {
    marginHorizontal: 16, backgroundColor: '#0D2818',
    borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    alignItems: 'center', marginBottom: 24, position: 'relative',
  },
  compassCardHeader: {
    width: '100%', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  compassCardTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  compassDirValue:  { color: EMERALD, fontSize: 20, fontWeight: '800' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    marginBottom: 16,
  },
  liveDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  liveText: { color: '#22C55E', fontSize: 11, fontWeight: '700' },
  compassWrap: { marginVertical: 12 },
  emptyCompass: {
    borderRadius: 999, borderWidth: 2, borderStyle: 'dashed',
    borderColor: DIVIDER, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  emptyText:    { color: SUBTEXT, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  alignedBanner: {
    backgroundColor: '#16A34A', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 10,
  },
  alignedText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  calibWarn: {
    backgroundColor: '#1C1A00', borderRadius: 12,
    borderWidth: 1, borderColor: GOLD + '50',
    padding: 10, marginTop: 8, width: '100%',
  },
  calibText: { color: GOLD, fontSize: 12, textAlign: 'center' },

  // Side action buttons (AR, Map, Flashlight)
  sideActions: {
    position: 'absolute', right: 14, top: 80,
    gap: 10,
  },
  sideActionBtn: {
    alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    padding: 10, width: 58,
  },
  sideActionLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 4, textAlign: 'center' },

  // ── Tips ──────────────────────────────────────────────────────────────────
  tipsSection:      { paddingHorizontal: 20, marginBottom: 20 },
  tipsSectionTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  tipRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10,
  },
  tipCheck: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: EMERALD + '20', borderWidth: 1, borderColor: EMERALD + '50',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  tipText: { color: SUBTEXT, fontSize: 13, lineHeight: 19, flex: 1 },

  // ── Qibla info card ───────────────────────────────────────────────────────
  infoCard: {
    marginHorizontal: 16, backgroundColor: '#ECFDF5',
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: EMERALD + '30',
  },
  infoCardTitle: { color: TEXT, fontSize: 15, fontWeight: '700', marginBottom: 14 },
  infoGrid:      { flexDirection: 'row', gap: 8 },
  infoItem: {
    flex: 1, backgroundColor: WHITE,
    borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: DIVIDER,
  },
  infoItemIcon:  { fontSize: 18, marginBottom: 4 },
  infoItemLabel: { color: SUBTEXT, fontSize: 10, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  infoItemValue: { color: TEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
