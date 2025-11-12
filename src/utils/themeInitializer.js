// src/utils/themeInitializer.js
export function applySavedTheme() {
  try {
    const savedTheme = localStorage.getItem("lnx_theme") || "default";
    document.body.dataset.theme = savedTheme;

    const focus = localStorage.getItem("lnx_focus") === "true";
    document.body.dataset.focus = focus ? "on" : "off";

    // ✅ Show Focus Mode tag only inside classroom routes
    const isInClassroom = window.location.pathname.startsWith("/classroom");
    if (isInClassroom) {
      updateFocusBadge(focus);
    } else {
      removeFocusBadge();
    }
  } catch (e) {
    console.warn("Theme initializer failed:", e);
  }
}

function updateFocusBadge(isOn) {
  removeFocusBadge(); // clear any old instance

  if (!isOn) return;

  const badge = document.createElement("div");
  badge.id = "focus-mode-badge";
  badge.textContent = "🧘 Focus Mode: ON";
  badge.style.position = "fixed";
  badge.style.bottom = "1.2rem";
  badge.style.right = "1.2rem";
  badge.style.padding = "8px 14px";
  badge.style.borderRadius = "9999px";
  badge.style.fontWeight = "600";
  badge.style.fontSize = "0.9rem";
  badge.style.background = "var(--theme-accent, #10b981)";
  badge.style.color = "white";
  badge.style.boxShadow = "0 0 15px var(--theme-glow, rgba(16,185,129,0.4))";
  badge.style.zIndex = "9999";
  badge.style.transition = "opacity 0.4s ease";
  badge.style.opacity = "0.95";

  document.body.appendChild(badge);
}

function removeFocusBadge() {
  const existing = document.getElementById("focus-mode-badge");
  if (existing) existing.remove();
}
