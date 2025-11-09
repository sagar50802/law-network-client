const ADMIN_KEY = localStorage.getItem("ownerKey") || "LAWNOWNER2025";

// ✅ Define your backend base URL here
// Make sure it matches your backend Render URL (not the client one)
const BASE =
  import.meta.env.VITE_BACKEND_URL ||
  "https://law-network.onrender.com"; // your backend domain

/* ---------------------------------------------------------------------- */
/*                        SAFER JSON FETCH WRAPPER                        */
/* ---------------------------------------------------------------------- */
async function jfetch(url, options = {}) {
  try {
    // ✅ Always call backend absolute URL
    const full = url.startsWith("http") ? url : BASE + url;

    const r = await fetch(full, options);

    // Read text instead of forcing JSON
    const text = await r.text();

    if (!text) {
      console.error("⚠️ Empty response from server:", full);
      return { ok: false, error: "Empty response from server" };
    }

    try {
      return JSON.parse(text);
    } catch (err) {
      console.error("⚠️ Invalid JSON from server:", text);
      return { ok: false, error: "Invalid JSON response" };
    }
  } catch (e) {
    console.error("API Error:", e);
    return { ok: false, error: e.message };
  }
}

/* ---------------------------------------------------------------------- */
/*                              USER  FLOW                                */
/* ---------------------------------------------------------------------- */

// ✅ Create or update a research draft
export async function saveResearchDraft(data, id) {
  const q = id ? `?id=${id}` : "";
  return jfetch(`/api/research-drafting${q}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data || {}),
  });
}

// ✅ Fetch a single research draft by ID
export async function getResearchDraft(id) {
  return jfetch(`/api/research-drafting/${id}`);
}

// ✅ Generate a section (abstract, review, etc.)
export async function generateStep(id, step) {
  return jfetch(`/api/research-drafting/generate?id=${id}&step=${step}`, {
    method: "POST",
  });
}

// ✅ Mark a draft as paid
export async function markPaid(id, body) {
  return jfetch(`/api/research-drafting/${id}/mark-paid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
}

/* ---------------------------------------------------------------------- */
/*                              ADMIN  FLOW                               */
/* ---------------------------------------------------------------------- */

// ✅ Get all research drafts (admin)
export async function adminList() {
  return jfetch("/api/research-drafting", {
    headers: { "x-owner-key": ADMIN_KEY },
  });
}

// ✅ Approve draft (for X days)
export async function adminApprove(id, days = 30) {
  return jfetch(`/api/research-drafting/${id}/admin/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-key": ADMIN_KEY,
    },
    body: JSON.stringify({ days }),
  });
}

// ✅ Revoke approval
export async function adminRevoke(id) {
  return jfetch(`/api/research-drafting/${id}/admin/revoke`, {
    method: "POST",
    headers: { "x-owner-key": ADMIN_KEY },
  });
}

// ✅ Delete one draft
export async function adminDelete(id) {
  return jfetch(`/api/research-drafting/${id}/admin/delete`, {
    method: "DELETE",
    headers: { "x-owner-key": ADMIN_KEY },
  });
}

// ✅ Batch delete drafts
export async function adminBatchDelete(ids) {
  return jfetch(`/api/research-drafting/admin/delete-batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-key": ADMIN_KEY,
    },
    body: JSON.stringify({ ids }),
  });
}

// ✅ Auto-approve all user-marked paid drafts
export async function adminAutoApprove() {
  return jfetch(`/api/research-drafting/admin/auto-approve`, {
    method: "POST",
    headers: { "x-owner-key": ADMIN_KEY },
  });
}

// ✅ Get payment config (UPI, etc.)
export async function adminGetConfig() {
  return jfetch(`/api/research-drafting/admin/config`, {
    headers: { "x-owner-key": ADMIN_KEY },
  });
}

// ✅ Update payment config
export async function adminSetConfig(data) {
  return jfetch(`/api/research-drafting/admin/config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-key": ADMIN_KEY,
    },
    body: JSON.stringify(data),
  });
}

/* ---------------------------------------------------------------------- */
/*                 BACKWARD COMPATIBILITY (LEGACY ALIASES)                */
/* ---------------------------------------------------------------------- */

// 🧩 For old components (ResearchDrafting.jsx, LabFlow.jsx)
export const saveIntake = saveResearchDraft;
export const fetchDraft = getResearchDraft;
export const genStep = generateStep;
