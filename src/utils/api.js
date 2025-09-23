// src/utils/api.js

let RAW_BASE = import.meta.env.VITE_API_BASE || "";

if (!RAW_BASE) {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    RAW_BASE = "http://localhost:2025"; // dev fallback (no /api here)
  } else {
    RAW_BASE = "https://lawnetwork-api.onrender.com"; // prod fallback (no /api here)
  }
}

RAW_BASE = RAW_BASE.trim();
export const API_BASE = RAW_BASE.replace(/\/+$/, ""); // no trailing slash

// join helper (keeps single slashes)
function join(base, path) {
  return (base ? `${base}${path.startsWith("/") ? "" : "/"}${path}` : path)
    .replace(/([^:]\/)\/+/g, "$1");
}

// owner/admin headers
export function authHeaders() {
  const key = localStorage.getItem("ownerKey");
  return key ? { Authorization: `Bearer ${key}`, "X-Owner-Key": key } : {};
}

// BUILD ABSOLUTE API URL
export function apiUrl(path) {
  if (!path) return "";

  // already absolute → return as-is
  if (/^https?:\/\//i.test(path)) return path;

  // ✅ strip any leading "api" so we never get /api/api/...
  // handles "/api/xxx", "api/xxx", "//api/xxx"
  let rel = path.trim().replace(/^\/+/, "");
  if (rel.toLowerCase().startsWith("api/")) rel = rel.slice(4); // drop "api/"

  // now add our single /api prefix
  return join(API_BASE, `/api/${rel}`);
}

// core request
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

// shorthands
export const getJSON   = (p, o)    => requestJSON(p, { ...o, method: "GET" });
export const postJSON  = (p, d, o) => requestJSON(p, { ...o, method: "POST", body: d });
export const putJSON   = (p, d, o) => requestJSON(p, { ...o, method: "PUT", body: d });
export const patchJSON = (p, d, o) => requestJSON(p, { ...o, method: "PATCH", body: d });
export const delJSON   = (p, o)    => requestJSON(p, { ...o, method: "DELETE" });

// uploads
export async function upload(path, formData, opts = {}) {
  return requestJSON(path, { ...opts, method: "POST", body: formData });
}

export async function uploadFile(path, file, field = "file", extra = {}, opts = {}) {
  const fd = new FormData();
  fd.append(field, file);
  Object.entries(extra || {}).forEach(([k, v]) => fd.append(k, v));
  return upload(path, fd, opts);
}

// absolute media URLs
export const absUrl = (p) => {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith("/uploads/")) return join(API_BASE, p);
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
  upload,
  uploadFile,
  absUrl,
};
