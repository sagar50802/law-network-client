import React, { useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";

const API_URL =
  import.meta.env.VITE_API_URL || "https://law-network-server.onrender.com";

export default function SeatsPage() {
  const [seats, setSeats] = useState([]);

  useEffect(() => {
    loadSeats();
  }, []);

  async function loadSeats() {
    const res = await fetch(`${API_URL}/api/admin/library/seats`);
    const json = await res.json();
    if (json.success) setSeats(json.data);
  }

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100">
      <AdminSidebar />

      <div className="flex-1 p-6">
        <h1 className="text-xl font-bold mb-6">💺 Active Seats</h1>

        {seats.length === 0 ? (
          <p>No active seats right now.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-2 text-left">Seat #</th>
                <th className="text-left">User</th>
                <th className="text-left">Ends At</th>
              </tr>
            </thead>
            <tbody>
              {seats.map((s) => (
                <tr key={s._id} className="border-b border-slate-800">
                  <td className="py-2">{s.seatNumber}</td>
                  <td>{s.user?.name}</td>
                  <td>{new Date(s.endsAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
