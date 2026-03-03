import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export interface OfflineAction {
  id: string;
  type: "MARK_NOTIFICATION_READ" | "SUBMIT_PAYMENT_PROOF";
  payload: Record<string, unknown>;
  createdAt: string;
}

interface OfflineActionState {
  actions: OfflineAction[];
  hydrate: () => Promise<void>;
  enqueue: (action: OfflineAction) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const STORAGE_KEY = "pnms_offline_actions";

const persistActions = async (actions: OfflineAction[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
};

export const useOfflineActionsStore = create<OfflineActionState>((set, get) => ({
  actions: [],

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        set({ actions: parsed });
      }
    } catch {
      set({ actions: [] });
    }
  },

  enqueue: async (action) => {
    const next = [action, ...get().actions].slice(0, 100);
    set({ actions: next });
    await persistActions(next);
  },

  remove: async (id) => {
    const next = get().actions.filter((action) => action.id !== id);
    set({ actions: next });
    await persistActions(next);
  },
}));
