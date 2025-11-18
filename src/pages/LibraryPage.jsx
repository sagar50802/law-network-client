// src/pages/LibraryPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import LibraryShell from "../components/library/LibraryShell.jsx";
import LibraryNav from "../components/library/LibraryNav.jsx";
import LibraryTabs from "../components/library/LibraryTabs.jsx";
import SeatBanner from "../components/library/SeatBanner.jsx";
import BookGrid from "../components/library/BookGrid.jsx";
import BookDetailPanel from "../components/library/BookDetailPanel.jsx";

import LibraryBackground3D from "../components/library/LibraryBackground3D.jsx";

const API_URL =
  import.meta.env.VITE_API_URL || "https://law-network-server.onrender.com";

export default function LibraryPage() {
  const [books, setBooks] = useState([]);
  const [activeTab, setActiveTab] = useState("free");
  const [selectedBook, setSelectedBook] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [seatStatus, setSeatStatus] = useState({
    hasActiveSeat: false,
    seatEndsAt: null,
  });

  const [myBooks, setMyBooks] = useState([]);

  /* Load books */
  useEffect(() => {
    async function loadBooks() {
      try {
        const res = await fetch(`${API_URL}/api/library/books`);
        const json = await res.json();

        if (json.success) {
          const fixedBooks = (json.data || []).map((b) => ({
            ...b,
            previewImage: b.previewImage || b.coverUrl || null,
          }));
          setBooks(fixedBooks);
        }
      } catch (err) {
        console.error("[Library] Error loading books:", err);
      }
    }
    loadBooks();
  }, []);

  const visibleBooks = books.filter((b) => {
    if (activeTab === "free") return !b.isPaid;
    if (activeTab === "paid") return b.isPaid;
    if (activeTab === "my")
      return myBooks.some((p) => p.bookId === b._id);
    return true;
  });

  const handleSelectBook = useCallback((book) => {
    setSelectedBook(book);
    setIsDetailOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setIsDetailOpen(false);
  }, []);

  return (
    <LibraryShell>
      {/* ⭐ 3D Background (under everything) */}
      <LibraryBackground3D />

      {/* ⭐ MAIN CONTENT ABOVE BACKGROUND */}
      <div className="relative z-30 flex flex-col h-full">
        <LibraryNav />

        <SeatBanner seatStatus={seatStatus} onSeatChange={setSeatStatus} />

        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 pb-6">
          <LibraryTabs activeTab={activeTab} onChangeTab={setActiveTab} />

          <div className="mt-4 flex-1 flex gap-4">
            {/* Book grid */}
            <div className="flex-1">
              <BookGrid books={visibleBooks} onSelectBook={handleSelectBook} />
            </div>

            {/* Desktop detail panel */}
            <div className="hidden lg:block">
              <BookDetailPanel
                book={selectedBook}
                isOpen={isDetailOpen}
                onClose={handleCloseDetails}
                seatStatus={seatStatus}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ⭐ MOBILE DETAIL PANEL — fixed fullscreen */}
      {isDetailOpen && selectedBook && (
        <div className="lg:hidden fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex justify-center items-center p-4">
          <div className="w-full max-w-sm bg-black rounded-xl p-4 border border-slate-700 relative">
            <button
              onClick={handleCloseDetails}
              className="absolute top-2 right-2 text-slate-300 text-sm"
            >
              ✕
            </button>

            <BookDetailPanel
              book={selectedBook}
              isOpen={true}
              onClose={handleCloseDetails}
              seatStatus={seatStatus}
              mobileMode={true}
            />
          </div>
        </div>
      )}
    </LibraryShell>
  );
}
