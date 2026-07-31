const ACCESS_KEY = "artech-access";
const APP_PASSWORD = "123456";

export function isAppUnlocked(): boolean {
  try {
    return sessionStorage.getItem(ACCESS_KEY) === "1";
  } catch {
    return false;
  }
}

export function unlockApp(): void {
  sessionStorage.setItem(ACCESS_KEY, "1");
}

export function validateAppPassword(password: string): string | null {
  const value = password.trim();
  if (value.length < 6) return "Password must be at least 6 characters.";
  if (value !== APP_PASSWORD) return "Incorrect password.";
  return null;
}
