export const themes = ["light", "dark", "canarinho", "dictador"] as const;

export type Theme = (typeof themes)[number];

export const themeLabels: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  canarinho: "Canarinho",
  dictador: "Dictador",
};

export const themeStorageKey = "mazing-bolao-theme";
export const themeLockStorageKey = "mazing-bolao-theme-lock";

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
  window.dispatchEvent(new CustomEvent("mazing-theme-change", { detail: theme }));
}

export function getThemeLock(): Theme | null {
  if (typeof window === "undefined") return null;

  const lockedTheme = window.localStorage.getItem(themeLockStorageKey);
  return isTheme(lockedTheme) ? lockedTheme : null;
}

export function setThemeLock(theme: Theme | null) {
  if (theme) {
    window.localStorage.setItem(themeLockStorageKey, theme);
  } else {
    window.localStorage.removeItem(themeLockStorageKey);
  }

  window.dispatchEvent(new CustomEvent("mazing-theme-lock-change", { detail: theme }));
}
