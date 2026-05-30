// components/wiki/WikiEditor.jsx
import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
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

const WikiEditor = forwardRef(({ page, onSave, onMentionOpen, onMentionQuery, onMentionClose, onInternalLinkClick }, ref) => {
  const editorRef = useRef(null);
  const [saving, setSaving] = useState(false);
  
  const isMentionOpenRef = useRef(false);
  const mentionNodeRef = useRef(null);
  const mentionQueryRef = useRef(null);
  const mentionOffsetRef = useRef(0);

  // Update content when page changes or loads asynchronously
  useEffect(() => {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      const newHtml = page.content || '';
      // Only update if the content actually differs (avoids cursor jump on save and wiping text on re-render)
      if (currentHtml !== newHtml) {
        editorRef.current.innerHTML = newHtml;
      }
    }
  }, [page._id, page.content]);

  useImperativeHandle(ref, () => ({
    insertLink(href, text) {
      editorRef.current?.focus();
      const a = document.createElement('a');
      a.href = href;
      a.className = s.wikiLink;
      a.textContent = text;
      
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(a);
        
        const space = document.createTextNode('\u00A0');
        a.after(space);
        
        range.setStartAfter(space);
        range.setEndAfter(space);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }));

  const exec = (cmd, value) => {
    document.execCommand(cmd, false, value || null);
    editorRef.current?.focus();
  };

  const insertCode = () => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const code = document.createElement('pre');
    code.className = s.codeBlock;
    code.textContent = sel.toString() || '// code here';
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(code);
    
    const space = document.createElement('p');
    space.innerHTML = '<br>';
    code.after(space);
    
    range.setStart(space, 0);
    range.setEnd(space, 0);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(editorRef.current.innerHTML);
    setSaving(false);
  };

  const closeMention = () => {
    if (isMentionOpenRef.current) {
      isMentionOpenRef.current = false;
      onMentionClose?.();
    }
  };

  const handleInput = () => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.slice(0, range.startOffset);
      const match = text.match(/(?:^|\s)@([^/\s]*)$/);
      
      if (match) {
        const query = match[1];
        const atIndex = match.index + (text[match.index] === '@' ? 0 : 1);
        
        mentionNodeRef.current = node;
        mentionOffsetRef.current = atIndex;
        mentionQueryRef.current = query;
        
        if (!isMentionOpenRef.current) {
          isMentionOpenRef.current = true;
          
          const tempRange = range.cloneRange();
          tempRange.setStart(node, atIndex);
          tempRange.collapse(true);
          const rect = tempRange.getBoundingClientRect();
          
          const editorContainer = editorRef.current?.closest('main') || editorRef.current;
          let top = rect.bottom;
          let left = rect.left;
          
          if (editorContainer) {
            const containerRect = editorContainer.getBoundingClientRect();
            top = rect.bottom - containerRect.top + editorContainer.scrollTop + 4;
            left = rect.left - containerRect.left + editorContainer.scrollLeft;
          }
          
          onMentionOpen?.(query, { top, left }, (mdString) => {
            const currentSel = window.getSelection();
            const replaceRange = document.createRange();
            try {
              const nodeToReplace = mentionNodeRef.current;
              const start = mentionOffsetRef.current;
              const end = start + 1 + (mentionQueryRef.current || '').length;
              replaceRange.setStart(nodeToReplace, start);
              replaceRange.setEnd(nodeToReplace, end);
              currentSel.removeAllRanges();
              currentSel.addRange(replaceRange);
            } catch (e) {
               // fallback if text node changed
            }
            
            const aMatch = mdString.match(/\[(.*?)\]\((.*?)\)/);
            if (aMatch) {
              const a = document.createElement('a');
              a.href = aMatch[2];
              a.className = s.wikiLink;
              a.textContent = aMatch[1];
              
              if (currentSel.rangeCount > 0) {
                const rng = currentSel.getRangeAt(0);
                rng.deleteContents();
                rng.insertNode(a);
                const space = document.createTextNode('\u00A0');
                a.after(space);
                rng.setStartAfter(space);
                rng.setEndAfter(space);
                currentSel.removeAllRanges();
                currentSel.addRange(rng);
              }
            } else {
              document.execCommand('insertText', false, mdString);
            }
            isMentionOpenRef.current = false;
          });
        } else {
          onMentionQuery?.(query);
        }
        return;
      }
    }
    closeMention();
  };

  const handleKeyDown = (e) => {
    if (isMentionOpenRef.current && e.key === 'Escape') {
      closeMention();
    }
  };

  const handleClick = (e) => {
    if (e.target.tagName === 'A') {
      const href = e.target.getAttribute('href');
      if (href && href.startsWith('/wiki/')) {
        e.preventDefault();
        const parts = href.split('#');
        const pageId = parts[0].replace('/wiki/', '');
        onInternalLinkClick?.(pageId);
      }
    }
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
        placeholder="Start writing..."
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
      />
    </div>
  );
});

export default WikiEditor;
