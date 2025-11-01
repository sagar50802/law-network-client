import { getJSON, postJSON, deleteJSON } from "./api";

export async function saveIntake(payload, id) {
  const qs = id ? `?id=${encodeURIComponent(id)}` : "";
  return await postJSON(`/api/research-drafting/${qs}`, payload);
}

export async function fetchDraft(id) {
  return await getJSON(`/api/research-drafting/${id}`);
}

export async function genStep(id, step) {
  return await postJSON(
    `/api/research-drafting/generate?id=${encodeURIComponent(id)}&step=${encodeURIComponent(step)}`,
    {}
  );
}

export async function markPaid(id, payload) {
  return await postJSON(`/api/research-drafting/${id}/mark-paid`, payload);
}

/* ----------------------------- Admin Endpoints ----------------------------- */

export async function adminList() {
  return await getJSON(`/api/research-drafting`);
}

export async function adminApprove(id, days = 30) {
  return await postJSON(`/api/research-drafting/${id}/admin/approve`, { days });
}

export async function adminRevoke(id) {
  return await postJSON(`/api/research-drafting/${id}/admin/revoke`, {});
}

export async function adminGetConfig() {
  return await getJSON(`/api/research-drafting/admin/config`);
}

export async function adminSetConfig(payload) {
  return await postJSON(`/api/research-drafting/admin/config`, payload);
}

/* ----------------------------- NEW ADMIN UTILS ----------------------------- */

// ✅ Auto-approve all paid drafts
export async function adminAutoApprove() {
  return await postJSON(`/api/research-drafting/admin/auto-approve`, {});
}

// ✅ Delete a single record
export async function adminDelete(id) {
  return await deleteJSON(`/api/research-drafting/${id}/admin/delete`);
}

// ✅ Batch delete by status (e.g., ["draft", "rejected"])
export async function adminBatchDelete(statusArray = []) {
  return await postJSON(`/api/research-drafting/admin/batch-delete`, { status: statusArray });
}
