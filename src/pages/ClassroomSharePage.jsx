import React, { useEffect, useState } from "react";
import ClassroomLivePage from "./ClassroomLivePage";

export default function ClassroomSharePage() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const authToken = localStorage.getItem("authToken") || "";

    fetch(
      `https://law-network.onrender.com/api/classroom-access/check?token=${token}`,
      {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.allowed) setAllowed(true);
        else throw new Error("not allowed");
      })
      .catch(() => {
        alert("This classroom link is expired or not allowed.");
        window.location.href = "/";
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Checking access…
      </div>
    );

  return allowed ? <ClassroomLivePage /> : null;
}
