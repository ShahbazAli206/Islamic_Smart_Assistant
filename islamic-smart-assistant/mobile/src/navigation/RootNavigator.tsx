import React from 'react';
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

function MainTabs() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.divider },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.subText,
      }}>
      <Tabs.Screen name="Home" component={DashboardScreen} options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="Quran" component={QuranPlayerScreen} options={{ title: t('tabs.quran') }} />
      <Tabs.Screen name="Qibla" component={QiblaScreen} options={{ title: t('tabs.qibla') }} />
      <Tabs.Screen name="Azan" component={AzanSettingsScreen} options={{ title: t('tabs.azan') }} />
      <Tabs.Screen name="Devices" component={DevicesScreen} options={{ title: t('tabs.devices') }} />
      <Tabs.Screen name="Settings" component={SettingsScreen} options={{ title: t('tabs.settings') }} />
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
