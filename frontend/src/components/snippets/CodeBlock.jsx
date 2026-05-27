// components/snippets/CodeBlock.jsx — read-only Prism-highlighted code
import { highlightCode, toPrismLanguage } from '../../lib/prismLanguages';
import '../../styles/prism-theme.css';
import s from '../../styles/modules/CodeBlock.module.css';

export default function CodeBlock({ code = '', language = 'javascript', className = '', maxHeight }) {
  const prismLang = toPrismLanguage(language);
  const html = highlightCode(code, language);

  return (
    <pre
      className={`${s.pre} ${className}`.trim()}
      style={maxHeight != null ? { maxHeight } : undefined}
    >
      <code
        className={`language-${prismLang}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </pre>
  );
}
