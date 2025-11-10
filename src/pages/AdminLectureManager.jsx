import React, { useEffect, useState } from "react";
import "./SlideEditorModal.css"; // ✅ Add this line
import {
  Plus,
  Trash2,
  Calendar,
  PlayCircle,
  PauseCircle,
  FileText,
  X,
  Image as ImgIcon,
  Video,
  Music2,
  FolderOpen,
} from "lucide-react";

const API_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/classroom`;

/* ------------------------ Modal Wrapper ------------------------ */
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 modal-overlay">
      <div className="bg-white rounded-2xl w-[90%] md:w-[720px] max-h-[85vh] overflow-auto shadow-2xl relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-600 hover:text-slate-800"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------ Slide Editor ------------------------ */
function SlideEditor({ open, onClose, lecture, onSaveSlides }) {
  const [slides, setSlides] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lecture?._id) {
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/lectures/${lecture._id}/slides`);
          const data = await res.json();
          setSlides(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error("Failed to load slides", err);
        }
      })();
    }
  }, [lecture]);

  // 🔼 Updated R2 Upload (pre-signed URL) version
  const handleFileUpload = async (index, field, file) => {
    if (!file) return;
    try {
      // Step 1: Ask backend for pre-signed R2 upload URL
      const signRes = await fetch(`${API_BASE}/media/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimetype: file.type,
        }),
      });

      const signData = await signRes.json();
      if (!signData.success) throw new Error(signData.message || "Sign failed");

      // Step 2: Upload directly to Cloudflare R2
      const uploadRes = await fetch(signData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok)
        throw new Error(`Upload failed (${uploadRes.status})`);

      // Step 3: Store returned public R2 URL in slide
      handleMediaChange(index, field, signData.fileUrl);
    } catch (err) {
      console.error("Upload error:", err);
      alert(err.message || "Upload failed");
    }
  };

  const handleAddSlide = () => {
    setSlides((prev) => [
      ...prev,
      {
        _id: `local-${Date.now()}`,
        topicTitle: "",
        content: "",
        media: { videoUrl: "", audioUrl: "", imageUrl: "" },
      },
    ]);
  };

  const handleChange = (i, key, value) => {
    const updated = [...slides];
    updated[i][key] = value;
    setSlides(updated);
  };

  const handleMediaChange = (i, type, value) => {
    const updated = [...slides];
    updated[i].media = updated[i].media || {};
    updated[i].media[type] = value;
    setSlides(updated);
  };

  const handleDelete = (i) => {
    if (!window.confirm("Remove this slide?")) return;
    setSlides((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveSlides(lecture._id, slides);
      alert("✅ Slides saved successfully");
      onClose();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save slides");
    } finally {
      setSaving(false);
    }
  };

  if (!lecture) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-xl font-semibold mb-4 text-slate-700">
        📄 Manage Slides – {lecture.title}
      </h2>

      {slides.length === 0 && (
        <p className="text-sm text-slate-500 mb-4">
          No slides yet. Click <strong>Add Slide</strong> to create one.
        </p>
      )}

      {slides.map((s, i) => (
        <div
          key={s._id || i}
          className="border border-slate-200 rounded-xl p-4 mb-4 bg-slate-50 transition hover:shadow-sm"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-slate-700">Slide {i + 1}</h3>
            <button onClick={() => handleDelete(i)}>
              <Trash2 className="w-4 h-4 text-red-500 hover:text-red-600" />
            </button>
          </div>

          <input
            type="text"
            placeholder="Topic title..."
            value={s.topicTitle}
            onChange={(e) => handleChange(i, "topicTitle", e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-2 text-sm"
          />

          <textarea
            rows={4}
            placeholder="Teleprompter content..."
            value={s.content}
            onChange={(e) => handleChange(i, "content", e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-2 text-sm"
          />

          <div className="flex flex-col md:flex-row gap-3 mb-2">
            {/* 🎥 Video */}
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-600">Video</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Video URL"
                  value={s.media?.videoUrl || ""}
                  onChange={(e) =>
                    handleMediaChange(i, "videoUrl", e.target.value)
                  }
                  className="flex-1 border border-slate-300 rounded-lg px-2 py-1 text-sm"
                />
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) =>
                    handleFileUpload(i, "videoUrl", e.target.files?.[0])
                  }
                  className="text-xs"
                />
              </div>
            </div>

            {/* 🎧 Audio */}
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-2">
                <Music2 className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-600">Audio</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Audio URL"
                  value={s.media?.audioUrl || ""}
                  onChange={(e) =>
                    handleMediaChange(i, "audioUrl", e.target.value)
                  }
                  className="flex-1 border border-slate-300 rounded-lg px-2 py-1 text-sm"
                />
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) =>
                    handleFileUpload(i, "audioUrl", e.target.files?.[0])
                  }
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* 🖼️ Image */}
          <div className="flex flex-col gap-1 mb-3">
            <div className="flex items-center gap-2">
              <ImgIcon className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-600">Image</span>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Image URL"
                value={s.media?.imageUrl || ""}
                onChange={(e) =>
                  handleMediaChange(i, "imageUrl", e.target.value)
                }
                className="flex-1 border border-slate-300 rounded-lg px-2 py-1 text-sm"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  handleFileUpload(i, "imageUrl", e.target.files?.[0])
                }
                className="text-xs"
              />
            </div>
          </div>

          <div className="bg-slate-900 text-slate-50 rounded-xl p-3 text-sm">
            <div className="font-semibold text-slate-300 mb-1">Preview:</div>
            <p className="leading-relaxed whitespace-pre-wrap">
              {s.content || "Type content to preview teleprompter text."}
            </p>
          </div>
        </div>
      ))}

      <div className="flex justify-between items-center mt-4">
        <button
          onClick={handleAddSlide}
          className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600"
        >
          + Add Slide
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-white font-medium ${
            saving
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {saving ? "Saving..." : "Save All Slides"}
        </button>
      </div>
    </Modal>
  );
}


/* ------------------------ Lecture Row (small sub-component) ------------------------ */
function LectureRow({ lec, onToggle, onEditSlides, onDelete }) {
  const now = new Date();
  const releaseTime = new Date(lec.releaseAt);
  const isScheduled = lec.status !== "released" && releaseTime > now;

  const status =
    lec.status === "released"
      ? "released"
      : isScheduled
      ? "scheduled"
      : lec.status;

  const statusClasses = {
    released: "bg-emerald-100 text-emerald-700",
    scheduled: "bg-amber-100 text-amber-700",
    draft: "bg-slate-200 text-slate-600",
  };

  return (
    <tr className="border-b border-slate-200 hover:bg-slate-50">
      <td className="p-2">{lec.title}</td>
      <td className="p-2">{lec.subject}</td>
      <td className="p-2 text-center">
        <img
          src={`/avatars/${lec.avatarType}.png`}
          alt={lec.avatarType}
          className="w-10 h-10 rounded-full mx-auto border border-slate-300 object-cover"
        />
      </td>
      <td className="p-2 text-center">{lec.slides?.length || 0}</td>
      <td className="p-2 text-center text-slate-500 flex items-center justify-center gap-1">
        <Calendar className="w-4 h-4" />
        <span>{releaseTime.toLocaleString()}</span>
      </td>
      <td className="p-2 text-center">
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[status]}`}
        >
          {status}
        </span>
      </td>
       <td className="p-2 text-center">
  <div className="flex items-center justify-center gap-3 text-slate-600">
    {/* ▶️ Toggle Release */}
    <button title="Toggle Release" onClick={() => onToggle(lec)}>
      {lec.status === "released" ? (
        <PauseCircle className="w-5 h-5 text-amber-500 hover:text-amber-600 transition" />
      ) : (
        <PlayCircle className="w-5 h-5 text-emerald-500 hover:text-emerald-600 transition" />
      )}
    </button>

    {/* 📝 Edit Slides */}
    <button title="Edit Slides" onClick={() => onEditSlides(lec)}>
      <FileText className="w-5 h-5 text-blue-500 hover:text-blue-600 transition" />
    </button>

    {/* 🗑️ Delete */}
    <button title="Delete Lecture" onClick={() => onDelete(lec._id)}>
      <Trash2 className="w-5 h-5 text-red-500 hover:text-red-600 transition" />
    </button>

    {/* 📋 Copy Lecture ID */}
    <button
      title="Copy Lecture ID"
      onClick={() => {
        navigator.clipboard.writeText(lec._id);
        alert("Lecture ID copied: " + lec._id);
      }}
    >
      📋
    </button>

    {/* 🔗 Generate Share Link */}
    <button
      title="Generate Share Link"
      onClick={async () => {
        try {
          const type = prompt("Enter link type: free or paid", "free");
          if (!type) return;

          const res = await fetch(
            `https://law-network.onrender.com/api/classroom-access/create-link`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("authToken")}`,
              },
              body: JSON.stringify({
                lectureId: lec._id,
                type: type.toLowerCase(),
                expiresInHours: 24,
              }),
            }
          );

          const data = await res.json();
          if (data.success) {
            navigator.clipboard.writeText(data.url);
            alert("✅ Share link copied:\n" + data.url);
          } else {
            alert("❌ Failed: " + data.error);
          }
        } catch (err) {
          alert("Error: " + err.message);
        }
      }}
    >
      🔗
    </button>
  </div>
</td>
 </tr>
 );
}

/* ------------------------ Main Admin Page ------------------------ */
export default function AdminLectureManager() {
  const [lectures, setLectures] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [showSlideModal, setShowSlideModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    avatarType: "teacher1",
    releaseAt: new Date().toISOString().slice(0, 16),
    status: "draft",
  });

  const loadLectures = async () => {
  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/lectures`);
    const json = await res.json();
    // handle wrapped API response { success, data }
    const data = Array.isArray(json.data) ? json.data : json;
    setLectures(data);
  } catch (err) {
    console.error("Failed to load lectures:", err);
    alert("⚠️ Failed to fetch lectures");
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    loadLectures();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/lectures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to create lecture");
      await loadLectures();
      setShowForm(false);
      setFormData({
        title: "",
        subject: "",
        avatarType: "teacher1",
        releaseAt: new Date().toISOString().slice(0, 16),
        status: "draft",
      });
      alert("✅ Lecture created successfully");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save lecture");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this lecture?")) return;
    try {
      const res = await fetch(`${API_BASE}/lectures/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await loadLectures();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete lecture");
    }
  };

  const handleToggleStatus = async (lecture) => {
    const newStatus = lecture.status === "released" ? "draft" : "released";
    try {
      await fetch(`${API_BASE}/lectures/${lecture._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lecture, status: newStatus }),
      });
      await loadLectures();
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to update lecture status");
    }
  };

  const handleSaveSlides = async (lectureId, slides) => {
  // 🧹 Clean slides before sending
  const cleanedSlides = slides
    .filter(s => s.topicTitle?.trim() || s.content?.trim()) // skip empty slides
    .map(s => ({
      topicTitle: s.topicTitle?.trim() || "Untitled Slide",
      content: s.content?.trim() || "",
      media: {
        videoUrl: s.media?.videoUrl?.trim() || "",
        audioUrl: s.media?.audioUrl?.trim() || "",
        imageUrl: s.media?.imageUrl?.trim() || "",
      },
    }));

  if (cleanedSlides.length === 0) {
    alert("❌ Please add at least one slide with title or content");
    return;
  }

  try {
    console.log("Sending slides to API:", cleanedSlides);
    const res = await fetch(`${API_BASE}/lectures/${lectureId}/slides`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: cleanedSlides }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server error (${res.status}): ${text}`);
    }

    alert("✅ Slides saved successfully!");
    await loadLectures();
  } catch (err) {
    console.error("Save error:", err);
    alert("❌ Failed to save slides. Check console for details.");
  }
};


  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          🎓 Admin Lecture Manager
        </h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
        >
          <Plus className="inline w-4 h-4 mr-1" />
          {showForm ? "Close Form" : "Add Lecture"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-5 rounded-xl shadow-md border border-slate-200 mb-8 transition-all">
          <h2 className="font-semibold text-lg mb-3 text-slate-700">
            Create Lecture
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Subject
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Avatar
              </label>
              <select
                name="avatarType"
                value={formData.avatarType}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="teacher1">teacher1</option>
                <option value="teacher2">teacher2</option>
                <option value="teacher3">teacher3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Release At
              </label>
              <input
                type="datetime-local"
                name="releaseAt"
                value={formData.releaseAt}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              Save Lecture
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white p-5 rounded-xl shadow-md border border-slate-200">
        <h2 className="font-semibold text-lg mb-4 text-slate-700 flex items-center gap-1">
          <FolderOpen className="w-5 h-5 text-slate-500" /> All Lectures
        </h2>

        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : lectures.length === 0 ? (
          <div className="text-center text-slate-400 py-8 text-sm">
            No lectures yet. Click <strong>Add Lecture</strong> to begin.
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-600">
                <th className="p-2 text-left">Title</th>
                <th className="p-2 text-left">Subject</th>
                <th className="p-2 text-center">Avatar</th>
                <th className="p-2 text-center">Slides</th>
                <th className="p-2 text-center">Release</th>
                <th className="p-2 text-center">Status</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lectures.map((lec) => (
                <LectureRow
                  key={lec._id}
                  lec={lec}
                  onToggle={handleToggleStatus}
                  onEditSlides={(l) => {
                    setSelectedLecture(l);
                    setShowSlideModal(true);
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide modal */}
      <SlideEditor
        open={showSlideModal}
        onClose={() => setShowSlideModal(false)}
        lecture={selectedLecture}
        onSaveSlides={handleSaveSlides}
      />

      <div className="mt-8 text-xs text-slate-500 text-center">
        Admin Lecture Manager • API-connected ({API_BASE})
      </div>
    </div>
  );
}
