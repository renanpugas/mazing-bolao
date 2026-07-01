import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { applyTheme, getStoredTheme, getThemeLock, isTheme, themeLabels, themes, themeStorageKey, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [themeLock, setThemeLock] = useState<Theme | null>(getThemeLock);
  const availableThemes = themeLock ? themes.filter((themeOption) => themeOption === themeLock) : themes;

  useEffect(() => {
    const nextTheme = themeLock ?? theme;
    applyTheme(nextTheme);
    window.localStorage.setItem(themeStorageKey, nextTheme);
    if (nextTheme !== theme) setTheme(nextTheme);
  }, [theme, themeLock]);

  useEffect(() => {
    const updateThemeLock = (event: Event) => {
      const nextThemeLock = event instanceof CustomEvent ? event.detail : getThemeLock();
      setThemeLock(isTheme(nextThemeLock) ? nextThemeLock : null);
    };

    window.addEventListener("mazing-theme-lock-change", updateThemeLock);
    window.addEventListener("storage", updateThemeLock);

    return () => {
      window.removeEventListener("mazing-theme-lock-change", updateThemeLock);
      window.removeEventListener("storage", updateThemeLock);
    };
  }, []);

  return (
    <div className="flex rounded-full border bg-background/80 p-1 shadow-sm" aria-label="Theme selector">
      {availableThemes.map((themeOption) => (
        <Button
          key={themeOption}
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Selecionar tema ${themeLabels[themeOption]}`}
          aria-pressed={theme === themeOption}
          className={cn(
            "h-8 rounded-full px-2 text-xs",
            (themeOption === "canarinho" || themeOption === "dictador") && "px-2",
            theme === themeOption && "bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:text-primary-foreground",
          )}
          onClick={() => setTheme(themeOption)}
        >
          {themeOption === "light" ? (
            <>
              <Sun className="h-4 w-4" />
              <span className="sr-only">{themeLabels[themeOption]}</span>
            </>
          ) : themeOption === "dark" ? (
            <>
              <Moon className="h-4 w-4" />
              <span className="sr-only">{themeLabels[themeOption]}</span>
            </>
          ) : themeOption === "canarinho" ? (
            <>
              <img
                src="https://static.wixstatic.com/media/78f7fa_defca0c643e14c1ebfdd5b5ab34a990b~mv2_d_1200_1200_s_2.png/v1/fill/w_280,h_280,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/78f7fa_defca0c643e14c1ebfdd5b5ab34a990b~mv2_d_1200_1200_s_2.png"
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
              <span className="sr-only">{themeLabels[themeOption]}</span>
            </>
          ) : (
            <>
              <img src="/dictador.png" alt="" className="h-6 w-6 rounded-full object-cover object-top" />
              <span className="sr-only">{themeLabels[themeOption]}</span>
            </>
          )}
        </Button>
      ))}
    </div>
  );
}
