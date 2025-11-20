import React from "react";
import BookCard from "./BookCard.jsx";

export default function BookGrid({ books = [], onSelectBook }) {
  if (!books || books.length === 0) {
    return (
      <div className="mt-8 text-center text-sm text-slate-400">
        No books found in this section yet.
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
      {books.map((book) => (
        <BookCard
          key={book._id}
          book={book}
          onClick={() => onSelectBook && onSelectBook(book)}
        />
      ))}
    </div>
  );
}
