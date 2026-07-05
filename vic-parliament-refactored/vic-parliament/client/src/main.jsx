import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
        {/* Vercel Analytics — tracks page views and custom events */}
        <Analytics />
        {/* Vercel Speed Insights — tracks Core Web Vitals */}
        <SpeedInsights />
    </React.StrictMode>
);

// ── Squarespace iframe auto-resize ────────────────────────────────────────
// Notifies the parent Squarespace page of the app's height so the iframe
// resizes automatically as the user moves through steps.
// Does nothing when the app is opened directly (not in an iframe).

function notifyParentHeight() {
    if (window.self === window.top) return;
    window.parent.postMessage(
        { type: 'writeeز-resize', height: document.body.scrollHeight },
        '*'
    );
}

const resizeObserver = new ResizeObserver(() => notifyParentHeight());
resizeObserver.observe(document.body);
window.addEventListener('load', notifyParentHeight);
