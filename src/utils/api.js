/**
 * Central API helpers for frontend
 * Used across Article, Consultancy, Video, Podcast, PDF, Banner, QR, etc.
 */

import { API_BASE as CONST_API_BASE } from "./constants.js";

// Resolve API base just once, supporting both:
// - VITE_API_URL  (e.g. https://law-network.onrender.com/api)
// - VITE_BACKEND_URL (e.g. https://law-network.onrender.com)
// - fallback (local dev)
const API_BASE = String(
  CONST_API_BASE ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:5000"
).replace(/\/+$/, ""); // strip trailing slash

// Compute the backend origin (no trailing /api) for static files
const API_ORIGIN = API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;

/**
 * Ensure URL is joined correctly without double /api
 */
function buildUrl(url) {
  if (!url.startsWith("/")) url = "/" + url;

  // Prevent accidental /api/api duplication when API_BASE already includes /api
  if (API_BASE.endsWith("/api") && url.startsWith("/api/")) {
    url = url.slice(4); // drop the first "/api"
  }
  return API_BASE + url;
}

/**
 * Build absolute URL for static files served from backend `/uploads/*`
 */
export function absUrl(p) {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith("/uploads/")) {
    return API_ORIGIN + p; // always from backend origin
  }
  return buildUrl(p);
}

/**
 * Standard JSON fetchers
 */
export async function getJSON(url, init = {}) {
  const res = await fetch(buildUrl(url), { method: "GET", ...init });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

export async function postJSON(url, data, init = {}) {
  const res = await fetch(buildUrl(url), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    body: JSON.stringify(data ?? {}),
    ...init,
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

export async function putJSON(url, data, init = {}) {
  const res = await fetch(buildUrl(url), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    body: JSON.stringify(data ?? {}),
    ...init,
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

export async function deleteJSON(url, init = {}) {
  const res = await fetch(buildUrl(url), { method: "DELETE", ...init });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}
export const delJSON = deleteJSON;

/**
 * Upload helper (FormData)
 */
export async function upload(url, formData, init = {}) {
  const res = await fetch(buildUrl(url), {
    method: "POST",
    body: formData,
    ...init,
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

/**
 * Owner/admin auth headers
 */
export function authHeaders() {
  const key = localStorage.getItem("ownerKey");
  return key ? { "X-Owner-Key": key } : {};
}

// Exports (keep names used elsewhere)
export { API_BASE, API_ORIGIN, buildUrl };
