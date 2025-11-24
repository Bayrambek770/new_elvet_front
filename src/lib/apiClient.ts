import axios, { AxiosError, AxiosRequestConfig, AxiosRequestHeaders } from "axios";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api/v1/";
const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const ROLE_KEY = "user_role";

export const api = axios.create({
  baseURL: API_BASE,
});

// Attach access token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_KEY);
  if (token) {
    const headers: AxiosRequestHeaders = (config.headers ?? {}) as AxiosRequestHeaders;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers;
  }
  return config;
});

let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean; _suppress404?: boolean });

    // Suppress 404 errors for expected endpoints (nurse profile resolution, task endpoints)
    if (error.response?.status === 404 && original?._suppress404) {
      // Return a rejected promise but don't log to console
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refresh = localStorage.getItem(REFRESH_KEY);
          if (!refresh) throw new Error("No refresh token");
          const { data } = await axios.post<{ access: string }>(`${API_BASE}auth/jwt/token/refresh/`, { refresh });
          localStorage.setItem(ACCESS_KEY, data.access);
          queue.forEach((cb) => cb(data.access));
          queue = [];
          return api(original);
        } catch (e) {
          localStorage.removeItem(ACCESS_KEY);
          localStorage.removeItem(REFRESH_KEY);
          localStorage.removeItem(ROLE_KEY);
          const redirect = import.meta.env.VITE_LOGOUT_REDIRECT ?? "/auth";
          if (typeof window !== "undefined") window.location.href = redirect;
          return Promise.reject(e);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve) => {
        queue.push((token: string) => {
          const headers: AxiosRequestHeaders = (original.headers ?? {}) as AxiosRequestHeaders;
          headers.Authorization = `Bearer ${token}`;
          original.headers = headers;
          resolve(api(original));
        });
      });
    }

    return Promise.reject(error);
  }
);

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  get role(): string | undefined {
    return localStorage.getItem(ROLE_KEY) ?? undefined;
  },
  set(access: string, refresh: string, role?: string | null) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    if (role) {
      localStorage.setItem(ROLE_KEY, role);
    }
  },
  setRole(role?: string | null) {
    if (role) {
      localStorage.setItem(ROLE_KEY, role);
    } else {
      localStorage.removeItem(ROLE_KEY);
    }
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ROLE_KEY);
  },
};

// Decode a JWT without verifying signature (client-side convenience only)
export function decodeJwt<T = Record<string, unknown>>(token?: string | null): T | undefined {
  if (!token) return undefined;
  const parts = token.split(".");
  if (parts.length < 2) return undefined;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json) as T;
  } catch {
    return undefined;
  }
}

export function getRoleFromAccessToken(): string | undefined {
  const payload = decodeJwt<{ role?: string; [k: string]: unknown }>(tokenStore.access);
  if (!payload) return undefined;
  // Common claim names to check
  const candidates = [
    payload.role,
    (payload as any).user_role,
    (payload as any)["https://schemas.elvetclinic.com/role"],
  ].filter(Boolean);
  return (candidates[0] as string | undefined) || undefined;
}

export function getUserIdFromAccessToken(): number | string | undefined {
  const payload = decodeJwt<{ user_id?: number | string; sub?: number | string; id?: number | string }>(
    tokenStore.access
  );
  if (!payload) return undefined;
  return payload.user_id ?? payload.sub ?? payload.id ?? undefined;
}
