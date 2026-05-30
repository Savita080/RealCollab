import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import s from '../../styles/modules/Wiki.module.css';

export function PrevNextModal({ open, onClose, pages, activePage, onSave }) {
  const [prevId, setPrevId] = useState('');
  const [nextId, setNextId] = useState('');

  useEffect(() => {
    if (activePage) {
      setPrevId(activePage.prevPage?._id || activePage.prevPage || '');
      setNextId(activePage.nextPage?._id || activePage.nextPage || '');
    }
  }, [activePage?._id]);

  const others = pages.filter(p => p._id !== activePage?._id);

  return (
    <Modal open={open} onClose={onClose} title="Page navigation links" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
          Set prerequisite and follow-up pages. These appear as Prev / Next buttons at the top of the page.
        </p>
        <div>
          <label className={s.formLabel}>← Prerequisite (Prev)</label>
          <select className={s.select} value={prevId} onChange={e => setPrevId(e.target.value)}>
            <option value="">— none —</option>
            {others.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
        </div>
        <div>
          <label className={s.formLabel}>→ Suggested next (Next)</label>
          <select className={s.select} value={nextId} onChange={e => setNextId(e.target.value)}>
            <option value="">— none —</option>
            {others.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
        </div>
        <Button variant="primary" size="md" onClick={() => { onSave(prevId || null, nextId || null); onClose(); }}>
          Save
        </Button>
      </div>
    </Modal>
  );
}

export function PrevNextBar({ activePage, pages, onNavigate }) {
  const prevPage = activePage?.prevPage
    ? (typeof activePage.prevPage === 'object'
        ? activePage.prevPage
        : pages.find(p => p._id === activePage.prevPage))
    : null;
  const nextPage = activePage?.nextPage
    ? (typeof activePage.nextPage === 'object'
        ? activePage.nextPage
        : pages.find(p => p._id === activePage.nextPage))
    : null;

  if (!prevPage && !nextPage) return null;

  return (
    <div className={s.prevNextBar}>
      {prevPage ? (
        <button className={s.prevBtn} onClick={() => onNavigate(prevPage)}>
          <span className={s.navArrow}>←</span>
          <span className={s.navMeta}>
            <span className={s.navLabel}>Prerequisite</span>
            <span className={s.navTitle}>{prevPage.title}</span>
          </span>
        </button>
      ) : <span />}
      {nextPage ? (
        <button className={s.nextBtn} onClick={() => onNavigate(nextPage)}>
          <span className={s.navMeta} style={{ textAlign: 'right' }}>
            <span className={s.navLabel}>Up next</span>
            <span className={s.navTitle}>{nextPage.title}</span>
          </span>
          <span className={s.navArrow}>→</span>
        </button>
      ) : <span />}
    </div>
  );
}
