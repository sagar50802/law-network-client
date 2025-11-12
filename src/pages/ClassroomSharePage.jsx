import React, { useEffect, useState } from "react";
import ClassroomLivePage from "./ClassroomLivePage";

export default function ClassroomSharePage() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const key = params.get("key"); // ✅ new group key support
    const authToken = localStorage.getItem("authToken") || "";

    if (!token) {
      alert("Missing classroom token.");
      window.location.href = "/";
      return;
    }

    // 🔒 Try to get hidden group key (set by GroupKeyBridge)
    const hiddenGroupKey =
      sessionStorage.getItem(`gk:${token}`) ||
      sessionStorage.getItem("gk") ||
      key || // fallback from query
      "";

    const headers = {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(hiddenGroupKey ? { "X-Group-Key": hiddenGroupKey } : {}),
    };

    // ✅ Include both token and key in the request
    fetch(
      `https://law-network.onrender.com/api/classroom-access/check?token=${token}${
        hiddenGroupKey ? `&key=${hiddenGroupKey}` : ""
      }`,
      {
        headers,
        credentials: "include",
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.allowed) {
          setAllowed(true);
        } else {
          setReason(data.reason || "expired_or_not_allowed");
          throw new Error("not allowed");
        }
      })
      .catch(() => {
        // 🧠 Clear, user-friendly error messages
        let msg = "This classroom link is expired or not allowed.";
        if (reason === "expired") msg = "⏰ This classroom link has expired.";
        else if (reason === "bad_group_key" || reason === "invalid_group_key")
          msg =
            "🚫 Unauthorized — this link is reserved for verified group members only.";
        else if (reason === "no_user")
          msg = "🔐 Please log in to access this paid classroom.";
        else if (reason === "not_in_list")
          msg = "🚫 You are not authorized to view this private classroom.";
        alert(msg);
        window.location.href = "/";
      })
      .finally(() => setLoading(false));
  }, [reason]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-center flex-col gap-3">
        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full"></div>
        <p>Checking access…</p>
      </div>
    );

  return allowed ? <ClassroomLivePage /> : null;
}
