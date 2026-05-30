import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import s from '../../styles/modules/Wiki.module.css';

function extractHeadings(content = '') {
  const lines = content.split('\n');
  return lines
    .filter(l => /^#{1,3} /.test(l))
    .map(l => {
      const text = l.replace(/^#+\s+/, '');
      const anchor = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      return { text, anchor };
    });
}

export default function SectionLinkModal({ open, onClose, pages, currentPageId, onInsert }) {
  const [targetPageId, setTargetPageId] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [headings, setHeadings] = useState([]);

  const targetPage = pages.find(p => p._id === targetPageId);

  useEffect(() => {
    if (targetPage) {
      setHeadings(extractHeadings(targetPage.content || ''));
      setTargetSection('');
    }
  }, [targetPageId]);

  const handleInsert = () => {
    if (!targetPageId) return;
    const anchor = targetSection ? `#${targetSection}` : '';
    // The href is an internal wiki link: /wiki/{pageId}{#anchor}
    onInsert({ pageId: targetPageId, anchor, pageTitle: targetPage?.title || '' });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Link to page section" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className={s.formLabel}>Target page</label>
          <select
            className={s.select}
            value={targetPageId}
            onChange={e => setTargetPageId(e.target.value)}
          >
            <option value="">— pick a page —</option>
            {pages.filter(p => p._id !== currentPageId).map(p => (
              <option key={p._id} value={p._id}>{p.title}</option>
            ))}
          </select>
        </div>
        {headings.length > 0 && (
          <div>
            <label className={s.formLabel}>Section (optional)</label>
            <select className={s.select} value={targetSection} onChange={e => setTargetSection(e.target.value)}>
              <option value="">— top of page —</option>
              {headings.map(h => (
                <option key={h.anchor} value={h.anchor}>{h.text}</option>
              ))}
            </select>
          </div>
        )}
        {targetPageId && headings.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
            No headings found in that page — will link to the top.
          </p>
        )}
        <Button variant="primary" size="md" onClick={handleInsert} disabled={!targetPageId}>
          Insert link
        </Button>
      </div>
    </Modal>
  );
}
