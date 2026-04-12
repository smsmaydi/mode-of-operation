/**
 * Must match the inline script in public/index.html (no flash on load).
 */
export const THEME_STORAGE_KEY = "app-theme";

export function readStoredColorMode() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}
