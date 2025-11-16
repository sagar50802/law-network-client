import React from "react";

export default function SeatBanner({ seatStatus, onSeatChange }) {
  const { hasActiveSeat, seatEndsAt } = seatStatus || {};

  const handleReserveClick = () => {
    // TODO: open reserve seat modal + payment flow (later step)
    alert("Seat reservation flow will come in the next step.");
  };

  const formattedEnd =
    seatEndsAt && new Date(seatEndsAt).toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });

  return (
    <div className="w-full flex justify-center px-4 pt-3">
      <div className="max-w-6xl w-full bg-black/60 border border-emerald-500/40 rounded-xl px-3 py-2 flex flex-wrap items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              hasActiveSeat ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
            }`}
          />
          <span className="text-xs sm:text-sm text-slate-200">
            {hasActiveSeat
              ? `Seat reserved${
                  formattedEnd ? ` · until ${formattedEnd}` : ""
                }`
              : "No seat reserved · Reserve a spot to read paid books"}
          </span>
        </div>

        <button
          onClick={handleReserveClick}
          className="ml-auto px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black shadow-sm"
        >
          {hasActiveSeat ? "Extend Seat" : "Reserve Your Seat"}
        </button>
      </div>
    </div>
  );
}
