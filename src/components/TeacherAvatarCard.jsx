import React, { useState } from "react";
import "./TeacherAvatarCard.css";

/**
 * 🎓 TeacherAvatarCard
 * Displays the teacher avatar, name, role, and subject.
 * Avatar glows dynamically when `isSpeaking` = true.
 */
export default function TeacherAvatarCard({ teacher, subject, isSpeaking }) {
  const [imgError, setImgError] = useState(false);

  // ✅ Resolve avatar path safely
  const avatarSrc = imgError
    ? "/avatars/teacher1.png" // fallback image in /public/avatars
    : teacher?.avatarUrl?.startsWith("/")
    ? teacher.avatarUrl // direct local path like /avatars/teacher1.png
    : teacher?.avatarUrl?.startsWith("http")
    ? teacher.avatarUrl
    : `/avatars/${teacher?.avatarUrl || "teacher1.png"}`;

  return (
    <div className="teacher-avatar-container bg-slate-900 text-slate-50 rounded-2xl p-4 md:p-5 shadow-lg flex flex-col items-center gap-3 border border-slate-700">
      <div className="relative">
        {/* 👤 Avatar */}
        <img
          src={avatarSrc}
          alt={teacher?.name || "Teacher"}
          onError={() => setImgError(true)}
          className={`teacher-avatar-img ${isSpeaking ? "speaking" : ""}`}
          loading="lazy"
        />
        {/* 🌟 Speaking Ring */}
        {isSpeaking && <div className="teacher-avatar-ring" />}
      </div>

      {/* 🧠 Teacher Info */}
      <div className="text-center">
        <div className="font-semibold text-lg">
          {teacher?.name || "Teacher"}
        </div>
        <div className="text-xs text-slate-300">
          {teacher?.role || "Faculty"}
        </div>

        {/* 📘 Subject Tag */}
        {subject && (
          <div className="mt-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 inline-block">
            {subject}
          </div>
        )}
      </div>
    </div>
  );
}
