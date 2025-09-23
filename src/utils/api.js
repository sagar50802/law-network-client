// client/src/utils/api.js

// 🌐 Base API URL
// In development -> http://localhost:5000
// In production -> your Render backend (without /api at end)
const rawBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
export const API_BASE = rawBase.replace(/\/$/, ""); // remove trailing slash

// For absolute URLs (like /uploads/...)
export function absUrl(p) {
  if (!p) return "";
  if (p.startsWith("http")) return p;

  // Special handling for /uploads → always point to backend root
  if (p.startsWith("/uploads/")) {
    const backend = API_BASE.replace(/\/api$/, "");
    return backend + p;
  }

  return API_BASE + p;
}

// 🔹 Core JSON fetcher
async function requestJSON(url, options = {}) {
  const res = await fetch(absUrl(url), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// ── JSON helpers ──────────────────────────────
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
  return requestJSON(url, {
    method: "DELETE",
  });
}

// ✅ Alias for consistency
export const delJSON = deleteJSON;

// ── File Upload helper ─────────────────────────
export async function upload(url, file, extraData = {}) {
  const formData = new FormData();
  formData.append("file", file);

  // attach any extra fields (like title, description)
  for (const [k, v] of Object.entries(extraData)) {
    formData.append(k, v);
  }

  const res = await fetch(absUrl(url), {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}
// 🔹 Upload helper (for FormData like images, PDFs, etc.)
export async function upload(url, formData) {
  const res = await fetch(absUrl(url), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}
// 🔹 Auth headers (for owner-only actions)
export function authHeaders() {
  const key =
    localStorage.getItem("ownerKey") || sessionStorage.getItem("ownerKey");
  if (!key) return {};
  return {
    "X-Owner-Key": key,
  };
}
