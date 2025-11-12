import React, { useState } from "react";

export default function ClassroomLinkCreator() {
  const [lectureId, setLectureId] = useState("");
  const [type, setType] = useState("free");
  const [expiresInHours, setExpiresInHours] = useState(0);
  const [expiresInMinutes, setExpiresInMinutes] = useState(1); // default 1 min for quick test
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);

  async function createLink() {
    if (!lectureId) {
      alert("Please enter a valid Lecture ID");
      return;
    }
    if (expiresInHours === 0 && expiresInMinutes === 0) {
      alert("Set a valid expiry (at least 1 minute)");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");

      const res = await fetch(
        "https://law-network.onrender.com/api/classroom-access/create-link",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            lectureId,
            type,
            expiresInHours: Number(expiresInHours),
            expiresInMinutes: Number(expiresInMinutes),
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        setLink(data.url);
        navigator.clipboard.writeText(data.url);
        alert("✅ Link created and copied to clipboard!");
      } else {
        alert("❌ Failed to create link: " + data.error);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6 mt-10 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-semibold text-center mb-6">
        🔗 Generate Classroom Share Link
      </h2>

      <div className="space-y-4">
        {/* Lecture ID */}
        <div>
          <label className="block mb-1 font-medium text-sm">Lecture ID</label>
          <input
            type="text"
            value={lectureId}
            onChange={(e) => setLectureId(e.target.value)}
            placeholder="Enter lecture _id"
            className="w-full border px-3 py-2 rounded-lg"
          />
        </div>

        {/* Link Type */}
        <div>
          <label className="block mb-1 font-medium text-sm">Link Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border px-3 py-2 rounded-lg"
          >
            <option value="free">Free (public)</option>
            <option value="paid">Paid (restricted)</option>
          </select>
        </div>

        {/* Expiry Time */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block mb-1 font-medium text-sm">Hours</label>
            <input
              type="number"
              min="0"
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            />
          </div>
          <div className="flex-1">
            <label className="block mb-1 font-medium text-sm">Minutes</label>
            <input
              type="number"
              min="0"
              value={expiresInMinutes}
              onChange={(e) => setExpiresInMinutes(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            />
          </div>
        </div>

        <button
          onClick={createLink}
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700"
        >
          {loading ? "Generating..." : "Generate Share Link"}
        </button>
      </div>

      {link && (
        <div className="mt-6 bg-gray-100 p-3 rounded-lg">
          <p className="font-medium text-gray-700 mb-1">✅ Link Generated:</p>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 break-all"
          >
            {link}
          </a>
        </div>
      )}
    </div>
  );
}
