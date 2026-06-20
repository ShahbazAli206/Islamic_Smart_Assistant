import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserState {
  language: string;
  sect: 'sunni' | 'shia' | null;
  fiqh_method: 'hanafi' | 'shafi' | 'maliki' | 'hanbali' | 'jafari' | null;
  location: { lat: number; lng: number; timezone: string; city?: string; country?: string } | null;
  onboardingComplete: boolean;
}

const slice = createSlice({
  name: 'user',
  initialState: { language: 'en', sect: null, fiqh_method: null, location: null, onboardingComplete: false } as UserState,
  reducers: {
    setLanguage(state, a: PayloadAction<string>) { state.language = a.payload; },
    setSect(state, a: PayloadAction<UserState['sect']>) { state.sect = a.payload; },
    setFiqh(state, a: PayloadAction<UserState['fiqh_method']>) { state.fiqh_method = a.payload; },
    setLocation(state, a: PayloadAction<UserState['location']>) { state.location = a.payload; },
    completeOnboarding(state) { state.onboardingComplete = true; },
  },
});

export const { setLanguage, setSect, setFiqh, setLocation, completeOnboarding } = slice.actions;
export const userReducer = slice.reducer;
