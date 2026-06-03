export const themes = ["light", "dark", "canarinho"] as const;

export type Theme = (typeof themes)[number];

export const themeLabels: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  canarinho: "Canarinho",
};

export const themeStorageKey = "mazing-bolao-theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && themes.includes(value as Theme);
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const storedTheme = window.localStorage.getItem(themeStorageKey);
  return isTheme(storedTheme) ? storedTheme : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.remove(...themes);
  document.documentElement.classList.add(theme);
  document.documentElement.dataset.theme = theme;
}
