import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

export const posthogEnabled = !!POSTHOG_KEY;

export function initPostHog() {
  if (!POSTHOG_KEY || posthog.__loaded) return posthog;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    // Events only (postcode, topic, funnel) — no session replay
    disable_session_recording: true,
  });

  return posthog;
}

export function capture(event, properties) {
  if (!posthogEnabled) return;
  posthog.capture(event, properties);
}

export { posthog };
