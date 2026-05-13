// src/components/Step4.jsx
import { useState } from 'react';

export default function Step4({ selection, email, onBack }) {
  const { selected } = selection;
  const { subject, body } = email;

  const allEmails = selected.map(m => m.email).filter(Boolean);

  const [showMailtoNote, setShowMailtoNote] = useState(false);
  const [copied,         setCopied]         = useState({});

  // ── mailto helpers ────────────────────────────────────────────────────────
  function buildMailto(emails) {
    const to = emails.map(encodeURIComponent).join(',');
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function sendMailto() {
    if (!allEmails.length) { alert('No email addresses found.'); return; }
    setShowMailtoNote(false);
    setTimeout(() => setShowMailtoNote(true), 2500);
    window.location.href = buildMailto(allEmails);
  }

  // ── Proton Mail web compose ───────────────────────────────────────────────
  // Opens Proton Mail's web compose window with To, Subject and Body pre-filled.
  // Proton Mail supports the standard mailto: scheme in its web app via a URL
  // parameter: https://mail.proton.me/u/0/inbox#to=...&subject=...&body=...
  // We open it in a new tab so the user stays on the current page.
  function openProtonMail() {
    if (!allEmails.length) { alert('No email addresses found.'); return; }
    const params = new URLSearchParams({
      to:      allEmails.join(','),
      subject,
      body,
    });
    window.open(`https://mail.proton.me/u/0/inbox?${params.toString()}`, '_blank', 'noopener');
  }

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  function copyText(field, text) {
    const finish = () => {
      setCopied(p => ({ ...p, [field]: true }));
      setTimeout(() => setCopied(p => ({ ...p, [field]: false })), 2000);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(finish).catch(() => fallbackCopy(text, finish));
    } else {
      fallbackCopy(text, finish);
    }
  }

  function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); cb(); } catch (_) {}
    document.body.removeChild(ta);
  }

  const summaryLines = selected.map(m => {
    const role = m.chamber === 'senate'   ? 'Senator'
               : m.chamber === 'assembly' ? 'State Assembly'
               : m.chamber === 'council'  ? 'State Council'
               : m.chamber === 'lga'      ? `${m.council || 'Local Council'} Mayor`
               : 'Federal Representative';
    return `${m.name} — ${role} · ${m.party}`;
  });

  return (
    <div>
      <div className="section-title">Send your email</div>
      <div className="section-sub">
        Sending to {allEmails.length} recipient{allEmails.length !== 1 ? 's' : ''} at once
      </div>

      {/* Recipients summary */}
      <div className="recipients-summary">
        <strong>Sending to {selected.length} recipient{selected.length !== 1 ? 's' : ''}:</strong>
        <ul className="recipients-list">
          {summaryLines.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </div>

      {/* ── Option 1: Proton Mail ───────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          {/* Proton logo SVG */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#6D4AFF"/>
            <path d="M7 10.5C7 9.12 8.12 8 9.5 8H17C20.31 8 23 10.69 23 14C23 17.31 20.31 20 17 20H11V24H7V10.5Z"
                  fill="white"/>
            <path d="M11 12V16H17C18.1 16 19 15.1 19 14C19 12.9 18.1 12 17 12H11Z"
                  fill="#6D4AFF"/>
          </svg>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text)' }}>
              Open in Proton Mail
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Opens Proton Mail web compose with all{' '}
              <strong>{allEmails.length} recipients</strong>, subject and body pre-filled.
              You must be signed into Proton Mail in your browser.
            </div>
          </div>
        </div>
        <button
          className="btn btn-primary"
          style={{
            width: '100%', justifyContent: 'center', padding: 12, fontSize: 15,
            background: '#6D4AFF', borderColor: '#5a38e0',
          }}
          onClick={openProtonMail}
        >
          Open Proton Mail →
        </button>
      </div>

      {/* ── Option 2: Default email app ────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 28 }}>📧</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text)' }}>
              Open in your default email app
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Works with Gmail, Outlook, Apple Mail, Yahoo — any app set as your default.
            </div>
          </div>
        </div>
        <button
          className="btn"
          style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 15 }}
          onClick={sendMailto}
        >
          Open email app →
        </button>
        {showMailtoNote && (
          <div style={{
            marginTop: 10, fontSize: 12,
            color: 'var(--color-text-secondary)', textAlign: 'center',
          }}>
            Nothing happened? Your browser may not have a default email app set.
            Use Proton Mail above or the <strong>Copy</strong> option below.
          </div>
        )}
      </div>

      {/* ── Option 3: Copy and paste ────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="label" style={{ marginBottom: 10 }}>
          Copy and paste manually
        </div>

        {[
          {
            field: 'emails',
            label: `To — all ${allEmails.length} recipients`,
            text:  allEmails.join(', '),
          },
          { field: 'subject', label: 'Subject', text: subject },
          { field: 'body',    label: 'Message body', text: body },
        ].map(({ field, label, text }) => (
          <div key={field} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div
                className="copy-field"
                style={{
                  flex: 1,
                  maxHeight: field === 'body' ? 120 : 60,
                  overflowY: 'auto',
                  whiteSpace: field === 'body' ? 'pre-wrap' : 'normal',
                }}
              >
                {text}
              </div>
              <button
                className="btn"
                style={{
                  flexShrink: 0, fontSize: 12, padding: '7px 14px',
                  color: copied[field] ? 'var(--color-text-success)' : undefined,
                }}
                onClick={() => copyText(field, text)}
              >
                {copied[field] ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="btns" style={{ marginTop: 16 }}>
        <button className="btn" onClick={onBack}>← Back</button>
      </div>
    </div>
  );
}
