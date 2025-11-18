import React from "react";
import { useNavigate } from "react-router-dom";

export default function BookDetailPanel({
  book,
  isOpen,
  onClose,
  seatStatus,
}) {
  if (!book || !isOpen) return null;

  const navigate = useNavigate();
  const isPaid = book.isPaid;

  const handleBuyClick = () => {
    alert("Buy via UPI flow will be implemented in the next steps.");
  };

  const handleReadClick = () => {
    if (!book || !book._id) return;

    // Free → open immediately
    if (!book.isPaid) {
      navigate(`/library/reader/${book._id}`);
      return;
    }

    // Paid → Reader page will check access
    navigate(`/library/reader/${book._id}`);
  };

  return (
    <div className="hidden lg:flex w-80 xl:w-96 flex-col border border-slate-800 bg-black/70 rounded-xl p-3 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-100 line-clamp-1">
          {book.title}
        </h2>
        <button
          onClick={onClose}
          className="text-[11px] text-slate-400 hover:text-slate-100"
        >
          ✕ Close
        </button>
      </div>

      {/* Preview */}
      <div className="w-full aspect-[3/4] rounded-lg overflow-hidden border border-slate-800 bg-slate-900 mb-3">
        {book.previewImage ? (
          <img
            src={book.previewImage}
            alt={`${book.title} preview`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
            Preview page not available
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="text-xs text-slate-300 space-y-1 mb-3">
        {book.author && (
          <p>
            <span className="text-slate-400">Author:</span> {book.author}
          </p>
        )}
        {book.subject && (
          <p>
            <span className="text-slate-400">Subject:</span> {book.subject}
          </p>
        )}
        <p>
          <span className="text-slate-400">Type:</span>{" "}
          {isPaid ? "Paid" : "Free access"}
        </p>
        {isPaid && (
          <p>
            <span className="text-slate-400">Base Price:</span> ₹
            {book.basePrice ?? 0}
          </p>
        )}
        {isPaid && (
          <p>
            <span className="text-slate-400">Reading Window:</span>{" "}
            {book.defaultReadingHours || 24} hours
          </p>
        )}
      </div>

      {/* Description */}
      {book.description && (
        <div className="mb-3 text-xs text-slate-200 max-h-24 overflow-y-auto pr-1 space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            About this book
          </p>
          <p className="text-xs whitespace-pre-line">{book.description}</p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-slate-800">
        {!isPaid ? (
          <button
            onClick={handleReadClick}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold shadow-sm"
          >
            📖 Read Now (Free)
          </button>
        ) : (
          <>
            <button
              onClick={handleReadClick}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold border border-slate-600"
            >
              📖 Check Reading Access
            </button>
            <button
              onClick={handleBuyClick}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold shadow-sm"
            >
              💸 Buy via UPI
            </button>
          </>
        )}
      </div>
    </div>
  );
}
