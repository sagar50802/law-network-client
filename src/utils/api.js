// client/src/utils/api.js

// ✅ Base API URL
let RAW_BASE = import.meta.env.VITE_API_BASE || "";

if (!RAW_BASE) {
  if (window.location.hostname === "localhost") {
    RAW_BASE = "http://localhost:2025/api"; // dev fallback
  } else {
    RAW_BASE = "https://lawnetwork-api.onrender.com/api"; // prod fallback
  }
}

RAW_BASE = RAW_BASE.trim();

// ✅ Clean final base (remove trailing /)
export const API_BASE = RAW_BASE.replace(/\/+$/, "");

// ✅ Join helper (avoids double slashes)
function join(base, path) {
  return (base ? `${base}${path.startsWith("/") ? "" : "/"}${path}` : path)
    .replace(/([^:]\/)\/+/g, "$1");
}

// ✅ Auth headers for admin
export function authHeaders() {
  const key = localStorage.getItem("ownerKey");
  return key
    ? { Authorization: `Bearer ${key}`, "X-Owner-Key": key }
    : {};
}

// ✅ API URL builder
export function apiUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  return join(API_BASE, path);
}

// ✅ Core request
async function requestJSON(path, options = {}) {
  const { method = "GET", headers = {}, body } = options;

  const res = await fetch(apiUrl(path), {
    method,
    credentials: "include",
    headers: {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...authHeaders(),
      ...headers,
    },
    body:
      body instanceof FormData
        ? body
        : body != null
        ? JSON.stringify(body)
        : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

// ✅ Shorthand wrappers
export const getJSON   = (p, o)    => requestJSON(p, { ...o, method: "GET" });
export const postJSON  = (p, d, o) => requestJSON(p, { ...o, method: "POST", body: d });
export const putJSON   = (p, d, o) => requestJSON(p, { ...o, method: "PUT", body: d });
export const patchJSON = (p, d, o) => requestJSON(p, { ...o, method: "PATCH", body: d });
export const delJSON   = (p, o)    => requestJSON(p, { ...o, method: "DELETE" });

// ✅ Compatibility alias
export const fetchJSON = getJSON;

// ✅ Upload helpers
export async function upload(path, formData, opts = {}) {
  return requestJSON(path, { ...opts, method: "POST", body: formData });
}

export async function uploadFile(path, file, field = "file", extra = {}, opts = {}) {
  const fd = new FormData();
  fd.append(field, file);
  Object.entries(extra || {}).forEach(([k, v]) => fd.append(k, v));
  return upload(path, fd, opts);
}

// ✅ Absolute static media resolver
export const absUrl = (p) => {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;

  // Always load from backend, not client
  if (p.startsWith("/uploads/")) {
    const backendRoot = (import.meta.env.VITE_API_BASE || "https://lawnetwork-api.onrender.com/api")
      .replace(/\/api$/, ""); // strip /api
    return join(backendRoot, p);
  }

  return apiUrl(p);
};

export default {
  API_BASE,
  authHeaders,
  apiUrl,
  getJSON,
  postJSON,
  putJSON,
  patchJSON,
  delJSON,
  fetchJSON,
  upload,
  uploadFile,
  absUrl,
};
