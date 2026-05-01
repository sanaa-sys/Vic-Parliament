// src/components/Step4.jsx
import { useState } from 'react';

const PREFIXES = ['civic','voice','letter','resident','constituent','citizen','community','advocate'];
const DOMAINS  = ['proton.me','tuta.com','protonmail.com','tutanota.com','simplelogin.me'];

export default function Step4({ selection, email, onBack }) {
  const { selected } = selection;
  const { subject, body } = email;

  // All valid email addresses joined for the mailto: to field
  const allEmails = selected.map(m => m.email).filter(Boolean);

  const [showMailtoNote, setShowMailtoNote] = useState(false);
  const [showAnon,       setShowAnon]       = useState(false);
  const [burnerAddr,     setBurnerAddr]     = useState('');
  const [copied,         setCopied]         = useState({});

  // Build a single mailto: with all recipients in the To field
  function buildMailto(emails) {
    const to = emails.map(encodeURIComponent).join(',');
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function sendMailto() {
    if (!allEmails.length) { alert('No email addresses found.'); return; }

    // Show "nothing happened?" hint after a short delay
    setShowMailtoNote(false);
    setTimeout(() => setShowMailtoNote(true), 2500);

    // Single mailto opens one pre-filled compose window with ALL recipients
    window.location.href = buildMailto(allEmails);
  }

  function toggleAnon() {
    if (!showAnon) {
      const pre = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
      const num = Math.floor(1000 + Math.random() * 8999);
      const dom = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
      setBurnerAddr(`${pre}${num}@${dom}`);
    }
    setShowAnon(p => !p);
  }

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

  // Recipients summary
  const summaryLines = selected.map(m => {
    const role = m.chamber === 'senate'   ? 'Senator'
               : m.chamber === 'assembly' ? 'State Assembly'
               : m.chamber === 'council'  ? 'State Council'
               : 'Federal Representative';
    return `${m.name} — ${role} · ${m.party}`;
  });

  return (
    <div>
      <div className="section-title">Send your email</div>
      <div className="section-sub">
        Sent from your own email account to all {allEmails.length} recipient{allEmails.length !== 1 ? 's' : ''} at once
      </div>

      {/* Recipients summary */}
      <div className="recipients-summary">
        <strong>
          Sending to {selected.length} recipient{selected.length !== 1 ? 's' : ''}:
        </strong>
        <ul className="recipients-list">
          {summaryLines.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </div>

      {/* Primary action: Open email app */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 28 }}>📧</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text)' }}>
              Open in your email app
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Opens one compose window with <strong>all {allEmails.length} recipients</strong> pre-filled
              in the To field. Works with Gmail, Outlook, Apple Mail, Yahoo — any email account.
            </div>
          </div>
        </div>
        <button
          className="btn btn-primary"
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
            Use the <strong>Copy</strong> option below instead.
          </div>
        )}
      </div>

      {/* Fallback: Copy to clipboard */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="label" style={{ marginBottom: 10 }}>
          Can't open email app? Copy and paste instead
        </div>

        {[
          {
            field: 'emails',
            label: `Recipients — paste all ${allEmails.length} into your To: field`,
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
                  flexShrink: 0,
                  fontSize: 12,
                  padding: '7px 14px',
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

      {/* Anonymous option */}
      <div
        className="send-opt"
        style={{ marginBottom: 8 }}
        onClick={toggleAnon}
      >
        <div className="send-icon" style={{ background: 'var(--color-bg-secondary)' }}>🔒</div>
        <div>
          <div className="send-title">Prefer to stay anonymous?</div>
          <div className="send-desc">
            Use a privacy-forward address from Proton, Tutanota, or SimpleLogin instead of your personal email.
          </div>
        </div>
      </div>

      {showAnon && (
        <div className="anon-box">
          <div className="label">Suggested address</div>
          <div className="anon-addr">{burnerAddr}</div>
          <div className="anon-links">
            Create this account first, then click "Open email app".&nbsp;
            <a href="https://proton.me"     target="_blank" rel="noreferrer">Proton.me</a> ·
            <a href="https://tuta.com"       target="_blank" rel="noreferrer">Tuta.com</a> ·
            <a href="https://simplelogin.io" target="_blank" rel="noreferrer">SimpleLogin.io</a>
          </div>
        </div>
      )}

      <div className="btns" style={{ marginTop: 16 }}>
        <button className="btn" onClick={onBack}>← Back</button>
      </div>
    </div>
  );
}
