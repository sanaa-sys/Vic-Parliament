// src/components/Step4.jsx
import { useState } from 'react';

const CC_EMAIL = 'jazeer@boiv.org.au';
import { sendViaEmailjs } from '../hooks/sendEmail';

export default function Step4({ selection, email, onBack }) {
    const { selected } = selection;
    const { subject, body } = email;

    const allEmails = selected.map(m => m.email).filter(Boolean);

    const [showMailtoNote, setShowMailtoNote] = useState(false);
    const [copied, setCopied] = useState({});
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState(null); // {ok, message}

    // ── Anonymous send via EmailJS ───────────────────────
    async function sendAnonymously() {
        if (!allEmails.length) { alert('No email addresses found.'); return; }
        setSending(true);
        setSendResult(null);

        try {
            const result = await sendViaEmailjs(allEmails, CC_EMAIL, subject, body);
            setSendResult(result);
        } catch (err) {
            setSendResult({ ok: false, message: `Error: ${err.message}` });
        } finally {
            setSending(false);
        }
    }

    // ── mailto helpers ────────────────────────────────────────────────────
    function buildMailto(emails) {
        const to = emails.map(encodeURIComponent).join(',');
        return `mailto:${to}?cc=${encodeURIComponent(CC_EMAIL)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    function sendMailto() {
        if (!allEmails.length) { alert('No email addresses found.'); return; }
        setShowMailtoNote(false);
        setTimeout(() => setShowMailtoNote(true), 2500);
        window.location.href = buildMailto(allEmails);
    }



    // ── Copy to clipboard ─────────────────────────────────────────────────
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
        try { document.execCommand('copy'); cb(); } catch (_) { }
        document.body.removeChild(ta);
    }

    const summaryLines = selected.map(m => {
        const role = m.chamber === 'senate' ? 'Senator'
            : m.chamber === 'assembly' ? 'State Assembly'
                : m.chamber === 'council' ? 'State Council'
                    : m.chamber === 'lga' ? `${m.council || 'Local Council'} Mayor`
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

            {/* How to send info */}
            <div className="card" style={{ marginBottom: 12 }}>
                <div className="label" style={{ marginBottom: 8 }}>How to send</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--color-text)' }}>Send anonymously</strong> — sends directly
                    from <strong>stophate.cip@gmail.com</strong> with no login required.
                    Your identity is not shared with representatives.
                    <br /><br />
                    <strong style={{ color: 'var(--color-text)' }}>Send email</strong> — opens your default
                    email app (Gmail, Outlook, Apple Mail) with everything pre-filled.
                    All options automatically CC <strong>{CC_EMAIL}</strong>.
                    <br /><br />
                    <strong style={{ color: 'var(--color-text)' }}>No default email app setup</strong> — You can
                    copy and paste all fields manually using the <strong>Copy button</strong> beside each field below.
                    <br /><br />
                
                </div>
            </div>

            {/* ── Anonymous send result ────────────────────────────────────────── */}
            {sendResult && (
                <div style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 12,
                    fontSize: 13,
                    background: sendResult.ok ? 'var(--color-bg-success)' : 'var(--color-bg-danger)',
                    color: sendResult.ok ? 'var(--color-text-success)' : 'var(--color-text-danger)',
                    border: `0.5px solid ${sendResult.ok ? 'rgba(124,186,90,0.3)' : 'rgba(224,112,112,0.3)'}`,
                }}>
                    {sendResult.ok ? '✓ ' : '✗ '}{sendResult.message}
                </div>
            )}

            {/* ── Copy and paste ───────────────────────────────────────────────── */}
            <div className="card" style={{ marginBottom: 12 }}>
                <div className="label" style={{ marginBottom: 10 }}>
                    Copy and paste manually
                </div>

                {[
                    { field: 'emails', label: `To — all ${allEmails.length} recipients`, text: allEmails.join(', ') },
                    { field: 'cc', label: 'Cc', text: CC_EMAIL },
                    { field: 'subject', label: 'Subject', text: subject },
                    { field: 'body', label: 'Message body', text: body },
                ].map(({ field, label, text }) => (
                    <div key={field} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                            {label}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <div className="copy-field" style={{
                                flex: 1,
                                maxHeight: field === 'body' ? 120 : 60,
                                overflowY: 'auto',
                                whiteSpace: field === 'body' ? 'pre-wrap' : 'normal',
                            }}>
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

            {/* ── Buttons ──────────────────────────────────────────────────────── */}
            <div className="btns" style={{ marginTop: 16 }}>
                <button className="btn" onClick={onBack}>← Back</button>

                <button
                    className="btn btn-primary"
                    onClick={sendAnonymously}
                    disabled={sending || sendResult?.ok}
                    style={{
                        opacity: (sending || sendResult?.ok) ? 0.7 : 1,
                        cursor: (sending || sendResult?.ok) ? 'default' : 'pointer',
                    }}
                >
                    {sending ? 'Sending…' : sendResult?.ok ? 'Sent ✓' : 'Send anonymously →'}
                </button>

                <button className="btn btn-primary" onClick={sendMailto}>
                    Send email →
                </button>

            </div>

            {showMailtoNote && (
                <div style={{
                    marginTop: 10, fontSize: 12,
                    color: 'var(--color-text-secondary)', textAlign: 'center',
                }}>
                    Nothing happened? Your browser may not have a default email app set.
                    Use <strong>Send anonymously</strong> or the <strong>Copy</strong> option above.
                </div>
            )}
        </div>
    );
}