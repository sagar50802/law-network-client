import React, { useEffect } from "react";
import { useParams } from "react-router-dom";

export default function GroupKeyBridge() {
  const { key, token } = useParams(); // from route /bridge/gk/:key/t/:token

  useEffect(() => {
    try {
      if (key && token) {
        sessionStorage.setItem(`gk:${token}`, key);
      }
    } catch {}
    // Redirect to the clean URL (no key in the bar)
    window.location.replace(`/classroom/share?token=${token}`);
  }, [key, token]);

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      Preparing secure access…
    </div>
  );
}
