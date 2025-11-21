import React from "react";

export default function BookCard({ book = {}, onClick = null }) {
  if (!book) return null;

  const { title, author, coverUrl, isPaid, basePrice } = book;

  return (
    <button
      type="button"
      onClick={() => onClick && onClick(book)}
      className="relative z-40 group flex flex-col rounded-xl overflow-hidden 
                 border border-slate-700/80 bg-black/60 hover:bg-black/80 
                 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {/* Cover Image */}
      <div className="aspect-[3/4] w-full overflow-hidden bg-slate-900">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title || "Book"}
            className="w-full h-full object-cover group-hover:scale-105 
                       transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center 
                          text-xs text-slate-500">
            No cover
          </div>
        )}
      </div>

      {/* Text Content */}
      <div className="flex-1 flex flex-col px-2.5 py-2 text-left">
        <h3 className="text-xs sm:text-sm font-semibold text-slate-100 line-clamp-2">
          {title || "Untitled"}
        </h3>

        {author && (
          <p className="mt-1 text-[10px] text-slate-400">by {author}</p>
        )}

        {isPaid && (
          <p className="mt-1 text-[10px] text-amber-400">
            Paid • ₹{basePrice ?? 0}
          </p>
        )}
      </div>
    </button>
  );
}
