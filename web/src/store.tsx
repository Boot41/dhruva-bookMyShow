import { create } from 'zustand';
import type { City } from './Api/CitiesAPI';

interface AppState {
  selectedCity: City | null;
  setSelectedCity: (city: City | null) => void;
  clearSelectedCity: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
  selectedCity: null,
  setSelectedCity: (city) => set({ selectedCity: city }),
  clearSelectedCity: () => set({ selectedCity: null }),
}));