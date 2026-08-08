const ACCESS_KEY = "artech-access";
const PROFILE_KEY = "artech-profile-v1";
const DEFAULT_PASSWORD = "123456";
const DEFAULT_NAME = "Shubham Jain";

export type AppProfile = {
  name: string;
  password: string;
};

function readProfile(): AppProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppProfile>;
      const name = String(parsed.name || "").trim() || DEFAULT_NAME;
      const password = String(parsed.password || "").trim() || DEFAULT_PASSWORD;
      return { name, password };
    }
  } catch {
    /* ignore */
  }
  return { name: DEFAULT_NAME, password: DEFAULT_PASSWORD };
}

function writeProfile(profile: AppProfile): void {
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({
      name: profile.name.trim() || DEFAULT_NAME,
      password: profile.password,
    })
  );
}

export function getAppProfile(): AppProfile {
  return readProfile();
}

export function getLoginName(): string {
  return readProfile().name;
}

export function updateLoginName(name: string): string | null {
  const value = name.trim();
  if (!value) return "Name is required.";
  if (value.length < 2) return "Name must be at least 2 characters.";
  const profile = readProfile();
  writeProfile({ ...profile, name: value });
  return null;
}

export function changeAppPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): string | null {
  const profile = readProfile();
  if (currentPassword !== profile.password) {
    return "Current password is incorrect.";
  }
  const next = newPassword.trim();
  if (next.length < 6) return "New password must be at least 6 characters.";
  if (next !== confirmPassword.trim()) {
    return "New password and confirm password do not match.";
  }
  if (next === profile.password) {
    return "New password must be different from the current password.";
  }
  writeProfile({ ...profile, password: next });
  return null;
}

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

export function logoutApp(): void {
  try {
    sessionStorage.removeItem(ACCESS_KEY);
  } catch {
    /* ignore */
  }
}

export function validateAppPassword(password: string): string | null {
  const value = password.trim();
  if (value.length < 6) return "Password must be at least 6 characters.";
  if (value !== readProfile().password) return "Incorrect password.";
  return null;
}
