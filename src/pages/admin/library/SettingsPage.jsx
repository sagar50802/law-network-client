import React, { useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";

const API_URL =
  import.meta.env.VITE_API_URL || "https://law-network-server.onrender.com";

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings on page load
  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/library/settings`, {
        credentials: "include",
      });
      const json = await res.json();

      if (json.success) {
        setSettings(json.data);
      } else {
        console.error("Settings fetch failed:", json);
      }
    } catch (err) {
      console.error("Settings load error:", err);
    }
    setLoading(false);
  }

  async function save() {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/library/settings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (json.success) {
        alert("Settings saved successfully!");
        load();
      } else {
        alert("Failed to save settings.");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      alert("Error saving settings.");
    }
    setSaving(false);
  }

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex bg-slate-900 text-slate-100">
        <AdminSidebar />
        <div className="p-6 text-slate-300">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100">
      <AdminSidebar />

      <div className="flex-1 p-6 max-w-2xl">
        <h1 className="text-xl font-bold mb-6">⚙️ Library Settings</h1>

        <div className="space-y-6">

          {/* ---------------------------------------------- */}
          {/* Seat Price */}
          {/* ---------------------------------------------- */}
          <div>
            <label className="text-sm text-slate-300">Seat Base Price (₹)</label>
            <input
              type="number"
              className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700"
              value={settings.seatBasePrice}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  seatBasePrice: Number(e.target.value),
                })
              }
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Example: 50 (₹50 for seat reservation)
            </p>
          </div>

          {/* ---------------------------------------------- */}
          {/* Seat Durations */}
          {/* ---------------------------------------------- */}
          <div>
            <label className="text-sm text-slate-300">
              Seat Durations (minutes)
            </label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700"
              value={settings.seatDurationsMinutes.join(",")}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  seatDurationsMinutes: e.target.value
                    .split(",")
                    .map((v) => Number(v.trim()))
                    .filter((n) => !isNaN(n) && n > 0),
                })
              }
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Example: 60, 300, 1440 (1 hour, 5 hours, 24 hours)
            </p>
          </div>

          {/* ---------------------------------------------- */}
          {/* Default reading time for paid books */}
          {/* ---------------------------------------------- */}
          <div>
            <label className="text-sm text-slate-300">
              Default Reading Duration (hours)
            </label>
            <input
              type="number"
              className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700"
              value={settings.defaultReadingHours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultReadingHours: Number(e.target.value),
                })
              }
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Example: 24 (User can read paid book for 24 hours)
            </p>
          </div>

          {/* ---------------------------------------------- */}
          {/* Auto Approve Toggles */}
          {/* ---------------------------------------------- */}
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-800">

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoApproveSeat}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    autoApproveSeat: e.target.checked,
                  })
                }
              />
              <span>Auto-Approve Seat Reservations</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoApproveBook}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    autoApproveBook: e.target.checked,
                  })
                }
              />
              <span>Auto-Approve Book Purchases</span>
            </label>
          </div>

          {/* ---------------------------------------------- */}
          {/* Save Button */}
          {/* ---------------------------------------------- */}
          <button
            onClick={save}
            disabled={saving}
            className={`px-4 py-2 rounded bg-amber-500 text-black font-semibold hover:bg-amber-400 shadow ${
              saving ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
