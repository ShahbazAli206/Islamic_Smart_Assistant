import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

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
import { QuranPlayerScreen }  from '../screens/quran/QuranPlayer';
import { QiblaScreen }        from '../screens/qibla/QiblaScreen';
import { AzanSettingsScreen } from '../screens/azan/AzanSettings';
import { MenuScreen }         from '../screens/menu/Menu';

// Stack-only screens (accessible via Menu)
import { PrayerTimesScreen }    from '../screens/prayer/PrayerTimesScreen';
import { RecitationAlarmScreen } from '../screens/recitation/RecitationAlarm';
import { ProfileScreen }        from '../screens/profile/Profile';
import { DevicesScreen }        from '../screens/devices/Devices';
import { AudioScreen }          from '../screens/audio/Audio';
import { AnalyticsScreen }      from '../screens/analytics/Analytics';
import { SettingsScreen }       from '../screens/settings/Settings';
import { QuranSchedulerScreen } from '../screens/quran/QuranScheduler';

const Stack = createNativeStackNavigator();
const Tabs  = createBottomTabNavigator();

function TabIcon({ emoji, focused, color }: { emoji: string; focused: boolean; color: string }) {
  return (
    <View style={[styles.tabIcon]}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
      {focused && <View style={[styles.tabDot, { backgroundColor: color }]} />}
    </View>
  );
}

function MainTabs() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.scheme === 'dark';

  const headerStyle: any = {
    backgroundColor: isDark ? '#0E1B2A' : theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  };

  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle,
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        tabBarStyle: {
          backgroundColor: isDark ? '#0E1B2A' : theme.card,
          borderTopColor: theme.divider,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.subText,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: 'Home',
          headerTitle: 'Islamic Smart Assistant',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🕌" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Quran"
        component={QuranPlayerScreen}
        options={{
          title: 'Quran',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="📖" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Qibla"
        component={QiblaScreen}
        options={{
          title: 'Qibla',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🧭" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Azan"
        component={AzanSettingsScreen}
        options={{
          title: 'Azan',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🔔" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="More"
        component={MenuScreen}
        options={{
          title: 'More',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="☰" focused={focused} color={color} />,
        }}
      />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const onboardingComplete = useSelector((s: RootState) => s.user.onboardingComplete);
  const theme = useTheme();
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
          <Stack.Screen name="Welcome"  component={WelcomeScreen} />
          <Stack.Screen name="Language" component={LanguageScreen} />
          <Stack.Screen name="Sect"     component={SectScreen} />
          <Stack.Screen name="Location" component={LocationScreen} />
          <Stack.Screen name="Mosque"   component={MosqueScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          {/* All pages reachable from Menu tab */}
          <Stack.Screen
            name="PrayerTimes"
            component={PrayerTimesScreen}
            options={{
              headerShown: true, title: 'Prayer Times',
              headerStyle: stackHeaderStyle,
              headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="Recitation"
            component={RecitationAlarmScreen}
            options={{
              headerShown: true, title: 'Recitation Alarm',
              headerStyle: stackHeaderStyle,
              headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              headerShown: true, title: 'Profile',
              headerStyle: stackHeaderStyle,
              headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="Devices"
            component={DevicesScreen}
            options={{
              headerShown: true, title: 'Devices',
              headerStyle: stackHeaderStyle,
              headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="Audio"
            component={AudioScreen}
            options={{
              headerShown: true, title: 'Audio Library',
              headerStyle: stackHeaderStyle,
              headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="Analytics"
            component={AnalyticsScreen}
            options={{
              headerShown: true, title: 'Analytics',
              headerStyle: stackHeaderStyle,
              headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: true, title: 'Settings',
              headerStyle: stackHeaderStyle,
              headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="QuranScheduler"
            component={QuranSchedulerScreen}
            options={{
              headerShown: true, title: 'Quran Scheduler',
              headerStyle: stackHeaderStyle,
              headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: 'center', justifyContent: 'center', width: 32, height: 32 },
  tabDot:  { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});
