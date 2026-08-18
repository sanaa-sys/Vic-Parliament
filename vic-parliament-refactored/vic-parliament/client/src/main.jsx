import React from 'react';
import ReactDOM from 'react-dom/client';
import { PostHogProvider } from 'posthog-js/react';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import './index.css';
import { initPostHog, posthog, posthogEnabled } from './lib/posthog';

if (posthogEnabled) initPostHog();

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <PostHogProvider client={posthog}>
            <App />
            {/* Vercel Analytics — tracks page views and custom events */}
            <Analytics />
        </PostHogProvider>
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
