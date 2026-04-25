const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("eduboard_token") : null;

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
      localStorage.removeItem("eduboard_token");
      localStorage.removeItem("eduboard_user");
      // Only redirect if we are in the dashboard area
      if (window.location.pathname.startsWith("/dashboard")) {
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
