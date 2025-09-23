/**
 * Central API helpers for frontend
 * Used across Article, Consultancy, Video, Podcast, PDF, Banner, QR, etc.
 */

const API_BASE =
  (import.meta.env.VITE_API_BASE || "http://localhost:5000")
    .replace(/\/+$/, ""); // no trailing slash

/**
 * Build absolute URL for static files served from backend `/uploads/*`
 * Ensures correct backend domain instead of frontend domain
 */
export function absUrl(p) {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;

  if (p.startsWith("/uploads/")) {
    return API_BASE.replace(/\/api$/, "") + p;
  }
  return API_BASE + p;
}

/**
 * Standard JSON fetchers
 * ⚠️ For GET we avoid Content-Type and credentials to prevent preflight.
 */
export async function getJSON(url, init = {}) {
  const res = await fetch(API_BASE + url, { method: "GET", ...init });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

export async function postJSON(url, data, init = {}) {
  const res = await fetch(API_BASE + url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    body: JSON.stringify(data ?? {}),
    ...init,
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

export async function putJSON(url, data, init = {}) {
  const res = await fetch(API_BASE + url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    body: JSON.stringify(data ?? {}),
    ...init,
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

export async function deleteJSON(url, init = {}) {
  const res = await fetch(API_BASE + url, { method: "DELETE", ...init });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

// Alias for backwards compatibility
export const delJSON = deleteJSON;

/**
 * Upload helper (FormData)
 * Used for images, audio, video, PDFs, etc.
 * ⚠️ Do not set Content-Type manually → lets browser add boundary
 */
export async function upload(url, formData, init = {}) {
  const res = await fetch(API_BASE + url, {
    method: "POST",
    body: formData,
    ...init,
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

/**
 * Owner/admin auth headers
 * Reads key from localStorage (hidden from normal viewers)
 */
export function authHeaders() {
  const key = localStorage.getItem("ownerKey");
  return key ? { "X-Owner-Key": key } : {};
}

export { API_BASE };
