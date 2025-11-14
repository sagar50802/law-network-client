// client/src/pages/admin/AdminMagazines.jsx
import { useEffect, useState } from "react";
import AdminRoute from "../../components/common/AdminRoute.jsx";
import MagazineAdminEditor from "../../components/Magazine/MagazineAdminEditor.jsx";

function AdminMagazinesPageInner() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingIssue, setEditingIssue] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/magazines");
      const data = await res.json();
      if (data.ok) setList(data.issues);
    } catch (err) {
      console.error("Magazine load error:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (editingIssue !== null) {
    return (
      <MagazineAdminEditor
        existingIssue={editingIssue}
        onSaved={() => {
          setEditingIssue(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Magazine Manager</h1>

      <button
        onClick={() => setEditingIssue({})}
        className="px-4 py-2 bg-indigo-600 text-white rounded mb-6"
      >
        + Create New Magazine
      </button>

      {loading && <div>Loading magazines...</div>}

      {!loading && list.length === 0 && (
        <div>No magazines created yet.</div>
      )}

      {!loading && list.length > 0 && (
        <div className="space-y-3">
          {list.map((issue) => (
            <div
              key={issue._id}
              className="border p-4 rounded flex justify-between items-center bg-white"
            >
              <div>
                <div className="font-semibold">{issue.title}</div>
                <div className="text-gray-600 text-sm">
                  {issue.subtitle}
                </div>
                <div className="text-xs text-gray-400">/{issue.slug}</div>
              </div>

              <button
                className="px-3 py-1 bg-green-600 text-white rounded"
                onClick={async () => {
                  const res = await fetch(`/api/magazines/${issue.slug}`);
                  const data = await res.json();
                  if (data.ok) setEditingIssue(data.issue);
                }}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminMagazines() {
  return (
    <AdminRoute>
      <AdminMagazinesPageInner />
    </AdminRoute>
  );
}
