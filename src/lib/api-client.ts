// Configure base API URL
const getBaseURL = (): string => {
  // Check if we have an env variable (for production)
  if (typeof import.meta !== "undefined" && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Default: call the Pitch Capital API directly (no dev proxy in this setup)
  return "https://pitchcapital.ng/api";
};

const API_BASE = getBaseURL();

// Helper function to handle API requests
export async function apiRequest<T>(
  endpoint: string,
  options: Omit<RequestInit, "body"> & { body?: any } = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  // Get auth token from localStorage if available
  const token = typeof window !== "undefined" 
    ? localStorage.getItem("pc_admin_session_token") 
    : null;
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If we're sending JSON, set content-type
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  } as RequestInit);

  // Try to parse JSON even if response is error
  let data: T;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  if (!response.ok) {
    throw new Error(
      (data as any)?.error || `Request failed: ${response.status}`
    );
  }

  return data;
}
