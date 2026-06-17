import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform, Dimensions,
  Animated, Pressable, Easing,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { RootState } from '../../store';
import { useTheme } from '../../theme';
import { useCompassHeading } from '../../services/compass';
import {
  qiblaBearing, distanceToKaaba, compassPoint, formatDistance, isAligned,
} from '../../services/qibla';

const { width: SCREEN_W } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_W - 64, 300);
const CX = COMPASS_SIZE / 2;

type NeedleStyle = 'classic' | 'arrow' | 'minimal';

const STYLE_INFO: Record<NeedleStyle, { label: string; desc: string; emoji: string }> = {
  classic: { label: 'Classic', desc: 'Gold & green', emoji: '🟡' },
  arrow:   { label: 'Arrow',   desc: 'Emerald tip',  emoji: '🟢' },
  minimal: { label: 'Minimal', desc: 'Clean white',  emoji: '⚪' },
};

function CompassRose({
  rotation, aligned, noSensor, needleStyle, theme,
}: {
  rotation: Animated.Value;
  aligned: boolean;
  noSensor: boolean;
  needleStyle: NeedleStyle;
  theme: ReturnType<typeof useTheme>;
}) {
  const ringColor = aligned ? '#22c55e' : theme.accent;
  const tipColor  = noSensor ? theme.divider
    : needleStyle === 'minimal' ? '#FFFFFF'
    : needleStyle === 'arrow'   ? '#10B981'
    : aligned ? '#22c55e' : theme.accent;
  const tailColor = needleStyle === 'minimal' ? 'rgba(255,255,255,0.2)' : '#374151';
  const nW  = needleStyle === 'minimal' ? 5 : needleStyle === 'arrow' ? 7 : 10;
  const tipH = needleStyle === 'arrow' ? 32 : 26;

  const spin = rotation.interpolate({
    inputRange: [-3600, 3600],
    outputRange: ['-3600deg', '3600deg'],
  });

  return (
    <View style={[styles.compassOuter, {
      width: COMPASS_SIZE, height: COMPASS_SIZE,
      borderColor: aligned ? '#22c55e80' : theme.divider,
      backgroundColor: theme.card,
    }]}>
      {aligned && (
        <View style={[StyleSheet.absoluteFillObject, {
          borderRadius: COMPASS_SIZE / 2, borderWidth: 3, borderColor: '#22c55e30',
        }]} />
      )}
      <View style={[styles.ring, {
        width: COMPASS_SIZE - 18, height: COMPASS_SIZE - 18, top: 9, left: 9,
        borderColor: aligned ? '#22c55e25' : theme.divider,
      }]} />
      <View style={[styles.ring, {
        width: COMPASS_SIZE * 0.56, height: COMPASS_SIZE * 0.56,
        top: CX - COMPASS_SIZE * 0.28, left: CX - COMPASS_SIZE * 0.28,
        borderColor: theme.divider,
      }]} />
      {(['N', 'E', 'S', 'W'] as const).map((label, i) => {
        const rad = ((i * 90 - 90) * Math.PI) / 180;
        const r   = CX - 16;
        return (
          <Text key={label} style={[styles.cardinal, {
            color: label === 'N' ? ringColor : theme.subText,
            fontWeight: label === 'N' ? '800' : '500',
            fontSize: label === 'N' ? 15 : 12,
            left: CX + r * Math.cos(rad) - 10,
            top:  CX + r * Math.sin(rad) - 10,
          }]}>{label}</Text>
        );
      })}
      <Text style={[styles.kaabaFixed, { top: COMPASS_SIZE * 0.04, left: CX - 11 }]}>🕋</Text>

      <Animated.View style={[styles.needleContainer, {
        width: COMPASS_SIZE, height: COMPASS_SIZE,
        transform: [{ rotate: spin }],
      }]}>
        <View style={[styles.tipTriangle, {
          borderLeftWidth: nW, borderRightWidth: nW,
          borderBottomWidth: tipH, borderBottomColor: tipColor,
          left: CX - nW, top: COMPASS_SIZE * 0.1,
        }]} />
        <View style={{
          position: 'absolute', backgroundColor: tipColor, borderRadius: 2,
          width: nW * 1.6, height: COMPASS_SIZE * 0.29,
          left: CX - nW * 0.8, top: COMPASS_SIZE * 0.1 + tipH,
        }} />
        <Text style={[styles.needleKaaba, { top: COMPASS_SIZE * 0.065, left: CX - 9 }]}>🕋</Text>
        <View style={[styles.pivotOuter, {
          backgroundColor: theme.card, borderColor: ringColor, left: CX - 12, top: CX - 12,
        }]} />
        <View style={[styles.pivotInner, { backgroundColor: ringColor, left: CX - 5, top: CX - 5 }]} />
        <View style={{
          position: 'absolute', backgroundColor: tailColor, borderRadius: 2,
          width: nW, height: COMPASS_SIZE * 0.21,
          left: CX - nW / 2, top: CX + 13,
        }} />
        <View style={[styles.tailTriangle, {
          borderLeftWidth: nW, borderRightWidth: nW,
          borderTopWidth: 14, borderTopColor: tailColor,
          left: CX - nW, top: CX + 13 + COMPASS_SIZE * 0.21,
        }]} />
      </Animated.View>
    </View>
  );
}

export function QiblaScreen() {
  const { t }    = useTranslation();
  const theme    = useTheme();
  const location = useSelector((s: RootState) => s.user.location);
  const { heading, accuracy, supported } = useCompassHeading(2);
  const [needleStyle, setNeedleStyle] = useState<NeedleStyle>('classic');

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
    Platform.OS === 'ios' && typeof accuracy === 'number' &&
    (accuracy < 0 || accuracy > 20);

  const cityName = location?.city ?? (location ? `${location.lat.toFixed(1)}°N` : null);

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={[styles.chip, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
          <Text style={{ fontSize: 12 }}>🧭</Text>
          <Text style={[styles.chipText, { color: theme.accent }]}>Qibla Finder</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Qibla Direction</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          Direction of prayer toward the Holy Kaaba
        </Text>
      </View>

      {!location && (
        <View style={[styles.alertBox, { backgroundColor: theme.card, borderColor: theme.divider }]}>
          <Text style={[styles.alertTitle, { color: theme.accent }]}>📍 Location not set</Text>
          <Text style={[styles.alertBody, { color: theme.subText }]}>
            Go to Settings and detect your location to calculate your Qibla direction.
          </Text>
        </View>
      )}

      {location && bearing != null && (
        <View style={[styles.infoRow, { backgroundColor: theme.card, borderColor: theme.divider }]}>
          <View style={styles.infoCell}>
            <Text style={[styles.infoVal, { color: theme.text }]}>{bearing.toFixed(0)}°</Text>
            <Text style={[styles.infoLab, { color: theme.subText }]}>{compassPoint(bearing)}</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: theme.divider }]} />
          <View style={styles.infoCell}>
            <Text style={[styles.infoVal, { color: theme.text }]}>{formatDistance(distKm!)}</Text>
            <Text style={[styles.infoLab, { color: theme.subText }]}>from Kaaba</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: theme.divider }]} />
          <View style={styles.infoCell}>
            <Text style={[styles.infoVal, { color: theme.accent }]} numberOfLines={1}>{cityName ?? '—'}</Text>
            <Text style={[styles.infoLab, { color: theme.subText }]}>location</Text>
          </View>
        </View>
      )}

      <View style={[styles.compassCard, {
        backgroundColor: theme.card, borderColor: aligned ? '#22c55e40' : theme.divider,
      }]}>
        {supported && heading != null ? (
          <View style={[styles.badge, { backgroundColor: '#0D2B1A', borderColor: '#22c55e40' }]}>
            <View style={styles.liveDot} />
            <Text style={[styles.badgeText, { color: '#22c55e' }]}>Live compass active</Text>
          </View>
        ) : !supported ? (
          <View style={[styles.badge, { backgroundColor: theme.accentSoft, borderColor: theme.divider }]}>
            <Text style={[styles.badgeText, { color: theme.subText }]}>No sensor — static bearing</Text>
          </View>
        ) : null}

        {bearing != null ? (
          <CompassRose
            rotation={rotAnim} aligned={aligned} noSensor={!supported}
            needleStyle={needleStyle} theme={theme}
          />
        ) : (
          <View style={[styles.emptyCompass, { borderColor: theme.divider }]}>
            <Text style={{ fontSize: 52 }}>🧭</Text>
            <Text style={[styles.emptyText, { color: theme.subText }]}>Set location first</Text>
          </View>
        )}

        {aligned && (
          <View style={[styles.alignedBanner, { backgroundColor: '#16a34a' }]}>
            <Text style={styles.alignedText}>✓  You&apos;re facing the Qibla!</Text>
          </View>
        )}

        {needsCalibration && (
          <View style={[styles.calibBox, { backgroundColor: theme.card, borderColor: theme.divider }]}>
            <Text style={[styles.calibText, { color: theme.accent }]}>
              ⚠️  Wave device in a figure-8 to calibrate
            </Text>
          </View>
        )}

        {heading != null && (
          <Text style={[styles.debugText, { color: theme.subText }]}>
            heading {heading.toFixed(1)}°{accuracy != null ? `  ±${accuracy.toFixed(0)}°` : ''}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.subText }]}>NEEDLE STYLE</Text>
        <View style={styles.styleRow}>
          {(Object.keys(STYLE_INFO) as NeedleStyle[]).map((s) => {
            const active = needleStyle === s;
            const info   = STYLE_INFO[s];
            return (
              <Pressable
                key={s}
                onPress={() => setNeedleStyle(s)}
                style={[styles.styleBtn, {
                  backgroundColor: active ? theme.accentSoft : theme.card,
                  borderColor: active ? theme.accent : theme.divider,
                }]}
              >
                <Text style={{ fontSize: 20 }}>{info.emoji}</Text>
                <Text style={[styles.styleBtnLabel, { color: active ? theme.accent : theme.text }]}>
                  {info.label}
                </Text>
                <Text style={[styles.styleBtnDesc, { color: theme.subText }]}>{info.desc}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.instructCard, { backgroundColor: theme.card, borderColor: theme.divider }]}>
        <Text style={[styles.instructTitle, { color: theme.accent }]}>🕋  How to use</Text>
        {[
          'Hold your phone flat and level with the ground.',
          'The needle tip (🕋) always points toward the Holy Kaaba in Makkah.',
          'Rotate your body until the needle points straight up — that is Qibla.',
          'Screen glows green when you are within 5° of the correct direction.',
          'If the needle feels off, wave the phone in a figure-8 to re-calibrate.',
        ].map((step, i) => (
          <View key={i} style={styles.instructRow}>
            <View style={[styles.instructDot, { backgroundColor: theme.emerald }]} />
            <Text style={[styles.instructText, { color: theme.subText }]}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.kaabaCard, { backgroundColor: theme.card, borderColor: theme.divider }]}>
        <Text style={{ fontSize: 26 }}>🕋</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kaabaTitle, { color: theme.text }]}>Masjid al-Haram · Makkah</Text>
          <Text style={[styles.kaabaSub, { color: theme.subText }]}>
            21.4225°N, 39.8262°E · Great-circle bearing
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  header: { width: '100%', marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 8,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13 },
  alertBox: { width: '100%', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  alertTitle: { fontWeight: '700', fontSize: 14, marginBottom: 4 },
  alertBody: { fontSize: 12, lineHeight: 18 },
  infoRow: {
    flexDirection: 'row', width: '100%', borderWidth: 1, borderRadius: 14,
    marginBottom: 14, overflow: 'hidden',
  },
  infoCell: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  infoVal: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  infoLab: { fontSize: 10, marginTop: 2 },
  infoDivider: { width: 1 },
  compassCard: {
    width: '100%', borderWidth: 1, borderRadius: 24, padding: 18,
    marginBottom: 14, alignItems: 'center', gap: 12,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  compassOuter: { borderWidth: 2, borderRadius: 999, position: 'relative' },
  ring: { position: 'absolute', borderWidth: 1, borderRadius: 999 },
  cardinal: { position: 'absolute', width: 22, textAlign: 'center', zIndex: 10 },
  kaabaFixed: { position: 'absolute', fontSize: 18, zIndex: 10 },
  needleContainer: { position: 'absolute', top: 0, left: 0 },
  tipTriangle: {
    position: 'absolute', width: 0, height: 0,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  needleKaaba: { position: 'absolute', fontSize: 13, zIndex: 12 },
  pivotOuter: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 2.5 },
  pivotInner: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  tailTriangle: {
    position: 'absolute', width: 0, height: 0,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  emptyCompass: {
    width: COMPASS_SIZE, height: COMPASS_SIZE, borderRadius: COMPASS_SIZE / 2,
    borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  emptyText: { fontSize: 13 },
  alignedBanner: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16 },
  alignedText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  calibBox: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 10 },
  calibText: { fontSize: 12, textAlign: 'center' },
  debugText: { fontSize: 10, fontVariant: ['tabular-nums'] },
  section: { width: '100%', marginBottom: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  styleRow: { flexDirection: 'row', gap: 8 },
  styleBtn: { flex: 1, alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 14, gap: 4 },
  styleBtnLabel: { fontSize: 13, fontWeight: '600' },
  styleBtnDesc: { fontSize: 10 },
  instructCard: {
    width: '100%', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12,
  },
  instructTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  instructRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  instructDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  instructText: { flex: 1, fontSize: 13, lineHeight: 19 },
  kaabaCard: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 14,
  },
  kaabaTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  kaabaSub: { fontSize: 11 },
});
