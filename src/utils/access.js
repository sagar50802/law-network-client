// client/src/utils/access.js
import { getJSON, postJSON, buildUrl } from "./api";

const ACCESS_KEY = "access";
const makeKey = (feature, featureId, email) =>
  `${feature}:${featureId}:${(email || "").toLowerCase().trim()}`;

const readStore = () => {
  try { return JSON.parse(localStorage.getItem(ACCESS_KEY) || "{}"); }
  catch { return {}; }
};
const writeStore = (obj) => {
  try { localStorage.setItem(ACCESS_KEY, JSON.stringify(obj)); } catch {}
};

/** Save access locally + broadcast UI events */
export function saveAccess(feature, featureId, email, expiry, message) {
  const key = makeKey(feature, featureId, email);
  const ms = typeof expiry === "number" ? expiry : new Date(expiry).getTime();
  const store = readStore();
  store[key] = { expiry: ms, ...(message ? { message } : {}) };
  writeStore(store);
  const detail = { feature, featureId, email, expiry: ms, message };
  window.dispatchEvent(new CustomEvent("accessUpdated", { detail }));
  window.dispatchEvent(new CustomEvent("accessGranted", { detail }));
  window.dispatchEvent(new CustomEvent("accessUpdated", { detail: { ...detail, storageSync: true } }));
  return store[key];
}

export function clearAccess(feature, featureId, email) {
  const key = makeKey(feature, featureId, email);
  const store = readStore();
  if (store[key]) { delete store[key]; writeStore(store); }
  const detail = { feature, featureId, email, revoked: true };
  window.dispatchEvent(new CustomEvent("accessUpdated", { detail }));
  window.dispatchEvent(new CustomEvent("accessRevoked", { detail }));
  window.dispatchEvent(new CustomEvent("accessUpdated", { detail: { ...detail, storageSync: true } }));
}

/** Load access: trust valid local cache, else hit server */
export async function loadAccess(feature, featureId, email) {
  const key = makeKey(feature, featureId, email);
  const store = readStore();
  const now = Date.now();
  const local = store[key];
  if (local?.expiry && local.expiry > now) return local;

  if (local && (!local.expiry || local.expiry <= now)) {
    delete store[key]; writeStore(store);
  }

  try {
    const qs = new URLSearchParams({ email, feature, featureId }).toString();
    const j = await getJSON(`/api/access/status?${qs}`);
    if (j?.access && j.expiry) {
      const ms = typeof j.expiry === "number" ? j.expiry : new Date(j.expiry).getTime();
      const value = { expiry: ms, ...(j.message ? { message: j.message } : {}) };
      store[key] = value; writeStore(store);
      return value;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getAllAccess() { return readStore(); }
