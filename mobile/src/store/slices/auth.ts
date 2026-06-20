import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  userId: string | null;
  email: string | null;
}

const slice = createSlice({
  name: 'auth',
  initialState: { userId: null, email: null } as AuthState,
  reducers: {
    setUser(state, action: PayloadAction<{ id: string; email: string }>) {
      state.userId = action.payload.id;
      state.email = action.payload.email;
    },
    clearUser(state) {
      state.userId = null;
      state.email = null;
    },
  },
});

export const { setUser, clearUser } = slice.actions;
export const authReducer = slice.reducer;
