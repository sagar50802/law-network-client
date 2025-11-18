import React from "react";
import { useNavigate } from "react-router-dom";

export default function BookDetailMobile({ book, isOpen, onClose, seatStatus }) {
  if (!book || !isOpen) return null;

  const navigate = useNavigate();
  const isPaid = book.isPaid;
  const previewSrc = book.previewImage || book.coverUrl || null;

  const handleRead = () => {
    navigate(`/library/reader/${book._id}`);
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 flex lg:hidden">
      <div className="bg-[#0d1117] w-full h-full p-4 overflow-y-auto rounded-t-2xl">
        
        {/* Close */}
        <div className="flex justify-end">
          <button onClick={onClose} className="text-white text-xl">✕</button>
        </div>

        {/* Cover */}
        <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-slate-900 mb-4">
          {previewSrc ? (
            <img src={previewSrc} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
              No preview available
            </div>
          )}
        </div>

        {/* Info */}
        <h2 className="text-lg text-white font-semibold">{book.title}</h2>
        <p className="text-sm text-slate-400">by {book.author}</p>

        <p className="text-xs text-slate-400 mt-1">
          {isPaid ? "Paid book" : "Free access"}
        </p>

        {book.description && (
          <p className="mt-4 text-sm text-slate-300 whitespace-pre-line">
            {book.description}
          </p>
        )}

        {/* Buttons */}
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={handleRead}
            className="w-full py-3 bg-emerald-500 text-black font-bold rounded-xl"
          >
            📖 Read Now
          </button>

          {isPaid && (
            <button className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl">
              💸 Buy Access (UPI)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
