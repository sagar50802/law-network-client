// src/utils/themeInitializer.js
// Handles theme + focus mode across pages
// Now includes live update sync — no reload needed

export function applySavedTheme() {
  try {
    const savedTheme = localStorage.getItem("lnx_theme") || "default";
    const focus = localStorage.getItem("lnx_focus") === "true";

    document.body.dataset.theme = savedTheme;
    document.body.dataset.focus = focus ? "on" : "off";

    const isClassroom = window.location.pathname.startsWith("/classroom");
    if (isClassroom && focus) showFocusBadge();
  } catch (err) {
    console.warn("Theme init failed:", err);
  }

  // ✅ Live sync: detect changes to localStorage (no refresh needed)
  window.addEventListener("storage", (e) => {
    if (e.key === "lnx_focus" || e.key === "lnx_theme") {
      const theme = localStorage.getItem("lnx_theme") || "default";
      const focus = localStorage.getItem("lnx_focus") === "true";

      document.body.dataset.theme = theme;
      document.body.dataset.focus = focus ? "on" : "off";

      const isClassroom = window.location.pathname.startsWith("/classroom");
      if (isClassroom && focus) showFocusBadge();
      else removeFocusBadge();
    }
  });
}

/* -----------------------------
   🧘 Floating Badge
------------------------------ */
function showFocusBadge() {
  removeFocusBadge();

  const badge = document.createElement("div");
  badge.id = "focus-mode-badge";
  badge.textContent = "🧘 Focus Mode: ON";
  badge.title = "Click to disable Focus Mode";

  Object.assign(badge.style, {
    position: "fixed",
    bottom: window.innerWidth < 640 ? "5.5rem" : "4rem",
    right: window.innerWidth < 640 ? "5rem" : "6rem",
    padding: "10px 18px",
    borderRadius: "9999px",
    fontWeight: "600",
    fontSize: "0.95rem",
    background: "var(--theme-accent, #10b981)",
    color: "white",
    boxShadow: "0 0 15px var(--theme-glow, rgba(16,185,129,0.4))",
    zIndex: "10050",
    opacity: "0.95",
    animation: "focusBadgePulse 3s infinite ease-in-out",
    transition: "opacity 0.3s ease, transform 0.2s ease",
    cursor: "pointer",
  });

  // 🖱️ Disable instantly on click
  badge.addEventListener("click", () => {
    localStorage.setItem("lnx_focus", "false");
    document.body.dataset.focus = "off";
    removeFocusBadge();
  });

  document.body.appendChild(badge);

  // Responsive reposition
  window.addEventListener("resize", () => {
    const b = document.getElementById("focus-mode-badge");
    if (!b) return;
    b.style.bottom = window.innerWidth < 640 ? "5.5rem" : "4rem";
    b.style.right = window.innerWidth < 640 ? "5rem" : "6rem";
  });
}

function removeFocusBadge() {
  const badge = document.getElementById("focus-mode-badge");
  if (badge) badge.remove();
}

// 🔆 Animation
const style = document.createElement("style");
style.textContent = `
@keyframes focusBadgePulse {
  0%, 100% { transform: scale(1); opacity: 0.92; }
  50% { transform: scale(1.08); opacity: 1; }
}
`;
document.head.appendChild(style);
