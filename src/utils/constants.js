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
 * API base detection (robust):
 *  - VITE_BACKEND_URL = "https://law-network.onrender.com"
 *  - VITE_API_URL     = "https://law-network.onrender.com/api"
 *  - If neither is set, in Render prod use https://law-network.onrender.com
 *    and in local dev use http://localhost:5000
 */
const ENV_BACKEND = (import.meta?.env?.VITE_BACKEND_URL ?? "").trim();
const ENV_API     = (import.meta?.env?.VITE_API_URL ?? "").trim();

// Are we running on the deployed client?
const isHostedProd =
  typeof window !== "undefined" &&
  /law-network-client\.onrender\.com|law-network\.onrender\.com/.test(
    window.location.origin
  );

const DEFAULT_PROD = "https://law-network.onrender.com";
const DEFAULT_DEV  = "http://localhost:5000";

// Choose a raw base (env first, then sensible default)
let raw = ENV_BACKEND || ENV_API || (isHostedProd ? DEFAULT_PROD : DEFAULT_DEV);
raw = raw.replace(/\/+$/, ""); // trim trailing /

const endsWithApi = /\/api$/i.test(raw);

// Origin without /api
export const BASE_URL = endsWithApi ? raw.replace(/\/api$/i, "") : raw;

// Full /api base
export const API_BASE = endsWithApi ? raw : `${BASE_URL}/api`;

// Legacy alias used elsewhere
export { API_BASE as apiurl };
