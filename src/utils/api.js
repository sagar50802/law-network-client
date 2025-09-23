// client/src/utils/api.js

// 🌐 Base API URL
const rawBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
export const API_BASE = rawBase.replace(/\/$/, ""); // remove trailing slash

// Absolute URL resolver
export function absUrl(p) {
  if (!p) return "";
  if (p.startsWith("http")) return p;

  // Special case for /uploads
  if (p.startsWith("/uploads/")) {
    const backend = API_BASE.replace(/\/api$/, "");
    return backend + p;
  }
  return API_BASE + p;
}

// Internal JSON fetch helper
async function requestJSON(url, options = {}) {
  const res = await fetch(absUrl(url), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

// ── JSON helpers ──
export function getJSON(url) {
  return requestJSON(url);
}
export function postJSON(url, data) {
  return requestJSON(url, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function putJSON(url, data) {
  return requestJSON(url, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
export function deleteJSON(url) {
  return requestJSON(url, { method: "DELETE" });
}

// ── Upload helper ──
export async function upload(url, formData) {
  const res = await fetch(absUrl(url), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

// ── Auth headers (for owner-only actions) ──
export function authHeaders() {
  const key =
    localStorage.getItem("ownerKey") || sessionStorage.getItem("ownerKey");
  if (!key) return {};
  return { "X-Owner-Key": key };
}
