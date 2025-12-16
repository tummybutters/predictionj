export type AppTheme = "light" | "dark";

const THEME_STORAGE_KEY = "pj-theme";

export function getStoredTheme(): AppTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

export function setStoredTheme(theme: AppTheme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
}

export function getInitialTheme(defaultTheme: AppTheme): AppTheme {
  return getStoredTheme() ?? defaultTheme;
}

export function themeInitScript(defaultTheme: AppTheme) {
  const safeDefault = defaultTheme === "dark" ? "dark" : "light";
  return `(function(){try{var d=document.documentElement;var isAuth=d&&d.dataset&&d.dataset.auth==="1";if(!isAuth)return;var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
  )});if(t==="dark"||t==="light"){d.dataset.theme=t;return;}d.dataset.theme=${JSON.stringify(
    safeDefault,
  )};}catch(e){}})();`;
}

