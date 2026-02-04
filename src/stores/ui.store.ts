import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  hydrate: () => Promise<void>;
}

const STORAGE_KEY = "ui_sidebar_collapsed";

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,

  toggleSidebar: async () => {
    const next = !get().sidebarCollapsed;
    set({ sidebarCollapsed: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  hydrate: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      set({ sidebarCollapsed: JSON.parse(stored) });
    }
  },
}));
