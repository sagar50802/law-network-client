import React, { useEffect, useState } from "react";
import { getJSON, putJSON } from "../utils/api";
import { useNavigate } from "react-router-dom";

export default function AdminFooterTermsEditor() {
  const [footer, setFooter] = useState({ text: "", links: [], address: "", email: "", phone: "" });
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const f = await getJSON("/footer");
        const t = await getJSON("/terms");
        setFooter(f?.footer || {});
        setTerms(t?.terms?.text || "");
      } catch (err) {
        setMsg("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const saveFooter = async () => {
    try {
      await putJSON("/footer", footer);
      setMsg("✅ Footer updated successfully");
    } catch (e) {
      setMsg("❌ Failed to update footer");
    }
  };

  const saveTerms = async () => {
    try {
      await putJSON("/terms", { text: terms });
      setMsg("✅ Terms updated successfully");
    } catch (e) {
      setMsg("❌ Failed to update terms");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 text-sm">
      <h1 className="text-2xl font-semibold mb-4">Footer & Terms Editor</h1>

      {msg && <div className="mb-4 text-center text-blue-600">{msg}</div>}

      {/* Footer Section */}
      <section className="mb-10 border rounded-lg p-5 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Footer Details</h2>

        <label className="block mb-2 font-medium">About Text</label>
        <textarea
          value={footer.text || ""}
          onChange={(e) => setFooter({ ...footer, text: e.target.value })}
          className="w-full border rounded p-2 mb-3"
          rows="3"
        />

        <label className="block mb-1 font-medium">Email</label>
        <input
          type="text"
          value={footer.email || ""}
          onChange={(e) => setFooter({ ...footer, email: e.target.value })}
          className="w-full border rounded p-2 mb-3"
        />

        <label className="block mb-1 font-medium">Phone</label>
        <input
          type="text"
          value={footer.phone || ""}
          onChange={(e) => setFooter({ ...footer, phone: e.target.value })}
          className="w-full border rounded p-2 mb-3"
        />

        <label className="block mb-1 font-medium">Address</label>
        <input
          type="text"
          value={footer.address || ""}
          onChange={(e) => setFooter({ ...footer, address: e.target.value })}
          className="w-full border rounded p-2 mb-4"
        />

        <h3 className="font-medium mb-2">Links</h3>
        {(footer.links || []).map((link, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              placeholder="Label"
              value={link.label || ""}
              onChange={(e) => {
                const newLinks = [...footer.links];
                newLinks[i].label = e.target.value;
                setFooter({ ...footer, links: newLinks });
              }}
              className="flex-1 border rounded p-1"
            />
            <input
              type="text"
              placeholder="URL"
              value={link.url || ""}
              onChange={(e) => {
                const newLinks = [...footer.links];
                newLinks[i].url = e.target.value;
                setFooter({ ...footer, links: newLinks });
              }}
              className="flex-1 border rounded p-1"
            />
            <button
              onClick={() =>
                setFooter({
                  ...footer,
                  links: footer.links.filter((_, idx) => idx !== i),
                })
              }
              className="px-2 py-1 bg-red-500 text-white rounded"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            setFooter({
              ...footer,
              links: [...(footer.links || []), { label: "", url: "" }],
            })
          }
          className="px-3 py-1 bg-gray-200 rounded mb-4"
        >
          + Add Link
        </button>

        <button
          onClick={saveFooter}
          className="block w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800"
        >
          Save Footer
        </button>
      </section>

      {/* Terms Section */}
      <section className="border rounded-lg p-5 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Terms & Conditions</h2>
        <textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          className="w-full border rounded p-2 mb-4"
          rows="10"
        />
        <button
          onClick={saveTerms}
          className="block w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800"
        >
          Save Terms
        </button>
      </section>

      <div className="text-center mt-6">
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="text-blue-600 underline text-sm"
        >
          ← Back to Admin Dashboard
        </button>
      </div>
    </div>
  );
}
