import type { ThemeMode, ThemePreset } from "@/lib/types";

const LEGACY_THEME_INLINE_VARS = [
  "--primary",
  "--ring",
  "--sidebar-primary",
  "--sidebar-ring",
  "--ui-ring",
  "--ui-accent",
] as const;

export function applyThemeMode(theme: ThemeMode, preset: ThemePreset): void {
  const root = document.documentElement;

  for (const variable of LEGACY_THEME_INLINE_VARS) {
    root.style.removeProperty(variable);
  }

  root.setAttribute("data-theme", theme);
  root.setAttribute("data-theme-preset", preset);
  root.classList.toggle("dark", theme === "dark");
}
