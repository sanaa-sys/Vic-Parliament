// src/components/ProgressBar.jsx
export default function ProgressBar({ step }) {
  const labels = [
    '', 'Step 1 of 4 — Postcode', 'Step 2 of 4 — Select recipients',
    'Step 3 of 4 — Write email', 'Step 4 of 4 — Send',
  ];
  return (
    <div className="progress">
      {[1, 2, 3, 4].map(n => (
        <div key={n} className={`prog-dot${n <= step ? ' done' : ''}`} />
      ))}
      <span className="prog-label">{labels[step]}</span>
    </div>
  );
}
