import type { ThemeMode, ThemePreset } from "@/lib/types";

export function applyThemeMode(theme: ThemeMode, preset: ThemePreset): void {
  const root = document.documentElement;

  root.setAttribute("data-theme", theme);
  root.setAttribute("data-theme-preset", preset);
  root.classList.toggle("dark", theme === "dark");
}
