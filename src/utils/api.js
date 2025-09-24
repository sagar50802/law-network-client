/**
 * Central API helpers for frontend
 * Used across Article, Consultancy, Video, Podcast, PDF, Banner, QR, etc.
 */

const API_BASE =
  (import.meta.env.VITE_API_BASE || "http://localhost:5000").replace(/\/+$/, ""); // no trailing slash

/**
 * Ensure URL is joined correctly without double /api
 */
function buildUrl(url) {
  if (!url.startsWith("/")) url = "/" + url;
  return API_BASE + url;
}

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
  return buildUrl(p);
}

/**
 * Standard JSON fetchers
 * ⚠️ For GET we avoid Content-Type and credentials to prevent preflight.
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
 * Used for images, audio, video, PDFs, etc.
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

export { API_BASE };
