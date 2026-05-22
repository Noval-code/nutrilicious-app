/**
 * Helper fetch yang otomatis menyertakan JWT Authorization header.
 * Gunakan ini untuk semua request ke backend yang butuh autentikasi.
 */

import { getToken } from "@/context/AuthContext";

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}
