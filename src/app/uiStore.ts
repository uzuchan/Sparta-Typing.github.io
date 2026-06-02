import { create } from "zustand";
import { db } from "../db/db";
import { setSoundEnabled } from "../lib/sfx";
import type { Mode } from "../types";

type UiStore = {
  soundEnabled: boolean;
  themeMode: Mode;
  loaded: boolean;
  setThemeMode: (mode: Mode) => void;
  toggleSound: () => void;
  loadPrefs: () => Promise<void>;
};

function applyTheme(mode: Mode) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-mode", mode);
  }
}

export const useUiStore = create<UiStore>((set, get) => ({
  soundEnabled: true,
  themeMode: "practice",
  loaded: false,

  setThemeMode: (mode) => {
    applyTheme(mode);
    set({ themeMode: mode });
  },

  toggleSound: () => {
    const next = !get().soundEnabled;
    setSoundEnabled(next);
    void db.userPrefs.put({ key: "soundEnabled", value: String(next) });
    set({ soundEnabled: next });
  },

  loadPrefs: async () => {
    const pref = await db.userPrefs.get("soundEnabled");
    const enabled = pref ? pref.value === "true" : true;
    setSoundEnabled(enabled);
    applyTheme(get().themeMode);
    set({ soundEnabled: enabled, loaded: true });
  },
}));
