import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';

import { useTheme } from '../../theme';
import { RootState } from '../../store';
import { setLanguage, setSect, setFiqh, setLocation } from '../../store/slices/user';
import { detectLocation } from '../../services/location';

// ─── Language options ────────────────────────────────────────────────────────

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'ur', label: 'اردو' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'fr', label: 'Français' },
  { code: 'ps', label: 'پښتو' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
];

// ─── Fiqh options per sect ────────────────────────────────────────────────────

const SUNNI_FIQH: { value: 'hanafi' | 'shafi' | 'maliki' | 'hanbali'; label: string }[] = [
  { value: 'hanafi', label: 'Hanafi' },
  { value: 'shafi', label: "Shafi'i" },
  { value: 'maliki', label: 'Maliki' },
  { value: 'hanbali', label: 'Hanbali' },
];

const SHIA_FIQH: { value: 'jafari'; label: string }[] = [
  { value: 'jafari', label: "Ja'fari" },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.user);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Derive display initials / fallback
  const avatarLabel = '👤';

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      const loc = await detectLocation();
      dispatch(setLocation(loc));
    } catch (err: any) {
      Alert.alert('Location Error', err?.message ?? 'Could not detect location. Please try again.');
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSectSelect = (value: 'sunni' | 'shia') => {
    dispatch(setSect(value));
    dispatch(setFiqh(null)); // reset fiqh when sect changes
  };

  const fiqhOptions =
    user.sect === 'sunni' ? SUNNI_FIQH : user.sect === 'shia' ? SHIA_FIQH : [];

  const s = makeStyles(theme);

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={[s.headerChip, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
          <Text style={[s.headerChipText, { color: theme.accent }]}>Profile</Text>
        </View>
        <Text style={[s.headerTitle, { color: theme.text }]}>My Profile</Text>
        <Text style={[s.headerSubtitle, { color: theme.subText }]}>
          Preferences, location and account settings
        </Text>
      </View>

      {/* ── Avatar ── */}
      <View style={s.avatarSection}>
        <View style={[s.avatarCircle, { backgroundColor: theme.cardAlt, borderColor: theme.accent }]}>
          <Text style={s.avatarEmoji}>{avatarLabel}</Text>
        </View>
        <Text style={[s.avatarHint, { color: theme.subText }]}>Tap to change photo</Text>
      </View>

      {/* ── Language ── */}
      <View style={s.section}>
        <Text style={[s.sectionLabel, { color: theme.subText }]}>LANGUAGE</Text>
        <View style={s.chipGrid}>
          {LANGUAGES.map((lang) => {
            const active = user.language === lang.code;
            return (
              <Pressable
                key={lang.code}
                style={[
                  s.gridChip,
                  {
                    backgroundColor: active ? theme.emeraldSoft : theme.card,
                    borderColor: active ? theme.emerald : theme.divider,
                  },
                ]}
                onPress={() => dispatch(setLanguage(lang.code))}
              >
                <Text
                  style={[
                    s.gridChipText,
                    { color: active ? theme.emerald : theme.text },
                  ]}
                  numberOfLines={1}
                >
                  {lang.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Sect ── */}
      <View style={s.section}>
        <Text style={[s.sectionLabel, { color: theme.subText }]}>SECT</Text>
        <View style={s.chipRow}>
          {(['sunni', 'shia'] as const).map((sect) => {
            const active = user.sect === sect;
            return (
              <Pressable
                key={sect}
                style={[
                  s.rowChip,
                  {
                    backgroundColor: active ? theme.emeraldSoft : theme.card,
                    borderColor: active ? theme.emerald : theme.divider,
                  },
                ]}
                onPress={() => handleSectSelect(sect)}
              >
                <Text style={[s.rowChipText, { color: active ? theme.emerald : theme.text }]}>
                  {sect === 'sunni' ? 'Sunni' : 'Fiqah Jafri'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Fiqh ── */}
      <View style={s.section}>
        <Text style={[s.sectionLabel, { color: theme.subText }]}>FIQH SCHOOL</Text>
        {user.sect == null ? (
          <Text style={[s.noSectText, { color: theme.subText }]}>Select a sect first</Text>
        ) : (
          <View style={s.chipRow}>
            {fiqhOptions.map((opt) => {
              const active = user.fiqh_method === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[
                    s.rowChip,
                    {
                      backgroundColor: active ? theme.emeraldSoft : theme.card,
                      borderColor: active ? theme.emerald : theme.divider,
                    },
                  ]}
                  onPress={() => dispatch(setFiqh(opt.value))}
                >
                  <Text style={[s.rowChipText, { color: active ? theme.emerald : theme.text }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Location ── */}
      <View style={s.section}>
        <Text style={[s.sectionLabel, { color: theme.subText }]}>LOCATION</Text>
        <View style={[s.locationCard, { backgroundColor: theme.card, borderColor: theme.divider }]}>
          {user.location ? (
            <View style={s.locationInfo}>
              <Text style={[s.locationPrimary, { color: theme.text }]}>
                {user.location.city
                  ? `${user.location.city}${user.location.country ? `, ${user.location.country}` : ''}`
                  : `${user.location.lat.toFixed(4)}, ${user.location.lng.toFixed(4)}`}
              </Text>
              <Text style={[s.locationSecondary, { color: theme.subText }]}>
                {user.location.timezone}
              </Text>
              {!user.location.city && (
                <Text style={[s.locationCoords, { color: theme.subText }]}>
                  {`${user.location.lat.toFixed(5)}, ${user.location.lng.toFixed(5)}`}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[s.locationEmpty, { color: theme.subText }]}>
              No location set. Tap below to detect.
            </Text>
          )}

          <Pressable
            style={[s.detectButton, { borderColor: theme.accent, backgroundColor: theme.accentSoft }]}
            onPress={handleDetectLocation}
            disabled={detectingLocation}
          >
            {detectingLocation ? (
              <ActivityIndicator color={theme.accent} size="small" />
            ) : (
              <Text style={[s.detectButtonText, { color: theme.accent }]}>
                Detect my location
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* ── Save confirmation ── */}
      <Text style={[s.savedNote, { color: theme.subText }]}>
        ✓ Preferences saved automatically
      </Text>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(theme: ReturnType<typeof import('../../theme').useTheme>) {
  return StyleSheet.create({
    content: {
      padding: 16,
      paddingBottom: 48,
    },

    // Header
    header: {
      marginBottom: 24,
    },
    headerChip: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
      marginBottom: 10,
    },
    headerChipText: {
      fontSize: 12,
      fontWeight: '600',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 0.2,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      lineHeight: 20,
    },

    // Avatar
    avatarSection: {
      alignItems: 'center',
      marginBottom: 28,
    },
    avatarCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    avatarEmoji: {
      fontSize: 42,
    },
    avatarHint: {
      fontSize: 12,
    },

    // Section
    section: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      marginBottom: 10,
    },

    // 2-column chip grid (language)
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    gridChip: {
      width: '47.5%',
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    gridChipText: {
      fontSize: 14,
      fontWeight: '500',
    },

    // Horizontal chip row (sect / fiqh)
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    rowChip: {
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 9,
      paddingHorizontal: 18,
    },
    rowChipText: {
      fontSize: 14,
      fontWeight: '500',
    },

    noSectText: {
      fontSize: 13,
      fontStyle: 'italic',
    },

    // Location
    locationCard: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      gap: 12,
    },
    locationInfo: {
      gap: 2,
    },
    locationPrimary: {
      fontSize: 16,
      fontWeight: '600',
    },
    locationSecondary: {
      fontSize: 13,
    },
    locationCoords: {
      fontSize: 12,
      marginTop: 2,
    },
    locationEmpty: {
      fontSize: 13,
      fontStyle: 'italic',
    },
    detectButton: {
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
    },
    detectButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },

    // Footer note
    savedNote: {
      textAlign: 'center',
      fontSize: 12,
      marginTop: 8,
    },
  });
}
