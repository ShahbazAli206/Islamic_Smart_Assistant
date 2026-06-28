import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';

import { RootState } from '../store';
import { useTheme } from '../theme';

// Onboarding
import { WelcomeScreen }  from '../screens/onboarding/Welcome';
import { LanguageScreen } from '../screens/onboarding/Language';
import { SectScreen }     from '../screens/onboarding/Sect';
import { LocationScreen } from '../screens/onboarding/Location';
import { MosqueScreen }   from '../screens/onboarding/Mosque';

// Main tabs
import { DashboardScreen }    from '../screens/dashboard/Dashboard';
import { PrayerTimesScreen }  from '../screens/prayer/PrayerTimesScreen';
import { QuranPlayerScreen }  from '../screens/quran/QuranPlayer';
import { QiblaScreen }        from '../screens/qibla/QiblaScreen';
import { AzanSettingsScreen } from '../screens/azan/AzanSettings';

// Stack-only screens
import { MenuScreen }            from '../screens/menu/Menu';
import { RecitationAlarmScreen } from '../screens/recitation/RecitationAlarm';
import { ProfileScreen }         from '../screens/profile/Profile';
import { DevicesScreen }         from '../screens/devices/Devices';
import { AudioScreen }           from '../screens/audio/Audio';
import { AnalyticsScreen }       from '../screens/analytics/Analytics';
import { SettingsScreen }        from '../screens/settings/Settings';
import { QuranSchedulerScreen }  from '../screens/quran/QuranScheduler';

const Stack = createNativeStackNavigator();
const Tabs  = createBottomTabNavigator();

// ─── Tab icon ──────────────────────────────────────────────────────────────────
function TabIcon({
  label, focused, color, activeColor,
}: {
  label: string; focused: boolean; color: string; activeColor: string;
}) {
  const icons: Record<string, { active: string; inactive: string }> = {
    Home:    { active: '🏠', inactive: '🏠' },
    Prayers: { active: '⏰', inactive: '⏰' },
    Quran:   { active: '📖', inactive: '📖' },
    Qibla:   { active: '🧭', inactive: '🧭' },
    Azan:    { active: '🔔', inactive: '🔔' },
  };
  const icon = icons[label] ?? { active: '●', inactive: '○' };
  return (
    <View style={ti.wrap}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{focused ? icon.active : icon.inactive}</Text>
      {focused && <View style={[ti.indicator, { backgroundColor: activeColor }]} />}
    </View>
  );
}

const ti = StyleSheet.create({
  wrap:      { alignItems: 'center', justifyContent: 'center', width: 36, height: 36 },
  indicator: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});

// ─── Tab navigator ──────────────────────────────────────────────────────────────
function MainTabs() {
  const theme  = useTheme();
  const isDark = theme.scheme === 'dark';

  const tabBarBg     = isDark ? '#0A1220' : '#FFFFFF';
  const accentColor  = theme.accent;

  const stackHeaderStyle: any = {
    backgroundColor: isDark ? '#0E1B2A' : theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  };

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor: theme.divider,
          borderTopWidth: 1,
          height: 66,
          paddingBottom: 10,
          paddingTop: 6,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.4 : 0.08,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarActiveTintColor:   accentColor,
        tabBarInactiveTintColor: theme.subText,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Home" focused={focused} color={color} activeColor={accentColor} />
          ),
        }}
      />
      <Tabs.Screen
        name="Prayers"
        component={PrayerTimesScreen}
        options={{
          title: 'Prayers',
          headerShown: true,
          headerTitle: 'Prayer Times',
          headerStyle: stackHeaderStyle,
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '700' },
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Prayers" focused={focused} color={color} activeColor={accentColor} />
          ),
        }}
      />
      <Tabs.Screen
        name="Quran"
        component={QuranPlayerScreen}
        options={{
          title: 'Quran',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Quran" focused={focused} color={color} activeColor={accentColor} />
          ),
        }}
      />
      <Tabs.Screen
        name="Qibla"
        component={QiblaScreen}
        options={{
          title: 'Qibla',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Qibla" focused={focused} color={color} activeColor={accentColor} />
          ),
        }}
      />
      <Tabs.Screen
        name="Azan"
        component={AzanSettingsScreen}
        options={{
          title: 'Azan Voices',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Azan" focused={focused} color={color} activeColor={accentColor} />
          ),
        }}
      />
    </Tabs.Navigator>
  );
}

// ─── Root navigator ──────────────────────────────────────────────────────────
export function RootNavigator() {
  const onboardingComplete = useSelector((s: RootState) => s.user.onboardingComplete);
  const theme  = useTheme();
  const isDark = theme.scheme === 'dark';

  const stackHeaderStyle: any = {
    backgroundColor: isDark ? '#0E1B2A' : theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!onboardingComplete ? (
        <>
          <Stack.Screen name="Welcome"  component={WelcomeScreen}  />
          <Stack.Screen name="Language" component={LanguageScreen} />
          <Stack.Screen name="Sect"     component={SectScreen}     />
          <Stack.Screen name="Location" component={LocationScreen} />
          <Stack.Screen name="Mosque"   component={MosqueScreen}   />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="More"
            component={MenuScreen}
            options={{
              headerShown: true, title: 'More',
              headerStyle: stackHeaderStyle, headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="PrayerTimes"
            component={PrayerTimesScreen}
            options={{
              headerShown: true, title: 'Prayer Times',
              headerStyle: stackHeaderStyle, headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="Recitation"
            component={RecitationAlarmScreen}
            options={{
              headerShown: true, title: 'Recitation Alarm',
              headerStyle: stackHeaderStyle, headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              headerShown: true, title: 'Profile',
              headerStyle: stackHeaderStyle, headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="Devices"
            component={DevicesScreen}
            options={{
              headerShown: true, title: 'Devices',
              headerStyle: stackHeaderStyle, headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="Audio"
            component={AudioScreen}
            options={{
              headerShown: true, title: 'Audio Library',
              headerStyle: stackHeaderStyle, headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="Analytics"
            component={AnalyticsScreen}
            options={{
              headerShown: true, title: 'Analytics',
              headerStyle: stackHeaderStyle, headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: true, title: 'Settings',
              headerStyle: stackHeaderStyle, headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="QuranScheduler"
            component={QuranSchedulerScreen}
            options={{
              headerShown: true, title: 'Quran Recitation Schedule',
              headerStyle: stackHeaderStyle, headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
