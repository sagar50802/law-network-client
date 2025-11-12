import React, { useEffect, useState } from "react";
import "./SlideEditorModal.css";
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

const API_BASE = `${
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
}/classroom`;

const ACCESS_BASE = `${
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
}/classroom-access`;

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
          // backend returns { success, slides }
          if (Array.isArray(data.slides)) {
            setSlides(data.slides);
          } else if (Array.isArray(data)) {
            setSlides(data);
          } else {
            setSlides([]);
          }
        } catch (err) {
          console.error("Failed to load slides", err);
        }
      })();
    }
  }, [lecture]);

  const handleFileUpload = async (index, field, file) => {
    if (!file) return;
    try {
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

      const uploadRes = await fetch(signData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok)
        throw new Error(`Upload failed (${uploadRes.status})`);

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

          {/* 🖼 Image */}
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

/* ------------------------ Stats modal ------------------------ */
function StatsModal({ open, onClose, lecture }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !lecture?._id) return;
    setLoading(true);
    fetch(`${ACCESS_BASE}/stats?lectureId=${lecture._id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLinks(data.links || []);
        else setLinks([]);
      })
      .catch((err) => {
        console.error("Stats fetch error:", err);
        setLinks([]);
      })
      .finally(() => setLoading(false));
  }, [open, lecture]);

  if (!open || !lecture) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-3 text-slate-700">
        📊 Share Links – {lecture.title}
      </h2>

      {loading ? (
        <p className="text-sm text-slate-500">Loading stats…</p>
      ) : links.length === 0 ? (
        <p className="text-sm text-slate-500">
          No share links created yet for this lecture.
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          {links.map((link) => (
            <div
              key={link._id}
              className="border border-slate-200 rounded-lg p-3 bg-slate-50"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-xs break-all">
                  token: {link.token}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    link.isFree
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {link.isFree ? "free" : "paid"}
                </span>
              </div>

              <div className="text-xs text-slate-600 mb-1">
                Visits:{" "}
                <strong>{link.visitCount != null ? link.visitCount : 0}</strong>
                {" · "}
                Last visit:{" "}
                {link.lastVisitAt
                  ? new Date(link.lastVisitAt).toLocaleString()
                  : "—"}
              </div>

              <div className="text-xs text-slate-600 mb-1">
                Expires:{" "}
                {link.expiresAt
                  ? new Date(link.expiresAt).toLocaleString()
                  : "no expiry"}
              </div>

              <button
                className="mt-1 text-xs underline text-blue-600"
                onClick={() => {
                  const url = `https://law-network-client.onrender.com/classroom/share?token=${link.token}`;
                  navigator.clipboard.writeText(url);
                  alert("Link copied:\n" + url);
                }}
              >
                Copy link again
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ------------------------ Create Link Modal ------------------------ */
/* ------------------------ Create Link Modal ------------------------ */
function CreateLinkModal({ open, onClose, lecture }) {
  const [type, setType] = useState("free");
  const [expiryType, setExpiryType] = useState("hours");
  const [expiryValue, setExpiryValue] = useState(24);
  const [creating, setCreating] = useState(false);

  if (!open || !lecture) return null;

  const handleCreate = async () => {
    try {
      setCreating(true);

      const permanent = expiryValue <= 0;
      const body = {
        lectureId: lecture._id,
        type,
        permanent,
      };

      // send hours/minutes properly
      if (!permanent) {
        if (expiryType === "hours") body.expiresInHours = expiryValue;
        if (expiryType === "minutes") body.expiresInMinutes = expiryValue;
      }

      const res = await fetch(`${ACCESS_BASE}/create-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        navigator.clipboard.writeText(data.url);
        alert(
          "✅ Link created & copied:\n" +
            data.url +
            (data.expiresAt
              ? `\n\nExpires at: ${new Date(data.expiresAt).toLocaleString()}`
              : "\n\nNo expiry (permanent).")
        );
        onClose();
      } else {
        alert("❌ Failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 text-slate-700">
        🔗 Create Share Link – {lecture.title}
      </h2>

      <div className="flex flex-col gap-4">
        {/* Link Type */}
        <div>
          <label className="block text-sm text-slate-600 mb-1">Link Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Expiry Selection */}
        <div>
          <label className="block text-sm text-slate-600 mb-1">Expiry</label>
          <div className="flex gap-2">
            <select
              value={expiryType}
              onChange={(e) => setExpiryType(e.target.value)}
              className="w-1/2 border border-slate-300 rounded-lg px-3 py-2"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
            </select>
            <input
              type="number"
              min="0"
              value={expiryValue}
              onChange={(e) => setExpiryValue(parseInt(e.target.value))}
              placeholder="Enter duration"
              className="w-1/2 border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Set 0 for permanent (no expiry)
          </p>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating}
          className={`px-4 py-2 rounded-lg text-white font-medium ${
            creating
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {creating ? "Creating..." : "Create Link"}
        </button>
      </div>
    </Modal>
  );
}


/* ------------------------ Lecture Row ------------------------ */
function LectureRow({
  lec,
  onToggle,
  onEditSlides,
  onDelete,
  onShowStats,
  onShowCreateLink,
}) {
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
          <button title="Toggle Release" onClick={() => onToggle(lec)}>
            {lec.status === "released" ? (
              <PauseCircle className="w-5 h-5 text-amber-500 hover:text-amber-600 transition" />
            ) : (
              <PlayCircle className="w-5 h-5 text-emerald-500 hover:text-emerald-600 transition" />
            )}
          </button>

          <button title="Edit Slides" onClick={() => onEditSlides(lec)}>
            <FileText className="w-5 h-5 text-blue-500 hover:text-blue-600 transition" />
          </button>

          <button title="Delete Lecture" onClick={() => onDelete(lec._id)}>
            <Trash2 className="w-5 h-5 text-red-500 hover:text-red-600 transition" />
          </button>

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
            onClick={() => onShowCreateLink(lec)}
          >
            🔗
          </button>

          <button
            title="View Share Links & Visits"
            onClick={() => onShowStats(lec)}
          >
            📊
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

  const [statsLecture, setStatsLecture] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const [createLinkLecture, setCreateLinkLecture] = useState(null);
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    avatarType: "teacher1",
    releaseAt: new Date().toISOString().slice(0, 16),
    status: "draft",
    accessType: "public", // ✅ new field for public/protected
  });

  const loadLectures = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/lectures`);
      const json = await res.json();
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
        body: JSON.stringify(formData), // includes accessType
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
        accessType: "public",
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
      const res = await fetch(`${API_BASE}/lectures/${id}`, {
        method: "DELETE",
      });
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
    const cleanedSlides = slides
      .filter((s) => s.topicTitle?.trim() || s.content?.trim())
      .map((s) => ({
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
            {/* ✅ Access Type */}
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Access Type
              </label>
              <select
                name="accessType"
                value={formData.accessType}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="public">Public (visible to all)</option>
                <option value="protected">Protected (share link only)</option>
              </select>
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
                  onShowStats={(l) => {
                    setStatsLecture(l);
                    setShowStatsModal(true);
                  }}
                  onShowCreateLink={(l) => {
                    setCreateLinkLecture(l);
                    setShowCreateLinkModal(true);
                  }}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SlideEditor
        open={showSlideModal}
        onClose={() => setShowSlideModal(false)}
        lecture={selectedLecture}
        onSaveSlides={handleSaveSlides}
      />

      <StatsModal
        open={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        lecture={statsLecture}
      />

      <CreateLinkModal
        open={showCreateLinkModal}
        onClose={() => setShowCreateLinkModal(false)}
        lecture={createLinkLecture}
      />

      <div className="mt-8 text-xs text-slate-500 text-center">
        Admin Lecture Manager • API-connected ({API_BASE})
      </div>
    </div>
  );
}
