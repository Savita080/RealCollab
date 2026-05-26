// components/wiki/WikiEditor.jsx
import { useState, useRef } from 'react';
import Button from '../ui/Button';
import s from '../../styles/modules/WikiEditor.module.css';

const TOOLBAR = [
  { cmd: 'bold',          label: 'B',   style: { fontWeight: 700 } },
  { cmd: 'italic',        label: 'I',   style: { fontStyle: 'italic' } },
  { cmd: 'insertUnorderedList', label: '• List' },
  { cmd: 'insertOrderedList',   label: '1. List' },
  { cmd: 'formatBlock',   label: 'H2', value: 'h2' },
  { cmd: 'formatBlock',   label: 'H3', value: 'h3' },
];

export default function WikiEditor({ page, onSave }) {
  const editorRef = useRef(null);
  const [saving, setSaving] = useState(false);

  const exec = (cmd, value) => {
    document.execCommand(cmd, false, value || null);
    editorRef.current?.focus();
  };

  const insertCode = () => {
    const sel = window.getSelection();
    const code = document.createElement('pre');
    code.className = s.codeBlock;
    code.contentEditable = true;
    code.textContent = sel.toString() || '// code here';
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(code);
  };

  const handleSave = async () => {
    const commitMessage = window.prompt('Save note (describe your changes):', 'Content update') || 'Content update';
    setSaving(true);
    await onSave(editorRef.current.innerHTML, commitMessage);
    setSaving(false);
  };

  return (
    <div className={s.wrap}>
      <div className={s.topBar}>
        <h1 className={s.pageTitle}>{page.title}</h1>
        <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>Save</Button>
      </div>

      <div className={s.toolbar}>
        {TOOLBAR.map(t => (
          <button key={t.label} className={s.toolBtn} onMouseDown={e => { e.preventDefault(); exec(t.cmd, t.value); }}
            style={t.style}>{t.label}</button>
        ))}
        <button className={s.toolBtn} onMouseDown={e => { e.preventDefault(); insertCode(); }}>{'</>'}</button>
      </div>

      <div
        ref={editorRef}
        className={s.content}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: page.content || '' }}
        placeholder="Start writing..."
      />
    </div>
  );
}
