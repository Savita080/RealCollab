import React from 'react';

function ScoreRing({ score, size = 52 }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 95 ? '#1D9E75' : score >= 85 ? '#378ADD' : score >= 70 ? '#EF9F27' : '#E24B4A';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-3, #eee)" strokeWidth={4} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
      />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fontSize={12} fontWeight={500} fill={color}>{score}</text>
    </svg>
  );
}

function CriteriaCard({ item }) {
  const color = item.score >= 95 ? '#1D9E75' : item.score >= 85 ? '#378ADD' : item.score >= 70 ? '#EF9F27' : '#E24B4A';
  const bgIssue = { background: 'rgba(226,75,74,0.10)', color: '#c0392b', fontSize: 11, padding: '2px 8px', borderRadius: 6, display: 'inline-block', marginRight: 4, marginBottom: 4 };
  const bgSuggest = { background: 'rgba(55,138,221,0.10)', color: '#185FA5', fontSize: 11, padding: '2px 8px', borderRadius: 6, display: 'inline-block', marginRight: 4, marginBottom: 4 };
  const name = item.criteria.replace(/_/g, ' ');

  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '0.5px solid var(--border-1, rgba(0,0,0,0.1))',
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', textTransform: 'capitalize' }}>{name}</span>
        <ScoreRing score={item.score} size={44} />
      </div>

      {/* Bar */}
      <div style={{ height: 4, background: 'var(--bg-3, #ddd)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${item.score}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>

      {/* Summary */}
      <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>{item.summary}</p>

      {/* Tags */}
      {(item.issues?.length > 0 || item.suggestions?.length > 0) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {item.issues?.map((iss, i) => (
            <span key={i} style={{ ...bgIssue, whiteSpace: 'normal', display: 'block', marginRight: 0 }}>⚠ {iss}</span>
          ))}
          {item.suggestions?.map((sug, i) => (
            <span key={i} style={{ ...bgSuggest, whiteSpace: 'normal', display: 'block', marginRight: 0 }}>💡 {sug}</span>
          ))}
        </div>
      ) : (
        <span style={{ fontSize: 11, background: 'rgba(29,158,117,0.1)', color: '#085041', padding: '2px 8px', borderRadius: 6, display: 'inline-block' }}>✓ no issues</span>
      )}
    </div>
  );
}

export default function AiReviewResult({ data }) {
  // Parse if string
  let parsed = data;
  if (typeof data === 'string') {
    try { parsed = JSON.parse(data); } catch { /* not JSON, show as text */ }
  }

  // If not a structured review object, fall back to plain text
  if (!parsed || typeof parsed !== 'object' || !parsed.agent_results) {
    return (
      <pre style={{ background: 'var(--bg-2)', padding: 16, borderRadius: 8, fontSize: 12, color: 'var(--text-1)', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  const avg = Math.round(
    parsed.agent_results.reduce((sum, r) => sum + r.score, 0) / parsed.agent_results.length
  );
  const scoreColor = avg >= 95 ? '#1D9E75' : avg >= 85 ? '#378ADD' : avg >= 70 ? '#EF9F27' : '#E24B4A';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Overall score banner */}
      <div style={{
        background: 'var(--bg-2)',
        borderRadius: 12,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall score</div>
          <div style={{ fontSize: 38, fontWeight: 600, color: scoreColor, lineHeight: 1 }}>{avg}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>out of 100</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{
              fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 6,
              background: 'rgba(83,74,183,0.12)', color: '#3C3489',
            }}>
              {parsed.language || 'code'}
            </span>
            {parsed.duration_ms && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>
                ⏱ {(parsed.duration_ms / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          <div style={{ height: 6, background: 'var(--bg-3, #ddd)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${avg}%`, background: scoreColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      </div>

      {/* Criteria grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {parsed.agent_results.map(item => (
          <CriteriaCard key={item.criteria} item={item} />
        ))}
      </div>
    </div>
  );
}
