import React, { useEffect, useState } from "react";
import ClassroomLivePage from "./ClassroomLivePage";

export default function ClassroomSharePage() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [lectures, setLectures] = useState([]);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const key = params.get("key");
    const authToken = localStorage.getItem("authToken") || "";

    if (!token) {
      alert("Missing classroom token.");
      window.location.href = "/";
      return;
    }

    // 🔑 Retrieve hidden group key (if user came via /bridge/gk/...).
    const hiddenGroupKey =
      sessionStorage.getItem(`gk:${token}`) ||
      sessionStorage.getItem("gk") ||
      key ||
      "";

    // ✅ Always keep the group key around for refreshes.
    if (hiddenGroupKey && !sessionStorage.getItem(`gk:${token}`)) {
      sessionStorage.setItem(`gk:${token}`, hiddenGroupKey);
      sessionStorage.setItem("gk", hiddenGroupKey);
    }

    // Headers for backend validation.
    const headers = {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(hiddenGroupKey ? { "X-Group-Key": hiddenGroupKey } : {}),
    };

    // STEP 1️⃣ — Validate the classroom share link.
    fetch(
      `https://law-network.onrender.com/api/classroom-access/check?token=${token}${
        hiddenGroupKey ? `&key=${hiddenGroupKey}` : ""
      }`,
      { headers, credentials: "include" }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.allowed) {
          setAllowed(true);
          // STEP 2️⃣ — Load visible lectures (public + temporarily unlocked).
          // ✅ FIX: Ensure group key is also passed to this fetch.
          return fetch(
            `https://law-network.onrender.com/api/classroom-access/available?token=${token}${
              hiddenGroupKey ? `&key=${hiddenGroupKey}` : ""
            }`,
            { headers, credentials: "include" }
          );
        } else {
          setReason(data.reason || "expired_or_not_allowed");
          throw new Error("not allowed");
        }
      })
      .then((res) => (res ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          setLectures(data.lectures || []);
        } else if (data?.reason === "expired") {
          setExpired(true);
        }
      })
      .catch(() => {
        // 🎯 User-friendly errors.
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

  if (expired)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-center flex-col gap-3">
        <p className="text-xl">⏰ This classroom link has expired.</p>
      </div>
    );

  // ✅ Pass unlocked list using the prop ClassroomLivePage expects.
  return allowed ? <ClassroomLivePage sharedLectures={lectures} /> : null;
}
