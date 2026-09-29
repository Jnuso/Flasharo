import type { User } from "firebase/auth";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const data = await response.json() as unknown;
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
      ? data.error
      : "Request failed.";
    throw new ApiRequestError(message, response.status);
  }
  return data as T;
}

export async function apiFetch<T>(user: User, path: string, init: RequestInit = {}): Promise<T> {
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  return readResponse<T>(await fetch(`${baseUrl}${path}`, { ...init, cache: "no-store", headers }));
}

/** Public set routes intentionally send no authentication token. */
export async function publicGet<T>(path: string): Promise<T> {
  return readResponse<T>(await fetch(`${baseUrl}${path}`, { cache: "no-store" }));
}
