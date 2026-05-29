import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AzanState {
  selected_voice: string;
  delay_minutes: number;
  auto_play_enabled: boolean;
  prayers_enabled: { fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean };
}

const slice = createSlice({
  name: 'azan',
  initialState: {
    selected_voice: 'makkah',
    delay_minutes: 0,
    auto_play_enabled: true,
    prayers_enabled: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  } as AzanState,
  reducers: {
    setVoice(state, a: PayloadAction<string>) { state.selected_voice = a.payload; },
    setDelay(state, a: PayloadAction<number>) { state.delay_minutes = a.payload; },
    setAutoPlay(state, a: PayloadAction<boolean>) { state.auto_play_enabled = a.payload; },
    togglePrayer(state, a: PayloadAction<keyof AzanState['prayers_enabled']>) {
      state.prayers_enabled[a.payload] = !state.prayers_enabled[a.payload];
    },
  },
});

export const { setVoice, setDelay, setAutoPlay, togglePrayer } = slice.actions;
export const azanReducer = slice.reducer;
