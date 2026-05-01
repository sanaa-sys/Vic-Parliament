// src/components/MemberRow.jsx
export default function MemberRow({
  member, tagLabel, tagClass, electorateLabel,
  checked, onChange, isLast,
}) {
  const init = (
    (member.first_name || member.name || '')[0] +
    (member.last_name  || '')[0]
  ).toUpperCase();

  return (
    <div
      className="mp-row"
      style={isLast ? { borderBottom: 'none', paddingBottom: 0 } : {}}
      onClick={onChange}
    >
      <input
        type="checkbox"
        className="mp-check"
        checked={checked}
        onChange={onChange}
        onClick={e => e.stopPropagation()}
      />
      <div
        className="mp-photo-init"
        style={{ width: 36, height: 36, fontSize: 12 }}
      >
        {init}
      </div>
      <div className="mp-info">
        <div className="mp-name" style={{ fontSize: 13 }}>{member.name}</div>
        <div className="mp-role">
          <span className={`tag ${tagClass}`}>{tagLabel}</span>
          {member.party}{electorateLabel ? ` · ${electorateLabel}` : ''}
        </div>
        {member.email && (
          <div className="mp-email" style={{ fontSize: 11 }}>{member.email}</div>
        )}
      </div>
    </div>
  );
}
