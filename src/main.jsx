import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/globals.css';

const OWNER_KEY = import.meta.env.VITE_OWNER_KEY || 'LAWNOWNER2025';

window.enterAdmin = (pwd) => {
  if (pwd === OWNER_KEY) {
    localStorage.setItem('ownerKey', OWNER_KEY);
    location.reload();
  }
};

window.exitAdmin = () => {
  localStorage.removeItem('ownerKey');
  location.reload();
};

// 🚫 Removed all console.log (no hints, no status messages)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
