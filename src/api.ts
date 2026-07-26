const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : text || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export { API_URL };
