import { createClient } from "./supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  let token = null;
  
  if (typeof window !== "undefined") {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || null;
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      // Only force logout if we're in the dashboard area.
      // Students on the lobby page should NOT be signed out.
      if (window.location.pathname.startsWith("/dashboard")) {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = "/login";
      }
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Terjadi kesalahan pada server");
  }

  return data;
}

export const api = {
  get: (endpoint: string) => apiFetch(endpoint, { method: "GET" }),
  post: (endpoint: string, body: any) => 
    apiFetch(endpoint, { 
      method: "POST", 
      body: JSON.stringify(body) 
    }),
  put: (endpoint: string, body: any) => 
    apiFetch(endpoint, { 
      method: "PUT", 
      body: JSON.stringify(body) 
    }),
  delete: (endpoint: string) => 
    apiFetch(endpoint, { method: "DELETE" }),
};
