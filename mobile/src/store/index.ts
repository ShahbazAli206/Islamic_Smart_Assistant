import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authReducer } from './slices/auth';
import { userReducer } from './slices/user';
import { prayerReducer } from './slices/prayer';
import { azanReducer } from './slices/azan';

const root = combineReducers({
  auth: authReducer,
  user: userReducer,
  prayer: prayerReducer,
  azan: azanReducer,
});

const persisted = persistReducer({ key: 'root', storage: AsyncStorage, whitelist: ['auth', 'user', 'azan'] }, root);

export const store = configureStore({
  reducer: persisted,
  middleware: (gdm) => gdm({ serializableCheck: false }),
});
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
