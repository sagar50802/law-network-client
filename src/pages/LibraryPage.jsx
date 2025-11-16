import React, { useEffect, useState, useCallback } from "react";
import LibraryShell from "../components/library/LibraryShell.jsx";
import LibraryNav from "../components/library/LibraryNav.jsx";
import LibraryTabs from "../components/library/LibraryTabs.jsx";
import SeatBanner from "../components/library/SeatBanner.jsx";
import BookGrid from "../components/library/BookGrid.jsx";
import BookDetailPanel from "../components/library/BookDetailPanel.jsx";

// Adjust if your API base is different
const API_URL =
  import.meta.env.VITE_API_URL || "https://law-network-server.onrender.com";

export default function LibraryPage() {
  const [books, setBooks] = useState([]);
  const [activeTab, setActiveTab] = useState("free"); // "free" | "paid" | "my"
  const [selectedBook, setSelectedBook] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Later: fetch actual seat & purchase status
  const [seatStatus, setSeatStatus] = useState({
    hasActiveSeat: false,
    seatEndsAt: null,
  });

  // Later: user’s purchased books
  const [myBooks, setMyBooks] = useState([]);

  /* ============================================================
     📚 Load Library Books (public list)
  ============================================================ */
  useEffect(() => {
    async function loadBooks() {
      try {
        const res = await fetch(`${API_URL}/api/library/books`);
        const json = await res.json();
        if (json.success) {
          setBooks(json.data || []);
        }
      } catch (err) {
        console.error("[Library] Error loading books:", err);
      }
    }

    loadBooks();
  }, []);

  /* ============================================================
     🔁 Filter books by activeTab
  ============================================================ */
  const visibleBooks = books.filter((b) => {
    if (activeTab === "free") return !b.isPaid;
    if (activeTab === "paid") return b.isPaid;
    if (activeTab === "my") {
      // TODO: later intersect with myBooks purchases
      return myBooks.some((p) => String(p.bookId) === String(b._id));
    }
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
      <div className="flex flex-col h-full">
        {/* Top navigation inside library */}
        <LibraryNav />

        {/* Seat banner (status + reserve) */}
        <SeatBanner
          seatStatus={seatStatus}
          onSeatChange={setSeatStatus}
        />

        {/* Tabs + content */}
        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 pb-6">
          <LibraryTabs activeTab={activeTab} onChangeTab={setActiveTab} />

          <div className="mt-4 flex-1 flex gap-4">
            {/* Book grid */}
            <div className="flex-1">
              <BookGrid
                books={visibleBooks}
                onSelectBook={handleSelectBook}
              />
            </div>

            {/* Detail panel (side or overlay) */}
            <BookDetailPanel
              book={selectedBook}
              isOpen={isDetailOpen}
              onClose={handleCloseDetails}
              seatStatus={seatStatus}
            />
          </div>
        </div>
      </div>
    </LibraryShell>
  );
}
