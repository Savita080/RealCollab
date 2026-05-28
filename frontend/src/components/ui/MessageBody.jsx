// components/ui/MessageBody.jsx — minimal markdown-ish renderer for chat
// Supports: ```lang fenced code blocks, `inline code`, bare-URL autolinks,
// preserved newlines. Intentionally tiny — not a real markdown parser.
import { highlightCode } from '../../lib/prismLanguages';
import '../../styles/prism-theme.css';

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

// Split content into a sequence of text/code segments by fenced ``` blocks.
function splitFences(text) {
  const out = [];
  const re = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', value: text.slice(last, m.index) });
    out.push({ type: 'code', lang: m[1] || '', value: m[2].replace(/\n$/, '') });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}

// Render a text run with `inline code` + URL autolinks. Returns array of nodes.
function renderInline(text, keyPrefix) {
  const out = [];
  // First split by inline-code spans
  const parts = text.split(/(`[^`\n]+`)/);
  parts.forEach((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      out.push(
        <code key={`${keyPrefix}-c-${i}`} className="rc-inlinecode">
          {part.slice(1, -1)}
        </code>
      );
      return;
    }
    // Autolink URLs in this plain-text run
    const segs = part.split(URL_RE);
    segs.forEach((seg, j) => {
      if (URL_RE.test(seg)) {
        URL_RE.lastIndex = 0;
        out.push(
          <a
            key={`${keyPrefix}-l-${i}-${j}`}
            href={seg}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent, #6366f1)', textDecoration: 'underline', wordBreak: 'break-word' }}
          >
            {seg}
          </a>
        );
      } else if (seg) {
        out.push(<span key={`${keyPrefix}-t-${i}-${j}`}>{seg}</span>);
      }
      URL_RE.lastIndex = 0;
    });
  });
  return out;
}

export default function MessageBody({ text }) {
  if (!text) return null;
  const segments = splitFences(text);

  return (
    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {segments.map((seg, i) => {
        if (seg.type === 'code') {
          const html = highlightCode(seg.value, seg.lang);
          return (
            <pre
              key={`pre-${i}`}
              className="rc-codeblock"
            >
              {seg.lang && <div className="rc-codeblock-lang">{seg.lang}</div>}
              <code dangerouslySetInnerHTML={{ __html: html }} />
            </pre>
          );
        }
        // Render inline pieces
        const lines = seg.value.split('\n');
        return lines.map((line, j) => (
          <span key={`tx-${i}-${j}`}>
            {renderInline(line, `${i}-${j}`)}
            {j < lines.length - 1 && '\n'}
          </span>
        ));
      })}
    </span>
  );
}
