import React, { useState } from "react";
import "./TeacherAvatarCard.css"; // 👈 Import the local CSS file

export default function TeacherAvatarCard({ teacher, subject, isSpeaking }) {
  const [imgError, setImgError] = useState(false);
  const avatarSrc = imgError
    ? "/avatars/default.png"
    : `/avatars/${teacher?.avatarType || "default"}.png`;

  return (
    <div className="bg-slate-900 text-slate-50 rounded-2xl p-4 md:p-5 shadow-lg flex flex-col items-center gap-3 border border-slate-700 teacher-avatar-container">
      <div className="relative">
        <img
          src={avatarSrc}
          alt={teacher?.name || "Teacher"}
          onError={() => setImgError(true)}
          className={`teacher-avatar-img ${isSpeaking ? "speaking" : ""}`}
        />
        {isSpeaking && <div className="teacher-avatar-ring" />}
      </div>

      <div className="text-center">
        <div className="font-semibold text-lg">{teacher?.name || "Teacher"}</div>
        <div className="text-xs text-slate-300">{teacher?.role || "Faculty"}</div>
        {subject && (
          <div className="mt-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 inline-block">
            {subject}
          </div>
        )}
      </div>
    </div>
  );
}
