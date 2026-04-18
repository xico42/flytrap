import { useEffect, useState } from "react";
import { THEMES, type Theme } from "../themes";

const STORAGE_KEY = "flytrap-theme";

function isTheme(value: string | null): value is Theme {
  return value !== null && (THEMES as readonly string[]).includes(value);
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(STORAGE_KEY)
        : null;
    return isTheme(stored) ? stored : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <select
      className="select select-bordered"
      aria-label="theme"
      value={theme}
      onChange={(event) => {
        const next = event.target.value;
        if (isTheme(next)) setTheme(next);
      }}
    >
      {THEMES.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}

export default ThemeSwitcher;
