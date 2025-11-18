// src/components/library/BookDetailPanel.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function BookDetailPanel({
  book,
  isOpen,
  onClose,
  seatStatus,
  mobileMode = false,
}) {
  if (!book || !isOpen) return null;

  const navigate = useNavigate();
  const isPaid = book.isPaid;

  const previewSrc = book.previewImage || book.coverUrl || null;

  const handleReadClick = () => {
    navigate(`/library/reader/${book._id}`);
  };

  /* MOBILE MODE */
  if (mobileMode) {
    return (
      <div className="flex flex-col text-white">
        {/* Preview */}
        <div className="w-full aspect-[3/4] overflow-hidden rounded-lg bg-slate-900 mb-3">
          {previewSrc ? (
            <img src={previewSrc} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center text-xs text-slate-400">
              Preview not available
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold mb-1">{book.title}</h2>
        {book.author && (
          <p className="text-sm text-slate-300 mb-1">by {book.author}</p>
        )}

        {/* Description */}
        {book.description && (
          <p className="text-sm text-slate-300 mb-3 whitespace-pre-line">
            {book.description}
          </p>
        )}

        {/* Button */}
        <button
          onClick={handleReadClick}
          className="w-full py-2 bg-emerald-500 text-black font-bold rounded-lg"
        >
          📖 Read Now
        </button>
      </div>
    );
  }

  /* DESKTOP MODE */
  return (
    <div className="flex flex-col w-80 xl:w-96 border border-slate-800 bg-black/70 rounded-xl p-3 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-100">
          {book.title}
        </h2>
        <button
          onClick={onClose}
          className="text-[11px] text-slate-400 hover:text-slate-100"
        >
          ✕ Close
        </button>
      </div>

      <div className="w-full aspect-[3/4] rounded-lg overflow-hidden border border-slate-800 bg-slate-900 mb-3">
        {previewSrc ? (
          <img src={previewSrc} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
            Preview not available
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-slate-800">
        <button
          onClick={handleReadClick}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold"
        >
          📖 Read Now
        </button>
      </div>
    </div>
  );
}
