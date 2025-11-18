// src/components/library/BookCard.jsx
import React from "react";

export default function BookCard({ book, onClick }) {
  const isPaid = book.isPaid;

  return (
    <button
      onClick={onClick}
      className="relative z-40 group flex flex-col rounded-xl overflow-hidden border border-slate-700/80 bg-black/60 hover:bg-black/80 transition"
    >
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

      <div className="flex-1 flex flex-col px-2.5 py-2 text-left">
        <h3 className="text-xs sm:text-sm font-semibold text-slate-100 line-clamp-2">
          {book.title}
        </h3>

        {book.author && (
          <p className="mt-1 text-[10px] text-slate-400">by {book.author}</p>
        )}
      </div>
    </button>
  );
}
