import React from "react";

export default function BookCard({ book, onClick }) {
  const isPaid = book.isPaid;
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col rounded-xl overflow-hidden border border-slate-700/80 bg-black/60 hover:bg-black/80 hover:border-amber-400/60 transition shadow-sm"
    >
      {/* Cover */}
      <div className="aspect-[3/4] w-full overflow-hidden bg-slate-900">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
            No cover
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col px-2.5 py-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-100 line-clamp-2 text-left">
            {book.title}
          </h3>
          {isPaid ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/90 text-black font-semibold whitespace-nowrap">
              Paid
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/90 text-black font-semibold whitespace-nowrap">
              Free
            </span>
          )}
        </div>

        {book.subtitle && (
          <p className="mt-1 text-[11px] text-slate-300 line-clamp-1 text-left">
            {book.subtitle}
          </p>
        )}

        {book.author && (
          <p className="mt-0.5 text-[10px] text-slate-400 text-left">
            by {book.author}
          </p>
        )}

        {isPaid && (
          <p className="mt-1 text-[11px] text-amber-300 font-semibold text-left">
            ₹{book.basePrice ?? 0}
          </p>
        )}
      </div>

      {/* Glow on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-40 bg-gradient-to-t from-amber-400/20 via-transparent to-transparent transition-opacity" />
    </button>
  );
}
