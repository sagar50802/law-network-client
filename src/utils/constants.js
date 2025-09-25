"use strict";

// Preview durations (in seconds)
export const PREVIEW_SECONDS_ARTICLE = 10;
export const PREVIEW_SECONDS_PODCAST = 10;
export const PREVIEW_SECONDS_VIDEO = 10;
export const PREVIEW_SECONDS_PDF = 5;
export const FAST_UNLOCK_SECONDS = 20;

// Access key helpers
export const buildAccessKey = (type, id) => `LN_ACCESS::${type}::${id}`;
export const buildOverlayKey = (type, id) => `LN_OVERLAY::${type}::${id}`;

// Subscription plans
export const PLAN_OPTIONS = [
  { key: "weekly",  label: "Weekly",  color: "emerald", minutes: 10080 },
  { key: "monthly", label: "Monthly", color: "indigo",  minutes: 43200 },
  { key: "yearly",  label: "Yearly",  color: "amber",   minutes: 525600 },
];

// -------- API base detection --------
// Accept either:
//   VITE_BACKEND_URL = "https://law-network.onrender.com"   (origin)
//   VITE_API_URL     = "https://law-network.onrender.com/api" (full api)
const RAW =
  import.meta.env.VITE_BACKEND_URL ??
  import.meta.env.VITE_API_URL ??
  "";

let base = RAW.trim();
if (base.endsWith("/")) base = base.slice(0, -1);

// If value already ends with /api, use it as API base; otherwise append /api
export const API_BASE = /\/api$/.test(base)
  ? base
  : `${(base || "https://law-network.onrender.com")}/api`;

// Also expose BASE_URL (origin only)
export const BASE_URL = API_BASE.replace(/\/api$/, "");

// Legacy alias
export { API_BASE as apiurl };
