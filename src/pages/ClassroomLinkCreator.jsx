import React, { useState } from "react";

export default function ClassroomLinkCreator() {
  const [lectureId, setLectureId] = useState("");
  const [type, setType] = useState("free");
  const [expiryType, setExpiryType] = useState("minutes"); // user can choose minutes/hours
  const [expiryValue, setExpiryValue] = useState(1); // default 1 minute for quick testing
  const [groupKeys, setGroupKeys] = useState([
    { label: "WhatsApp", key: "" },
    { label: "Telegram", key: "" },
  ]);
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);

  const updateKey = (i, field, val) => {
    setGroupKeys((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: val };
      return copy;
    });
  };

  async function createLink() {
    if (!lectureId) {
      alert("Please enter a valid Lecture ID");
      return;
    }

    const permanent = Number(expiryValue) <= 0;

    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");

      const body = {
        lectureId,
        type,
        permanent,
        groupKeys: groupKeys.filter((g) => g.key.trim().length > 0),
      };

      if (!permanent) {
        if (expiryType === "hours") body.expiresInHours = Number(expiryValue);
        if (expiryType === "minutes") body.expiresInMinutes = Number(expiryValue);
      }

      const res = await fetch(
        "https://law-network.onrender.com/api/classroom-access/create-link",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (data.success) {
        setLink(data.url);
        navigator.clipboard.writeText(data.url);
        alert(
          "✅ Link created and copied to clipboard!" +
            (data.expiresAt
              ? `\n\nExpires at: ${new Date(data.expiresAt).toLocaleString()}`
              : "\n\nNo expiry (permanent).")
        );
      } else {
        alert("❌ Failed to create link: " + (data.error || "Unknown error"));
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
            <option value="paid">Paid (restricted/group-only)</option>
          </select>
        </div>

        {/* Expiry */}
        <div>
          <label className="block mb-1 font-medium text-sm">Expiry</label>
          <div className="flex gap-2">
            <select
              value={expiryType}
              onChange={(e) => setExpiryType(e.target.value)}
              className="w-1/2 border px-3 py-2 rounded-lg"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
            </select>
            <input
              type="number"
              min="0"
              value={expiryValue}
              onChange={(e) => setExpiryValue(e.target.value)}
              className="w-1/2 border px-3 py-2 rounded-lg"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Set 0 for permanent (no expiry)
          </p>
        </div>

        {/* Group Keys (only for paid links) */}
        {type === "paid" && (
          <div className="space-y-2">
            <div className="font-medium text-sm">Group Keys (optional)</div>
            {groupKeys.map((g, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Label (e.g., WhatsApp)"
                  value={g.label}
                  onChange={(e) => updateKey(i, "label", e.target.value)}
                  className="w-1/3 border px-3 py-2 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Secret key for this group"
                  value={g.key}
                  onChange={(e) => updateKey(i, "key", e.target.value)}
                  className="w-2/3 border px-3 py-2 rounded-lg"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setGroupKeys((prev) => [...prev, { label: "", key: "" }])
              }
              className="text-sm text-emerald-700 underline"
            >
              + Add another group
            </button>
          </div>
        )}

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
          <p className="text-xs mt-2 text-gray-600">
            For WhatsApp: share{" "}
            <code>/bridge/gk/&lt;whatsappKey&gt;/t/&lt;token&gt;</code>
            <br />
            For Telegram: share{" "}
            <code>/bridge/gk/&lt;telegramKey&gt;/t/&lt;token&gt;</code>
          </p>
        </div>
      )}
    </div>
  );
}
