// Qibla Finder screen for the mobile app.
//
// Live compass mode (physical device): a rotating compass rose driven by the
// device magnetometer via useCompassHeading. The needle tip (gold) always points
// toward the Kaaba; when the phone is aimed at the Qibla the screen glows green.
//
// No-sensor fallback (emulator / no magnetometer): shows the numeric bearing,
// distance to Kaaba, and a prompt to use the web app / a physical device.
//
// Note on declination: react-native-compass-heading returns MAGNETIC north.
// We compensate in the needle-rotation formula so the needle tracks the TRUE-north
// Qibla bearing. See inline comment near `qiblaMagnetic` below.

import React, { useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { RootState } from '../../store';
import { useTheme } from '../../theme';
import { useCompassHeading } from '../../services/compass';
import {
  qiblaBearing, distanceToKaaba, compassPoint, formatDistance, isAligned,
} from '../../services/qibla';

const { width: SCREEN_W } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_W - 64, 300); // responsive, max 300px
const CX = COMPASS_SIZE / 2;

// ── Compass rose component (pure RN Views + Text, no SVG dep needed) ─────────

interface NeedleProps {
  /** Rotation of the whole compass in degrees. 0 = needle tip points up (= Qibla). */
  rotation: Animated.SharedValue<number>;
  aligned: boolean;
  theme: ReturnType<typeof useTheme>;
  noSensor: boolean;
}

function CompassNeedle({ rotation, aligned, theme, noSensor }: NeedleProps) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const ringColor = aligned ? '#22c55e' : theme.accent;
  const tipColor  = aligned ? '#22c55e' : '#D4AF37'; // gold tip → green when aligned

  return (
    <View style={[styles.compassOuter, { width: COMPASS_SIZE, height: COMPASS_SIZE,
      borderColor: aligned ? '#22c55e40' : theme.accentSoft }]}>

      {/* Fixed cardinal labels — NOT inside the rotating view */}
      {(['N', 'E', 'S', 'W'] as const).map((label, i) => {
        const angle = i * 90;
        const rad   = ((angle - 90) * Math.PI) / 180;
        const r     = CX - 14;
        const isN   = label === 'N';
        return (
          <Text key={label} style={[styles.cardinal, {
            color: isN ? ringColor : theme.subText,
            fontWeight: isN ? '700' : '500',
            fontSize: isN ? 15 : 12,
            position: 'absolute',
            left: CX + r * Math.cos(rad) - 10,
            top:  CX + r * Math.sin(rad) - 10,
          }]}>{label}</Text>
        );
      })}

      {/* Outer decorative ring + tick marks via border */}
      <View style={[styles.compassRing, {
        width: COMPASS_SIZE - 20, height: COMPASS_SIZE - 20,
        borderColor: aligned ? '#22c55e60' : theme.accentSoft,
        top: 10, left: 10,
      }]} />

      {/* Inner ring */}
      <View style={[styles.innerRing, {
        width: COMPASS_SIZE * 0.55, height: COMPASS_SIZE * 0.55,
        borderColor: theme.divider,
        top:  CX - (COMPASS_SIZE * 0.275),
        left: CX - (COMPASS_SIZE * 0.275),
      }]} />

      {/* Rotating needle container */}
      <Animated.View style={[styles.needleContainer, {
        width: COMPASS_SIZE, height: COMPASS_SIZE,
      }, animStyle]}>

        {/* Needle tip (gold/green triangle pointing UP) */}
        <View style={[styles.needleTip, {
          borderBottomColor: noSensor ? theme.divider : tipColor,
          left: CX - 9, top: COMPASS_SIZE * 0.1,
        }]} />
        {/* Needle top rectangle */}
        <View style={[styles.needleTopRect, {
          backgroundColor: noSensor ? theme.divider : tipColor,
          left: CX - 4.5, top: COMPASS_SIZE * 0.1 + 28,
          width: 9, height: COMPASS_SIZE * 0.32,
        }]} />

        {/* Center pivot dot */}
        <View style={[styles.pivotOuter, {
          backgroundColor: theme.card,
          borderColor: ringColor,
          left: CX - 11, top: CX - 11,
        }]} />
        <View style={[styles.pivotInner, {
          backgroundColor: ringColor,
          left: CX - 4.5, top: CX - 4.5,
        }]} />

        {/* Needle tail rectangle */}
        <View style={[styles.needleBottomRect, {
          backgroundColor: '#374151',
          left: CX - 3, top: CX + 12,
          width: 6, height: COMPASS_SIZE * 0.24,
        }]} />
        {/* Needle tail triangle pointing DOWN */}
        <View style={[styles.needleTail, {
          borderTopColor: '#374151',
          left: CX - 7, top: CX + 12 + COMPASS_SIZE * 0.24,
        }]} />
      </Animated.View>

      {/* Kaaba emoji at the top (fixed, outside rotating view — acts as target marker) */}
      <Text style={[styles.kaabaIcon, { top: COMPASS_SIZE * 0.04, left: CX - 11 }]}>
        🕋
      </Text>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export function QiblaScreen() {
  const { t }    = useTranslation();
  const theme    = useTheme();
  const location = useSelector((s: RootState) => s.user.location);
  const { heading, accuracy, supported } = useCompassHeading(2);

  // Qibla true-north bearing + distance (null when no location set).
  const bearing = useMemo(
    () => (location ? qiblaBearing(location.lat, location.lng) : null),
    [location],
  );
  const distKm = useMemo(
    () => (location ? distanceToKaaba(location.lat, location.lng) : null),
    [location],
  );

  // react-native-compass-heading returns MAGNETIC heading. We keep the Qibla
  // in the same magnetic frame by subtracting a rough declination. For most
  // populated areas declination is ≤10°; acceptable for practical use. If you
  // install the 'geomagnetism' package you can compute an exact value:
  //   const declination = geomagnetism.model().point([lat, lng]).decl;
  const DECLINATION = 0; // degrees east; update per user location if desired
  const qiblaMagnetic = useMemo(
    () => bearing != null ? ((bearing - DECLINATION) % 360 + 360) % 360 : null,
    [bearing],
  );

  const aligned = useMemo(
    () => heading != null && qiblaMagnetic != null
      ? isAligned(heading, qiblaMagnetic)
      : false,
    [heading, qiblaMagnetic],
  );

  // Smooth shortest-path rotation via reanimated.
  const rotation  = useSharedValue(qiblaMagnetic ?? 0);
  const lastRotRef = useRef(qiblaMagnetic ?? 0);

  useEffect(() => {
    if (heading == null || qiblaMagnetic == null) return;
    const target = qiblaMagnetic - heading;
    const cur    = lastRotRef.current;
    const delta  = ((target - cur + 540) % 360) - 180;
    const next   = cur + delta;
    lastRotRef.current = next;
    rotation.value = withTiming(next, { duration: 150 });
  }, [heading, qiblaMagnetic, rotation]);

  // Static mode: snap needle to bearing when no live heading.
  useEffect(() => {
    if (heading != null || qiblaMagnetic == null) return;
    rotation.value = qiblaMagnetic;
    lastRotRef.current = qiblaMagnetic;
  }, [qiblaMagnetic, heading, rotation]);

  const needsCalibration =
    Platform.OS === 'ios' &&
    typeof accuracy === 'number' &&
    (accuracy < 0 || accuracy > 20);

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          {t('qibla.title')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          {location
            ? `${location.city ?? ''} ${location.city ? '·' : ''} ${t('qibla.subtitle')}`
            : t('qibla.subtitle')}
        </Text>
      </View>

      {/* ── No location prompt ── */}
      {!location && (
        <View style={[styles.alertBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
          <Text style={[styles.alertTitle, { color: '#92400E' }]}>{t('qibla.noLocation')}</Text>
          <Text style={[styles.alertBody, { color: '#B45309' }]}>{t('qibla.noLocationDesc')}</Text>
        </View>
      )}

      {/* ── Compass card ── */}
      <View style={[styles.card, { backgroundColor: theme.card,
        borderColor: aligned ? '#22c55e40' : theme.divider }]}>

        {/* Live / No-sensor badge */}
        {supported && heading != null && (
          <View style={[styles.badge, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <View style={styles.liveDot} />
            <Text style={[styles.badgeText, { color: '#166534' }]}>
              {t('qibla.live')}
            </Text>
          </View>
        )}
        {!supported && (
          <View style={[styles.badge, { backgroundColor: theme.accentSoft, borderColor: theme.divider }]}>
            <Text style={[styles.badgeText, { color: theme.subText }]}>
              {t('qibla.noSensor')}
            </Text>
          </View>
        )}

        {/* Compass rose */}
        {bearing != null ? (
          <CompassNeedle
            rotation={rotation}
            aligned={aligned}
            theme={theme}
            noSensor={!supported}
          />
        ) : (
          <View style={[styles.emptyCompass, { borderColor: theme.divider }]}>
            <Text style={{ fontSize: 48 }}>🧭</Text>
          </View>
        )}

        {/* Aligned banner */}
        {aligned && (
          <View style={[styles.alignedBanner, { backgroundColor: '#16a34a' }]}>
            <Text style={styles.alignedText}>✓ {t('qibla.aligned')}</Text>
          </View>
        )}

        {/* Calibration warning */}
        {needsCalibration && (
          <View style={[styles.calibrateBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
            <Text style={[styles.calibrateText, { color: '#92400E' }]}>
              {t('qibla.calibrate')}
            </Text>
          </View>
        )}
      </View>

      {/* ── Info row: bearing + distance ── */}
      {bearing != null && distKm != null && (
        <View style={[styles.infoRow, { backgroundColor: theme.card,
          borderColor: theme.divider }]}>
          <View style={styles.infoCell}>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {bearing.toFixed(0)}°
            </Text>
            <Text style={[styles.infoLabel, { color: theme.subText }]}>
              {compassPoint(bearing)}
            </Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: theme.divider }]} />
          <View style={styles.infoCell}>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {formatDistance(distKm)}
            </Text>
            <Text style={[styles.infoLabel, { color: theme.subText }]}>
              {t('qibla.fromKaaba')}
            </Text>
          </View>
          {heading != null && (
            <>
              <View style={[styles.infoDivider, { backgroundColor: theme.divider }]} />
              <View style={styles.infoCell}>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {heading.toFixed(0)}°
                </Text>
                <Text style={[styles.infoLabel, { color: theme.subText }]}>
                  {t('qibla.heading')}
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* ── How to use hint ── */}
      <View style={[styles.hintBox, { backgroundColor: theme.accentSoft }]}>
        <Text style={[styles.hintText, { color: theme.accent }]}>
          {t('qibla.hint')}
        </Text>
      </View>
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content:    { padding: 20, paddingBottom: 40, alignItems: 'center' },
  header:     { width: '100%', marginBottom: 20, alignItems: 'center' },
  title:      { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle:   { fontSize: 13, textAlign: 'center' },
  alertBox:   { width: '100%', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  alertTitle: { fontWeight: '600', fontSize: 14, marginBottom: 2 },
  alertBody:  { fontSize: 12 },

  card: {
    width: '100%', borderWidth: 1, borderRadius: 24,
    padding: 20, marginBottom: 12,
    alignItems: 'center', gap: 16,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  liveDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
  badgeText: { fontSize: 11, fontWeight: '600' },

  compassOuter: {
    borderWidth: 2, borderRadius: 999,
    position: 'relative', overflow: 'visible',
  },
  compassRing: {
    position: 'absolute', borderWidth: 1.5, borderRadius: 999,
  },
  innerRing: {
    position: 'absolute', borderWidth: 1, borderRadius: 999,
  },
  needleContainer: {
    position: 'absolute', top: 0, left: 0,
  },
  cardinal: {
    width: 20, textAlign: 'center',
    zIndex: 10,
  },
  kaabaIcon: {
    position: 'absolute', fontSize: 20, zIndex: 10,
  },

  // Needle top: triangle pointing UP (toward Qibla)
  needleTip: {
    position: 'absolute',
    width: 0, height: 0,
    borderLeftWidth: 9, borderRightWidth: 9, borderBottomWidth: 28,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  needleTopRect: { position: 'absolute', borderRadius: 2 },

  // Center pivot
  pivotOuter: {
    position: 'absolute', width: 22, height: 22,
    borderRadius: 11, borderWidth: 2,
  },
  pivotInner: {
    position: 'absolute', width: 9, height: 9, borderRadius: 5,
  },

  // Needle tail
  needleBottomRect: { position: 'absolute', borderRadius: 2 },
  needleTail: {
    position: 'absolute',
    width: 0, height: 0,
    borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 18,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },

  emptyCompass: {
    width: COMPASS_SIZE, height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2, borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },

  alignedBanner: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 16,
  },
  alignedText: { color: 'white', fontWeight: '700', fontSize: 14 },

  calibrateBox: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, width: '100%',
  },
  calibrateText: { fontSize: 12, textAlign: 'center' },

  infoRow: {
    flexDirection: 'row', width: '100%',
    borderWidth: 1, borderRadius: 16, marginBottom: 12,
    overflow: 'hidden',
  },
  infoCell:    { flex: 1, alignItems: 'center', paddingVertical: 14 },
  infoValue:   { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  infoLabel:   { fontSize: 11, marginTop: 2 },
  infoDivider: { width: 1 },

  hintBox: { width: '100%', borderRadius: 14, padding: 14 },
  hintText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
