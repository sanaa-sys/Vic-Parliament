// src/components/Step3.jsx
import { useState, useEffect } from 'react';
import { getTemplateFallback } from '../data/templates';

// Map a member's chamber/role to a formal salutation
function getRoleSalutation(member) {
  if (!member) return 'Dear Member,';
  const chamber = member.chamber || '';
  if (chamber === 'senate')   return 'Dear Senator,';
  if (chamber === 'assembly') return 'Dear Member of the Legislative Assembly,';
  if (chamber === 'council')  return 'Dear Member of the Legislative Council,';
  if (chamber === 'lga')      return `Dear Mayor,`;
  return 'Dear Member of Parliament,';
}

// Derive the primaryRole string sent to the server
function getPrimaryRole(member) {
  if (!member) return 'Federal Representative';
  const chamber = member.chamber || '';
  if (chamber === 'senate')   return 'Senator';
  if (chamber === 'assembly') return 'Member of the Legislative Assembly';
  if (chamber === 'council')  return 'Member of the Legislative Council';
  if (chamber === 'lga')      return `Mayor of ${member.council || 'Council'}`;
  return 'Federal Representative';
}

export default function Step3({ lookup, selection, onNext, onBack }) {
  const [subject,   setSubject]   = useState('');
  const [body,      setBody]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [loadWidth, setLoadWidth] = useState(0);
  const [aiTitle,   setAiTitle]   = useState('Groq AI draft');
  const [aiSub,     setAiSub]     = useState('Personalised for your topic and representatives — edit before sending');
  const [error,     setError]     = useState('');

  // Auto-generate on mount
  useEffect(() => { generateEmail(); }, []);

  async function generateEmail() {
    setError('');
    setLoading(true);
    setLoadWidth(0);
    setTimeout(() => setLoadWidth(88), 50);

    const { topic, customTopic, division, federalRep } = lookup;

    // Use role, not name
    const primaryRole = getPrimaryRole(selection.selected[0] || federalRep);
    const electorate  = division || 'your electorate';

    const recipients = selection.selected.map(m => ({
      name:  m.name,
      party: m.party,
      role:  getPrimaryRole(m),
    }));

    try {
      const res = await fetch('/api/generate-email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ topic, customTopic, electorate, primaryRole, recipients }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      setSubject(data.subject);
      setBody(data.body);
      setAiTitle('Groq AI draft');
      setAiSub('Personalised for your topic and representatives — edit before sending');

    } catch (err) {
      console.warn('AI failed, using template:', err.message);
      setError(`AI unavailable: ${err.message}. Showing template draft instead.`);

      // Fallback — use role salutation in template too
      const salutation = getRoleSalutation(selection.selected[0] || federalRep);
      const fb = getTemplateFallback(
        topic,
        salutation,
        division || 'your electorate',
        customTopic,
      );
      setSubject(fb.subject);
      setBody(fb.body);
      setAiTitle('Template draft');
      setAiSub('AI unavailable — template used. Edit freely before sending.');
    } finally {
      setLoadWidth(100);
      setTimeout(() => setLoading(false), 250);
    }
  }

  return (
    <div>
      <div className="section-title">Your email</div>
      <div className="section-sub">AI-drafted by Groq (Llama 3.1) — edit freely before sending</div>

      {/* AI banner */}
      <div className="ai-banner">
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 13 }}>
            {aiTitle}
          </div>
          <div>{aiSub}</div>
        </div>
        <button
          className="btn"
          style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0 }}
          onClick={generateEmail}
          disabled={loading}
        >
          {loading ? '…' : 'Regenerate ↺'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>
      )}

      {/* Loading bar */}
      {loading && (
        <div style={{ marginBottom: 12 }}>
          <div className="loading-bar">
            <div className="loading-fill" style={{ width: `${loadWidth}%` }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Drafting with Groq AI…
          </div>
        </div>
      )}

      {/* Email fields */}
      <div style={{ opacity: loading ? 0.35 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="label">Subject line</div>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Email subject"
          />
        </div>
        <div className="card">
          <div className="label">Message body</div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
          />
        </div>
      </div>

      <div className="btns">
        <button className="btn" onClick={onBack}>← Back</button>
        <button
          className="btn btn-primary"
          onClick={() => onNext({ subject, body })}
          disabled={!subject || !body}
        >
          Next: Send options →
        </button>
      </div>
    </div>
  );
}
