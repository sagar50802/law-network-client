// client/src/components/ResearchDrafting/AdminResearchPanel.jsx
import { useEffect, useState } from "react";
import IfOwnerOnly from "../common/IfOwnerOnly.jsx";
import {
  adminList,
  adminApprove,
  adminRevoke,
  adminDelete,
  adminBatchDelete,
  adminGetConfig,
  adminSetConfig,
  adminAutoApprove,
} from "../../utils/researchDraftingApi";

export default function AdminResearchPanel() {
  const [items, setItems] = useState([]);
  const [cfg, setCfg] = useState(null);
  const [form, setForm] = useState({
    upiId: "",
    defaultAmount: 299,
    waNumber: "",
  });

  useEffect(() => {
    if (!localStorage.getItem("ownerKey")) {
      localStorage.setItem("ownerKey", "LAWNOWNER2025");
    }
    load();
  }, []);

  async function load() {
    const L = await adminList();
    console.log("🔍 Admin list response:", L);
    if (L?.ok) setItems(L.data || []);
    const C = await adminGetConfig();
    if (C?.ok)
      setCfg(C.config),
        setForm({
          upiId: C.config.upiId || "",
          defaultAmount: C.config.defaultAmount || 299,
          waNumber: C.config.waNumber || "",
        });
  }

  async function saveCfg() {
    const r = await adminSetConfig(form);
    if (r?.ok) load();
  }

  return (
    <IfOwnerOnly>
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <h2 className="text-2xl font-bold mb-4">
          Admin — Research Drafting
        </h2>

        {/* Admin control buttons */}
        <div className="mb-4 flex flex-wrap gap-3">
          <button
            className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white"
            onClick={async () => {
              const r = await adminAutoApprove();
              if (r?.ok) {
                alert(`✅ Auto-approved ${r.count} paid drafts`);
                load();
              } else {
                alert("Error running auto-approve");
              }
            }}
          >
            Auto Approve Paid Users
          </button>

          <button
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white"
            onClick={async () => {
              if (!window.confirm("Delete all drafts/rejected entries?")) return;
              const ids = items
                .filter(
                  (x) =>
                    x.status === "awaiting_payment" || x.status === "rejected"
                )
                .map((x) => x._id);
              if (!ids.length) return alert("No drafts/rejected found");
              const r = await adminBatchDelete(ids);
              if (r?.ok) {
                alert(`🗑️ Deleted ${r.deleted} items`);
                load();
              }
            }}
          >
            Batch Delete Drafts/Rejected
          </button>
        </div>

        {/* Payment Config */}
        <div className="mb-6 p-4 border rounded-2xl bg-white">
          <div className="font-semibold mb-3">Payment Config</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">
                UPI ID
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2"
                value={form.upiId}
                onChange={(e) =>
                  setForm({ ...form, upiId: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Default Amount (₹)
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2"
                type="number"
                value={form.defaultAmount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultAmount: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                WhatsApp Number
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2"
                value={form.waNumber}
                onChange={(e) =>
                  setForm({ ...form, waNumber: e.target.value })
                }
              />
            </div>
          </div>
          <button
            className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white"
            onClick={saveCfg}
          >
            Save Config
          </button>
        </div>

        {/* Table */}
        <div className="p-4 border rounded-2xl bg-white overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2">User</th>
                <th>Title</th>
                <th>Nature</th>
                <th>Status</th>
                <th>Paid?</th>
                <th>Amount</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x._id} className="border-t">
                  <td className="py-2">
                    <div className="font-semibold">{x.name || "-"}</div>
                    <div className="text-gray-500">
                      {x.email || "-"} • {x.phone || "-"}
                    </div>
                  </td>
                  <td>{x.title || x.subject || "-"}</td>
                  <td className="capitalize">{x.nature || "-"}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        x.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : x.status === "paid"
                          ? "bg-blue-100 text-blue-800"
                          : x.status === "awaiting_payment"
                          ? "bg-yellow-100 text-yellow-800"
                          : x.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {x.status}
                    </span>
                  </td>
                  <td>{x.payment?.userMarkedPaid ? "Yes" : "No"}</td>
                  <td>₹{x.payment?.amount || "-"}</td>
                  <td>
                    {new Date(x.updatedAt).toLocaleString("en-IN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="text-right">
                    <div className="flex gap-2 justify-end flex-wrap">
                      <button
                        className="px-3 py-1 rounded-lg border"
                        onClick={() =>
                          adminApprove(x._id, 30).then(load)
                        }
                      >
                        Approve 30d
                      </button>
                      <button
                        className="px-3 py-1 rounded-lg border"
                        onClick={() =>
                          adminApprove(x._id, 90).then(load)
                        }
                      >
                        Approve 90d
                      </button>
                      <button
                        className="px-3 py-1 rounded-lg border text-red-600"
                        onClick={() => adminRevoke(x._id).then(load)}
                      >
                        Revoke
                      </button>
                      <button
                        className="px-3 py-1 rounded-lg border text-red-700"
                        onClick={async () => {
                          if (window.confirm("Delete this record?")) {
                            const r = await adminDelete(x._id);
                            if (r?.ok) load();
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td
                    className="py-4 text-gray-500 text-center"
                    colSpan={8}
                  >
                    No submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </IfOwnerOnly>
  );
}
