// client/src/utils/api.js

/**
 * Central API helpers for frontend
 * Used across Article, Consultancy, Video, Podcast, PDF, Banner, QR, etc.
 */

const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/+$/, "") ||
  "http://localhost:5000/api";

/**
 * Build absolute URL for static files served from backend `/uploads/*`
 * Ensures correct backend domain instead of frontend domain
 */
function absUrl(p) {
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;

  if (p.startsWith("/uploads/")) {
    const backendBase = API_BASE.replace(/\/api$/, "");
    return backendBase + p;
  }
  return API_BASE + p;
}

/**
 * Normalize endpoint: ensure it starts with `/api/`
 */
function normalizeUrl(url) {
  if (!url.startsWith("/api/")) {
    if (url.startsWith("/")) return "/api" + url;
    return "/api/" + url;
  }
  return url;
}

/**
 * Standard JSON fetchers
 */
async function getJSON(url) {
  url = normalizeUrl(url);
  const res = await fetch(API_BASE.replace(/\/api$/, "") + url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function postJSON(url, data) {
  url = normalizeUrl(url);
  const res = await fetch(API_BASE.replace(/\/api$/, "") + url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function putJSON(url, data) {
  url = normalizeUrl(url);
  const res = await fetch(API_BASE.replace(/\/api$/, "") + url, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function deleteJSON(url) {
  url = normalizeUrl(url);
  const res = await fetch(API_BASE.replace(/\/api$/, "") + url, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

// Alias for backwards compatibility
async function delJSON(url) {
  return deleteJSON(url);
}

/**
 * Upload helper (FormData)
 * Used for images, audio, video, PDFs, etc.
 */
async function upload(url, formData) {
  url = normalizeUrl(url);
  const res = await fetch(API_BASE.replace(/\/api$/, "") + url, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

/**
 * Owner/admin auth headers
 * Reads key from localStorage (hidden from normal viewers)
 */
function authHeaders() {
  const key = localStorage.getItem("ownerKey");
  return key
    ? {
        "X-Owner-Key": key,
      }
    : {};
}

export {
  API_BASE,
  absUrl,
  getJSON,
  postJSON,
  putJSON,
  deleteJSON,
  delJSON, // alias
  upload,
  authHeaders,
};
