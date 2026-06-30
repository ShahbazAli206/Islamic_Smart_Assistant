import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { store, persistor } from './src/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useColorScheme, ThemeProvider } from './src/theme';
import { setupI18n } from './src/i18n';
import i18n from './src/i18n';
import { initAudioPlayer } from './src/services/audio';
import { initRealtimeSync } from './src/services/sync';
import { initBackgroundScheduler } from './src/services/background';
import { useSelector } from 'react-redux';
import { RootState } from './src/store';

setupI18n();

function I18nSync() {
  const language = useSelector((s: RootState) => s.user.language);
  useEffect(() => { if (language) i18n.changeLanguage(language); }, [language]);
  return null;
}

export default function App() {
  const scheme = useColorScheme();

  useEffect(() => {
    initAudioPlayer();
    initRealtimeSync();
    initBackgroundScheduler();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <I18nSync />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <ThemeProvider scheme={scheme}>
              <NavigationContainer>
                <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
                <RootNavigator />
              </NavigationContainer>
            </ThemeProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
}
