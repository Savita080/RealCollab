// components/snippets/SnippetCodeEditor.jsx — editable code with Prism highlighting
import Editor from 'react-simple-code-editor';
import { highlightCode } from '../../lib/prismLanguages';
import '../../styles/prism-theme.css';
import s from '../../styles/modules/SnippetCodeEditor.module.css';

export default function SnippetCodeEditor({
  value = '',
  onChange,
  language = 'javascript',
  placeholder = 'Paste your code here…',
  minHeight = 200,
  className = '',
}) {
  return (
    <div className={`${s.wrap} ${className}`.trim()} style={{ minHeight }}>
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={(code) => highlightCode(code, language)}
        placeholder={placeholder}
        padding={14}
        tabSize={2}
        insertSpaces
        className={s.editor}
        textareaClassName={s.textarea}
        preClassName={s.pre}
      />
    </div>
  );
}
