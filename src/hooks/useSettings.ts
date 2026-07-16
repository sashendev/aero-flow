import { useCallback, useEffect, useState } from "react";
import type { UnitSystem } from "@/lib/units";

export type Theme = "light" | "dark" | "system";

export interface Settings {
  theme: Theme;
  units: UnitSystem;
  refreshIntervalMs: number;
  markerSize: number; // 0.7 – 1.5
  animations: boolean;
  mapStyle: "dark" | "light";
}

const DEFAULTS: Settings = {
  theme: "dark",
  units: "metric",
  refreshIntervalMs: 15_000,
  markerSize: 1.4,
  animations: true,
  mapStyle: "dark",
};

const STORAGE_KEY = "aeroflow.settings.v1";

function readStorage(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

// Applies .dark class based on user's setting + system preference.
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function useSettings() {
  // Render with defaults during SSR; read localStorage after mount to avoid
  // hydration mismatches.
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = readStorage();
    setSettings(s);
    applyTheme(s.theme);
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* quota / private mode — non-fatal */
      }
      if (patch.theme) applyTheme(patch.theme);
      return next;
    });
  }, []);

  return { settings, update, hydrated };
}
