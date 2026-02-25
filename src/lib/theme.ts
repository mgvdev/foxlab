import type { ThemeMode, ThemePreset } from "@/lib/types";

const THEME_PRESET_ACCENTS: Record<ThemePreset, { light: string; dark: string }> = {
  zinc: { light: "hsl(240 5.9% 10%)", dark: "hsl(240 5.2% 86.9%)" },
  slate: { light: "hsl(215.4 16.3% 46.9%)", dark: "hsl(215.4 16.3% 66%)" },
  stone: { light: "hsl(25 5.3% 44.7%)", dark: "hsl(25 5.3% 62%)" },
  neutral: { light: "hsl(0 0% 45.1%)", dark: "hsl(0 0% 68%)" },
  red: { light: "hsl(0 72.2% 50.6%)", dark: "hsl(0 72.2% 62%)" },
  rose: { light: "hsl(346.8 77.2% 49.8%)", dark: "hsl(346.8 77.2% 64%)" },
  orange: { light: "hsl(20.5 90.2% 48.2%)", dark: "hsl(20.5 90.2% 61%)" },
  green: { light: "hsl(142.1 76.2% 36.3%)", dark: "hsl(142.1 70.6% 50%)" },
  blue: { light: "hsl(221.2 83.2% 53.3%)", dark: "hsl(217.2 91.2% 66%)" },
  yellow: { light: "hsl(47.9 95.8% 53.1%)", dark: "hsl(47.9 95.8% 63.1%)" },
  violet: { light: "hsl(262.1 83.3% 57.8%)", dark: "hsl(262.1 83.3% 69%)" },
};

export function applyThemeMode(theme: ThemeMode, preset: ThemePreset): void {
  const root = document.documentElement;
  const accent = THEME_PRESET_ACCENTS[preset] ?? THEME_PRESET_ACCENTS.orange;
  const activeAccent = theme === "dark" ? accent.dark : accent.light;

  root.setAttribute("data-theme", theme);
  root.setAttribute("data-theme-preset", preset);
  root.classList.toggle("dark", theme === "dark");
  root.style.setProperty("--primary", activeAccent);
  root.style.setProperty("--ring", activeAccent);
  root.style.setProperty("--sidebar-primary", activeAccent);
  root.style.setProperty("--sidebar-ring", activeAccent);
}
