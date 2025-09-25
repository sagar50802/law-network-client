"use strict";

// ---------- Preview durations ----------
export const PREVIEW_SECONDS_ARTICLE = 10;
export const PREVIEW_SECONDS_PODCAST = 10;
export const PREVIEW_SECONDS_VIDEO = 10;
export const PREVIEW_SECONDS_PDF = 5;
export const FAST_UNLOCK_SECONDS = 20;

// ---------- Access key helpers ----------
export const buildAccessKey  = (type, id) => `LN_ACCESS::${type}::${id}`;
export const buildOverlayKey = (type, id) => `LN_OVERLAY::${type}::${id}`;

// ---------- Subscription plans ----------
export const PLAN_OPTIONS = [
  { key: "weekly",  label: "Weekly",  color: "emerald", minutes: 10080 },
  { key: "monthly", label: "Monthly", color: "indigo",  minutes: 43200 },
  { key: "yearly",  label: "Yearly",  color: "amber",   minutes: 525600 },
];

/**
 * Robust API base detection:
 *  - VITE_BACKEND_URL = "https://law-network.onrender.com"
 *  - VITE_API_URL     = "https://law-network.onrender.com/api"
 *  - If neither set:
 *      * on Render (hosted domain), default to https://law-network.onrender.com
 *      * locally, default to http://localhost:5000
 */
const ENV_BACKEND = (import.meta?.env?.VITE_BACKEND_URL ?? "").trim();
const ENV_API     = (import.meta?.env?.VITE_API_URL ?? "").trim();

const isHostedProd =
  typeof window !== "undefined" &&
  /law-network-client\.onrender\.com|law-network\.onrender\.com/i.test(
    window.location.origin
  );

const DEFAULT_PROD = "https://law-network.onrender.com";
const DEFAULT_DEV  = "http://localhost:5000";

let raw = ENV_BACKEND || ENV_API || (isHostedProd ? DEFAULT_PROD : DEFAULT_DEV);
raw = raw.replace(/\/+$/, "");         // trim trailing slashes
const endsWithApi = /\/api$/i.test(raw);

// Origin (no /api)
export const BASE_URL = endsWithApi ? raw.replace(/\/api$/i, "") : raw;

// Full /api base
export const API_BASE = endsWithApi ? raw : `${BASE_URL}/api`;

// Legacy alias used elsewhere
export { API_BASE as apiurl };
