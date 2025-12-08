export const setupContentSecurity = () => {
  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showSecurityWarning('Right-click is disabled to protect content');
    return false;
  });

  // Optional: Disable text selection
  const disableSelection = localStorage.getItem('disable-selection') === 'true';
  if (disableSelection) {
    document.addEventListener('selectstart', (e) => {
      e.preventDefault();
      return false;
    });
    
    // Apply CSS to prevent selection
    document.head.insertAdjacentHTML('beforeend', `
      <style>
        .answer-content {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
      </style>
    `);
  }

  // Detect screenshot attempts (limited browser support)
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(display-capture: none)');
    mediaQuery.addListener((e) => {
      if (e.matches) {
        showSecurityWarning('Screenshot detected. Please respect copyright.');
      }
    });
  }

  // Add beforeunload warning for copy attempts
  let copiedText = '';
  document.addEventListener('copy', (e) => {
    copiedText = window.getSelection().toString();
    if (copiedText.length > 100) { // Only warn for large copies
      e.preventDefault();
      showSecurityWarning('Copying content is restricted');
    }
  });

  // Add visibility change detection (for screenshot tools)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Page might be in screenshot mode
      setTimeout(() => {
        if (!document.hidden) {
          showSecurityWarning('Please do not copy or distribute copyrighted content.');
        }
      }, 1000);
    }
  });
};

const showSecurityWarning = (message) => {
  // Create warning modal
  const warning = document.createElement('div');
  warning.className = 'security-warning';
  warning.innerHTML = `
    <div class="warning-content">
      <div class="warning-icon">⚠️</div>
      <h4>Content Protection</h4>
      <p>${message}</p>
      <p class="warning-note">
        This content is copyrighted and intended for personal use only.
      </p>
      <button class="warning-ok">OK, I Understand</button>
    </div>
  `;
  
  warning.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;
  
  document.body.appendChild(warning);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (warning.parentNode) {
      warning.remove();
    }
  }, 5000);
  
  // Manual close
  warning.querySelector('.warning-ok').addEventListener('click', () => {
    warning.remove();
  });
};

export const toggleTextSelection = (enabled) => {
  localStorage.setItem('disable-selection', !enabled);
  window.location.reload();
};
