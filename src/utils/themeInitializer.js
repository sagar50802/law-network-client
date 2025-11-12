// src/utils/themeInitializer.js

export function applySavedTheme() {
  window.addEventListener("DOMContentLoaded", () => {
    try {
      // 🧠 Load saved theme + focus
      const savedTheme = localStorage.getItem("lnx_theme") || "default";
      const focus = localStorage.getItem("lnx_focus") === "true";

      document.body.dataset.theme = savedTheme;
      document.body.dataset.focus = focus ? "on" : "off";

      // 🎓 Show focus badge only inside classroom
      const isInClassroom = window.location.pathname.startsWith("/classroom");
      if (isInClassroom && focus) {
        showFocusBadge();
      } else {
        removeFocusBadge();
      }
    } catch (err) {
      console.warn("Theme initializer failed:", err);
    }
  });
}

function showFocusBadge() {
  removeFocusBadge();

  const badge = document.createElement("div");
  badge.id = "focus-mode-badge";
  badge.textContent = "🧘 Focus Mode: ON";
  badge.title = "You’re in Focus Mode — distractions minimized";

  Object.assign(badge.style, {
    position: "fixed",
    bottom: "1.5rem",
    right: "1.5rem",
    padding: "10px 18px",
    borderRadius: "9999px",
    fontWeight: "600",
    fontSize: "0.95rem",
    background: "var(--theme-accent, #10b981)",
    color: "white",
    boxShadow: "0 0 15px var(--theme-glow, rgba(16,185,129,0.4))",
    zIndex: "9999",
    opacity: "0.95",
    animation: "focusBadgePulse 3s infinite ease-in-out",
    transition: "opacity 0.3s ease"
  });

  document.body.appendChild(badge);
}

function removeFocusBadge() {
  const existing = document.getElementById("focus-mode-badge");
  if (existing) existing.remove();
}

// Inject animation if CSS not loaded yet
const style = document.createElement("style");
style.textContent = `
@keyframes focusBadgePulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.07); opacity: 1; }
}
`;
document.head.appendChild(style);
