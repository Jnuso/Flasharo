import type { User } from "firebase/auth";
import type { ApiError } from "@flasharo/contracts";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function apiFetch<T>(user: User, path: string, init: RequestInit = {}): Promise<T> {
  const token = await user.getIdToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (response.status === 204) return undefined as T;
  const data = await response.json() as T | ApiError;
  if (!response.ok) {
    throw new ApiRequestError("error" in data ? data.error : "Request failed.", response.status);
  }
  return data as T;
}
