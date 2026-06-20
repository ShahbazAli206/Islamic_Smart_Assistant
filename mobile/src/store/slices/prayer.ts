import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PrayerDay {
  date: string;
  timezone?: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

const slice = createSlice({
  name: 'prayer',
  initialState: { today: null as PrayerDay | null, upcoming: [] as PrayerDay[] },
  reducers: {
    setToday(state, a: PayloadAction<PrayerDay>) { state.today = a.payload; },
    setUpcoming(state, a: PayloadAction<PrayerDay[]>) { state.upcoming = a.payload; },
  },
});

export const { setToday, setUpcoming } = slice.actions;
export const prayerReducer = slice.reducer;
