import React from "react";

const tabs = [
  { id: "free", label: "Free Access" },
  { id: "paid", label: "Paid Collection" },
  { id: "my", label: "My Shelf" },
];

export default function LibraryTabs({ activeTab, onChangeTab }) {
  return (
    <div className="flex items-center gap-2 text-xs sm:text-sm border-b border-slate-800 pb-2">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`px-3 py-1 rounded-full transition ${
              isActive
                ? "bg-amber-500 text-black font-semibold shadow-sm"
                : "bg-black/40 text-slate-300 border border-slate-700 hover:bg-slate-900/80"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
      <span className="ml-auto text-[11px] text-slate-400 italic">
        Choose your zone
      </span>
    </div>
  );
}
