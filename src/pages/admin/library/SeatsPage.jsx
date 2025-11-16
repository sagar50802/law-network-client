import React, { useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";

const API_URL =
  import.meta.env.VITE_API_URL || "https://law-network-server.onrender.com";

export default function SeatsPage() {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeats();
    const interval = setInterval(loadSeats, 30000); // auto-refresh every 30 sec
    return () => clearInterval(interval);
  }, []);

  async function loadSeats() {
    try {
      const res = await fetch(`${API_URL}/api/admin/library/seats`, {
        credentials: "include",
      });

      const json = await res.json();
      if (json.success) setSeats(json.data);
    } catch (err) {
      console.error("Seat load error:", err);
    }
    setLoading(false);
  }

  function timeLeft(endsAt) {
    const ms = new Date(endsAt) - new Date();
    if (ms <= 0) return "Expired";

    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    return `${h}h ${m}m ${sec}s`;
  }

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100">
      <AdminSidebar />

      <div className="flex-1 p-6">
        <h1 className="text-xl font-bold mb-6">💺 Active Seats</h1>

        {loading ? (
          <p>Loading...</p>
        ) : seats.length === 0 ? (
          <p className="text-slate-400">No active seats right now.</p>
        ) : (
          <table className="w-full text-sm bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <thead className="bg-slate-700 text-left">
              <tr>
                <th className="py-2 px-3">Seat #</th>
                <th className="py-2 px-3">User</th>
                <th className="py-2 px-3">Ends At</th>
                <th className="py-2 px-3">Time Left</th>
              </tr>
            </thead>

            <tbody>
              {seats.map((s) => (
                <tr
                  key={s._id}
                  className="border-t border-slate-700 hover:bg-slate-700/40"
                >
                  <td className="py-2 px-3 font-bold text-amber-300">
                    {s.seatNumber}
                  </td>

                  <td className="px-3">
                    {s.user?.name || "Unknown User"}
                    <div className="text-xs text-slate-400">{s.user?.email}</div>
                  </td>

                  <td className="px-3">
                    {new Date(s.endsAt).toLocaleString()}
                  </td>

                  <td className="px-3">
                    <span className="px-2 py-1 bg-black/40 rounded text-emerald-300">
                      {timeLeft(s.endsAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
