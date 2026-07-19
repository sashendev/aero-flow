import { useCallback, useEffect, useState } from "react";
import type { UnitSystem } from "@/lib/units";

export type Theme = "light" | "dark" | "system";

export interface Settings {
  theme: Theme;
  units: UnitSystem;
  refreshIntervalMs: number;
  markerSize: number;
  animations: boolean;
  mapStyle: "dark" | "light";
}

const DEFAULTS: Settings = {
  theme: "dark",
  units: "metric",
  refreshIntervalMs: 15_000,
  markerSize: 1.15,
  animations: true,
  mapStyle: "dark",
};

const STORAGE_KEY = "aeroflow.settings.v1";

function readStorage(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const next = readStorage();
    setSettings(next);
    applyTheme(next.theme);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (settings.theme !== "system" || typeof window === "undefined") return;
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const handle = () => applyTheme("system");
    media.addEventListener("change", handle);
    return () => media.removeEventListener("change", handle);
  }, [settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Non-fatal in private windows or quota-limited storage.
      }
      if (patch.theme) applyTheme(patch.theme);
      return next;
    });
  }, []);

  return { settings, update, hydrated };
}
