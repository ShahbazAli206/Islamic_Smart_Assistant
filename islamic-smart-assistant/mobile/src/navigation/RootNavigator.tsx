import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { RootState } from '../store';
import { useTheme } from '../theme';

import { WelcomeScreen } from '../screens/onboarding/Welcome';
import { LanguageScreen } from '../screens/onboarding/Language';
import { SectScreen } from '../screens/onboarding/Sect';
import { LocationScreen } from '../screens/onboarding/Location';
import { MosqueScreen } from '../screens/onboarding/Mosque';

import { DashboardScreen } from '../screens/dashboard/Dashboard';
import { AzanSettingsScreen } from '../screens/azan/AzanSettings';
import { QuranPlayerScreen } from '../screens/quran/QuranPlayer';
import { QuranSchedulerScreen } from '../screens/quran/QuranScheduler';
import { QiblaScreen } from '../screens/qibla/QiblaScreen';
import { DevicesScreen } from '../screens/devices/Devices';
import { SettingsScreen } from '../screens/settings/Settings';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function TabIcon({ emoji, focused, color }: { emoji: string; focused: boolean; color: string }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={[styles.tabEmoji, { opacity: focused ? 1 : 0.55 }]}>{emoji}</Text>
      {focused && <View style={[styles.tabDot, { backgroundColor: color }]} />}
    </View>
  );
}

function MainTabs() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.scheme === 'dark';

  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? '#0E1B2A' : theme.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.divider,
        } as any,
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
          title: t('tabs.home'),
          headerTitle: 'Islamic Smart Assistant',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🕌" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Quran"
        component={QuranPlayerScreen}
        options={{
          title: t('tabs.quran'),
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="📖" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Qibla"
        component={QiblaScreen}
        options={{
          title: t('tabs.qibla'),
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🧭" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Azan"
        component={AzanSettingsScreen}
        options={{
          title: t('tabs.azan'),
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🔔" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Devices"
        component={DevicesScreen}
        options={{
          title: t('tabs.devices'),
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="📱" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="⚙️" focused={focused} color={color} />,
        }}
      />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const onboardingComplete = useSelector((s: RootState) => s.user.onboardingComplete);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!onboardingComplete ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Language" component={LanguageScreen} />
          <Stack.Screen name="Sect" component={SectScreen} />
          <Stack.Screen name="Location" component={LocationScreen} />
          <Stack.Screen name="Mosque" component={MosqueScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="QuranScheduler" component={QuranSchedulerScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: 'center', justifyContent: 'center', width: 32, height: 32 },
  tabIconActive: {},
  tabEmoji: { fontSize: 22 },
  tabDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});
