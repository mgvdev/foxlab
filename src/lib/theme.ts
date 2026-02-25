import type { ThemeMode } from "@/lib/types";

export function applyThemeMode(theme: ThemeMode): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
}
