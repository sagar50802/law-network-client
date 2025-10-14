/**
 * Central API helpers for frontend
 * Used across Article, Consultancy, Video, Podcast, PDF, Banner, QR, etc.
 */

import { API_BASE as CONST_API_BASE } from "./constants.js";

// Resolve API base just once:
// - VITE_API_URL (may already include /api)
// - VITE_BACKEND_URL (bare origin, no /api)
// - fallback (local)
const RAW_BASE = String(
  CONST_API_BASE ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:5000"
).replace(/\/+$/, ""); // strip trailing slash

/* ──────────────────────────────────────────────────────────────
   AUTO-FALLBACK for two-app Render setup (no env changes needed)
   If no env points to the API and we’re on *.onrender.com with
   a “-client” subdomain, auto-target the sibling server origin.
   This only runs when RAW_BASE is still localhost (i.e., unset).
   ────────────────────────────────────────────────────────────── */
let AUTO_BASE = RAW_BASE;
try {
  if (
    typeof window !== "undefined" &&
    /^http:\/\/localhost(?::\d+)?$/.test(RAW_BASE) &&
    /\.onrender\.com$/i.test(window.location.hostname) &&
    /-client\./i.test(window.location.hostname)
  ) {
    const serverHost = window.location.hostname.replace(/-client\./i, ".");
    AUTO_BASE = `https://${serverHost}`;
  }
} catch { /* no-op */ }

// If base already ends with /api keep it, else append /api once.
const API_BASE = AUTO_BASE.endsWith("/api") ? AUTO_BASE : `${AUTO_BASE}/api`;

// Backend origin without /api (for legacy /uploads/*)
const API_ORIGIN = API_BASE.slice(0, -4);

/** Safe join that never produces /api/api/... */
function buildUrl(url = "") {
  let u = String(url);
  if (!u.startsWith("/")) u = "/" + u;
  if (API_BASE.endsWith("/api") && u.startsWith("/api/")) u = u.replace(/^\/api/, "");
  return API_BASE + u;
}

/**
 * Absolute URL for server-served paths
 * (This is the "tiny helper" you asked for; it already existed, kept as-is.)
 */
export function absUrl(p) {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  // Legacy static uploads
  if (p.startsWith("/uploads/")) return API_ORIGIN + p;
  // GridFS and other API paths (/api/files/..., etc.)
  return buildUrl(p);
}

/** Owner/admin auth header (if present in localStorage) */
export function authHeaders() {
  const key = localStorage.getItem("ownerKey");
  return key ? { "X-Owner-Key": key } : {};
}

// Always send credentials for CORS cookies
const BASE_INIT = { credentials: "include" };

/* ---------------- JSON helpers ---------------- */

export async function getJSON(url, init = {}) {
  const res = await fetch(buildUrl(url), {
    method: "GET",
    headers: { ...(init.headers || {}), ...authHeaders() }, // attach admin key automatically
    ...BASE_INIT,
    ...init,
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

export async function postJSON(url, data, init = {}) {
  const res = await fetch(buildUrl(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers || {}),
    },
    body: JSON.stringify(data ?? {}),
    ...BASE_INIT,
    ...init,
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

export async function putJSON(url, data, init = {}) {
  const res = await fetch(buildUrl(url), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers || {}),
    },
    body: JSON.stringify(data ?? {}),
    ...BASE_INIT,
    ...init,
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

export async function deleteJSON(url, init = {}) {
  const res = await fetch(buildUrl(url), {
    method: "DELETE",
    headers: { ...authHeaders(), ...(init.headers || {}) },
    ...BASE_INIT,
    ...init,
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}
export const delJSON = deleteJSON;

/* ---------------- FormData upload ---------------- */

export async function upload(url, formData, init = {}) {
  const res = await fetch(buildUrl(url), {
    method: "POST",
    headers: { ...authHeaders(), ...(init.headers || {}) }, // do NOT set Content-Type
    body: formData,
    ...BASE_INIT,
    ...init,
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

// Expose these so other modules (and components) can reuse the resolved base/origin
export { API_BASE, API_ORIGIN, buildUrl };
