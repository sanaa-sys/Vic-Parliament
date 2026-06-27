import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── Squarespace iframe auto-resize ────────────────────────────────────────
// When embedded as an iframe in Squarespace, this notifies the parent page
// of the app's current height so the iframe resizes automatically as the
// user moves through steps.
// The parent page listens for 'writeeز-resize' messages (see the Code Block).
// This does nothing when the app is opened directly (not in an iframe).

function notifyParentHeight() {
  if (window.self === window.top) return; // not in an iframe — do nothing
  window.parent.postMessage(
    { type: 'writeeز-resize', height: document.body.scrollHeight },
    '*'
  );
}

// Notify on any DOM size change
const resizeObserver = new ResizeObserver(() => {
  notifyParentHeight();
});
resizeObserver.observe(document.body);

// Also notify on initial load
window.addEventListener('load', notifyParentHeight);
