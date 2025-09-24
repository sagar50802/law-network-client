/**
 * Central API helpers for frontend
 * Used across Article, Consultancy, Video, Podcast, PDF, Banner, QR, etc.
 */

// ── Base API URL ─────────────────────────────────────
// Example: VITE_API_BASE="https://lawnetwork-api.onrender.com/api"
const API_BASE = (
  import.meta.env.VITE_API_BASE || "http://localhost:5000"
).replace(/\/+$/, ""); // ensure no trailing slash

/**
 * Ensure URL is joined correctly without double `/api`
 * Example: buildUrl("/articles") → `${API_BASE}/articles`
 */
function buildUrl(url) {
  if (!url.startsWith("/")) url = "/" + url;
  return API_BASE + url;
}

/**
 * Build absolute URL for static files served from backend `/uploads/*`
 * Ensures correct backend domain instead of frontend domain
 * Example: absUrl("/uploads/pdfs/abc.pdf")
 */
export function absUrl(p) {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;

  // static uploads must come from backend root, not /api
  if (p.startsWith("/uploads/")) {
    return API_BASE.replace(/\/api$/, "") + p;
  }
  return buildUrl(p);
}

// ── JSON Fetch Helpers ──────────────────────────────

/**
 * GET JSON (no credentials/headers by default to reduce preflights)
 */
export async function getJSON(url, init = {}) {
  const res = await fetch(buildUrl(url), { method: "GET", ...init });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

/**
 * POST JSON
 */
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

/**
 * PUT JSON
 */
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

/**
 * DELETE JSON
 */
export async function deleteJSON(url, init = {}) {
  const res = await fetch(buildUrl(url), { method: "DELETE", ...init });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

// alias
export const delJSON = deleteJSON;

// ── File Upload (FormData) ───────────────────────────

/**
 * Upload helper for images, audio, video, PDFs, etc.
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

// ── Auth Helpers ─────────────────────────────────────

/**
 * Build owner/admin headers for secure requests
 */
export function authHeaders() {
  const key = localStorage.getItem("ownerKey");
  return key ? { "X-Owner-Key": key } : {};
}

// ── Exports ─────────────────────────────────────────
export { API_BASE, buildUrl };
