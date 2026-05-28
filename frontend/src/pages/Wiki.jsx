// pages/Wiki.jsx
// ─── What's new vs old Wiki.jsx ──────────────────────────────────────────────
//  1. Folder tree in sidebar (create / rename / delete folders, move pages)
//  2. prevPage / nextPage UI  – assign prerequisite + suggested-next reads
//  3. @-mention picker  – type "@" in the editor → pick a page → inserts a link
//  4. Section-link modal – select text → right-click / toolbar → link to a
//     heading anchor inside another page
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useRef, useCallback } from 'react';
import { useWorkspace } from '../store/workspace';
import { wiki as wikiApi } from '../lib/api';
import { useUI } from '../store/ui';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import WikiEditor from '../components/wiki/WikiEditor';
import WikiHistoryModal from '../components/wiki/WikiHistoryModal';
import s from '../styles/modules/Wiki.module.css';

// ─── tiny icon helpers (inline SVG so no extra dep) ──────────────────────────
const FolderIcon = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    {open
      ? <path d="M1 4h5l1.5-2H15v10H1V4z" fill="var(--accent)" fillOpacity=".7" stroke="var(--accent)" strokeWidth="1.2" strokeLinejoin="round" />
      : <path d="M1 4h5l1.5-2H15v10H1V4z" fill="none" stroke="var(--text-3)" strokeWidth="1.2" strokeLinejoin="round" />}
  </svg>
);
const FileIcon = () => (
  <svg width="12" height="14" viewBox="0 0 12 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M1 1h7l3 3v9H1V1z" fill="none" stroke="var(--text-3)" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M8 1v3h3" stroke="var(--text-3)" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const ChevronIcon = ({ open }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}>
    <path d="M3 2l4 3-4 3" stroke="var(--text-3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Extract headings (lines starting with # / ## / ###) from markdown/tiptap text */
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

// ─── WikiFolderTree ───────────────────────────────────────────────────────────

function WikiFolderTree({
  folders, pages, activePage,
  onPageClick, onDeletePage,
  onCreateFolder, onRenameFolder, onDeleteFolder,
  onMovePage,       // (pageId, folderId | null) => void
  onMoveFolder,     // (folderId, parentId | null) => void  [future]
}) {
  const [openFolders, setOpenFolders] = useState({});
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renamingVal, setRenamingVal] = useState('');
  const [newFolderParent, setNewFolderParent] = useState(undefined); // undefined = hidden
  const [newFolderName, setNewFolderName] = useState('');
  // drag-and-drop state
  const dragging = useRef(null); // { type: 'page'|'folder', id }

  const toggle = (id) => setOpenFolders(s => ({ ...s, [id]: !s[id] }));

  const rootPages = pages.filter(p => !p.folder);
  const folderPages = (folderId) => pages.filter(p => String(p.folder) === String(folderId));
  const rootFolders = folders.filter(f => !f.parent);
  const childFolders = (parentId) => folders.filter(f => String(f.parent) === String(parentId));

  const handleDrop = (e, targetFolderId) => {
    e.preventDefault();
    if (!dragging.current) return;
    const { type, id } = dragging.current;
    if (type === 'page') onMovePage(id, targetFolderId);
    dragging.current = null;
  };

  const renderPage = (pg) => (
    <div
      key={pg._id}
      className={`${s.pageRow} ${activePage?._id === pg._id ? s.activeRow : ''}`}
      draggable
      onDragStart={() => { dragging.current = { type: 'page', id: pg._id }; }}
    >
      <button className={`${s.pageItem} ${activePage?._id === pg._id ? s.active : ''}`} onClick={() => onPageClick(pg)}>
        <FileIcon /> <span className={s.pageLabel}>{pg.title}</span>
      </button>
      <button className={s.deletePageBtn} onClick={() => onDeletePage(pg)} title="Delete page">✕</button>
    </div>
  );

  const renderFolder = (folder, depth = 0) => {
    const isOpen = openFolders[folder._id] ?? true;
    const children = childFolders(folder._id);
    const fps = folderPages(folder._id);
    const isRenaming = renamingFolder === folder._id;

    return (
      <div key={folder._id} style={{ marginLeft: depth * 12 }}>
        <div
          className={s.folderRow}
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, folder._id)}
        >
          <button className={s.folderToggle} onClick={() => toggle(folder._id)}>
            <ChevronIcon open={isOpen} />
            <FolderIcon open={isOpen} />
            {isRenaming ? (
              <form onSubmit={e => { e.preventDefault(); onRenameFolder(folder._id, renamingVal); setRenamingFolder(null); }} style={{ display: 'flex', gap: 4 }}>
                <input
                  className={s.folderRenameInput}
                  value={renamingVal}
                  onChange={e => setRenamingVal(e.target.value)}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
                <button type="submit" className={s.miniBtn}>✓</button>
                <button type="button" className={s.miniBtn} onClick={e => { e.stopPropagation(); setRenamingFolder(null); }}>✕</button>
              </form>
            ) : (
              <span className={s.folderLabel}>{folder.name}</span>
            )}
          </button>
          <div className={s.folderActions}>
            {/* add sub-folder (only if root level) */}
            {!folder.parent && (
              <button className={s.miniIconBtn} title="Add sub-folder" onClick={() => { setNewFolderParent(folder._id); setNewFolderName(''); }}>+</button>
            )}
            <button className={s.miniIconBtn} title="Rename folder" onClick={() => { setRenamingFolder(folder._id); setRenamingVal(folder.name); }}>✏</button>
            <button className={s.miniIconBtn} title="Delete folder" onClick={() => onDeleteFolder(folder._id)}>✕</button>
          </div>
        </div>

        {/* inline new-sub-folder form */}
        {newFolderParent === folder._id && (
          <form className={s.newFolderForm} onSubmit={e => { e.preventDefault(); onCreateFolder(newFolderName, folder._id); setNewFolderParent(undefined); }} style={{ marginLeft: 20 }}>
            <input className={s.folderRenameInput} value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Sub-folder name" autoFocus />
            <button type="submit" className={s.miniBtn}>✓</button>
            <button type="button" className={s.miniBtn} onClick={() => setNewFolderParent(undefined)}>✕</button>
          </form>
        )}

        {isOpen && (
          <div style={{ marginLeft: 16 }}>
            {children.map(cf => renderFolder(cf, depth + 1))}
            {fps.map(renderPage)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={s.treeRoot}>
      {/* Root-level folders */}
      {rootFolders.map(f => renderFolder(f))}

      {/* Root-level pages (no folder) */}
      <div
        className={s.rootDropZone}
        onDragOver={e => e.preventDefault()}
        onDrop={e => handleDrop(e, null)}
      >
        {rootPages.map(renderPage)}
      </div>

      {/* Create new root folder */}
      {newFolderParent === null ? (
        <form className={s.newFolderForm} onSubmit={e => { e.preventDefault(); onCreateFolder(newFolderName, null); setNewFolderParent(undefined); }}>
          <input className={s.folderRenameInput} value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name" autoFocus />
          <button type="submit" className={s.miniBtn}>✓</button>
          <button type="button" className={s.miniBtn} onClick={() => setNewFolderParent(undefined)}>✕</button>
        </form>
      ) : (
        <button className={s.newFolderBtn} onClick={() => { setNewFolderParent(null); setNewFolderName(''); }}>
          + New folder
        </button>
      )}
    </div>
  );
}

// ─── PageLinkPicker ───────────────────────────────────────────────────────────
// Floating dropdown triggered when user types "@" in the editor.
// Parent (WikiEditor wrapper layer) detects the "@" keystroke, shows this,
// and on selection calls onSelect(page).

export function PageLinkPicker({ pages, query, position, onSelect, onClose }) {
  const filtered = pages.filter(p =>
    p.title.toLowerCase().includes((query || '').toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!filtered.length) return null;

  return (
    <div
      className={s.pageLinkPicker}
      style={position ? { top: position.top, left: position.left } : {}}
    >
      <div className={s.pickerHeader}>Link to page</div>
      {filtered.map(pg => (
        <button key={pg._id} className={s.pickerItem} onClick={() => onSelect(pg)}>
          <FileIcon /> <span>{pg.title}</span>
        </button>
      ))}
    </div>
  );
}

// ─── SectionLinkModal ─────────────────────────────────────────────────────────
// Opened when user selects text and wants to link it to a heading in another page.

function SectionLinkModal({ open, onClose, pages, currentPageId, onInsert }) {
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

// ─── PrevNextModal ────────────────────────────────────────────────────────────
// Let user assign prevPage / nextPage on the active wiki page.

function PrevNextModal({ open, onClose, pages, activePage, onSave }) {
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

// ─── PrevNextBar ──────────────────────────────────────────────────────────────

function PrevNextBar({ activePage, pages, onNavigate }) {
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

// ─── Main Wiki component ──────────────────────────────────────────────────────

export default function Wiki() {
  const { current: ws, currentProject } = useWorkspace();
  const { toast } = useUI();

  // Pages & active state
  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [activeContent, setActiveContent] = useState('');

  // Folders
  const [folders, setFolders] = useState([]);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [historyModal, setHistoryModal] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [commitModal, setCommitModal] = useState(false);
  const [pendingContent, setPendingContent] = useState(null);
  const [commitMsg, setCommitMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Rename title
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [newTitleEdit, setNewTitleEdit] = useState('');

  // Prev/Next modal
  const [prevNextModal, setPrevNextModal] = useState(false);

  // Section-link modal
  const [sectionLinkModal, setSectionLinkModal] = useState(false);

  // @-mention picker state (controlled from outside WikiEditor via a ref/callback)
  const [mentionState, setMentionState] = useState(null); // { query, position } | null
  const mentionInsertRef = useRef(null); // callback to insert the chosen link into editor

  // ── data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentProject || !ws) return;

    // Load pages
    wikiApi.pages(ws._id, currentProject._id).then(({ data }) => {
      const list = data.pages ?? data;
      setPages(list);
      if (list.length) loadPage(list[0]);
    });

    // Load folders
    loadFolders();
  }, [currentProject?._id, ws?._id]);

  const loadFolders = async () => {
    try {
      const { data } = await wikiApi.folders(ws._id, currentProject._id);
      setFolders(data.folders ?? data);
    } catch { /* folders endpoint may not exist yet */ }
  };

  const loadPage = async (pg) => {
    setActivePage(pg);
    try {
      const { data } = await wikiApi.get(ws._id, currentProject._id, pg._id);
      const full = data.page ?? data;
      setActivePage(full); // includes populated prevPage / nextPage
      setActiveContent(full.content || '');
    } catch {
      setActiveContent(pg.content || '');
    }
  };

  // ── page CRUD ────────────────────────────────────────────────────────────────

  const createPage = async (e) => {
    e.preventDefault();
    try {
      const { data } = await wikiApi.create(ws._id, currentProject._id, { title: newTitle, content: '' });
      const page = data.page ?? data;
      setPages(p => [page, ...p]);
      setActivePage(page);
      setActiveContent('');
      setCreateModal(false);
      setNewTitle('');
      toast('Page created', 'success');
    } catch { toast('Failed to create page', 'error'); }
  };

  const requestSave = (content) => {
    if (content === activeContent) { toast('No changes to save', 'info'); return; }
    setPendingContent(content);
    setCommitMsg('');
    setCommitModal(true);
  };

  const savePage = async (content, commitMessage) => {
    if (commitMessage.length < 10) { toast('Commit message must be at least 10 characters', 'error'); return false; }
    setSaving(true);
    try {
      await wikiApi.update(ws._id, currentProject._id, activePage._id, { content, commitMessage });
      setActiveContent(content);
      setPages(p => p.map(pg => pg._id === activePage._id ? { ...pg, content } : pg));
      setCommitModal(false);
      setPendingContent(null);
      toast('Saved ✓', 'success');
      return true;
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to save', 'error');
      return false;
    } finally { setSaving(false); }
  };

  const handleCommitSave = async (e) => {
    e.preventDefault();
    if (pendingContent !== null) await savePage(pendingContent, commitMsg);
  };

  const deletePage = async (pg) => {
    if (!confirm(`Delete page "${pg.title}"?`)) return;
    try {
      await wikiApi.delete(ws._id, currentProject._id, pg._id);
      const remaining = pages.filter(p => p._id !== pg._id);
      setPages(remaining);
      if (activePage?._id === pg._id) {
        if (remaining.length) loadPage(remaining[0]);
        else { setActivePage(null); setActiveContent(''); }
      }
      toast('Page deleted', 'info');
    } catch { toast('Failed to delete page', 'error'); }
  };

  const handleRenameTitle = async (e) => {
    e.preventDefault();
    if (!newTitleEdit.trim() || !activePage) return;
    try {
      await wikiApi.update(ws._id, currentProject._id, activePage._id, { title: newTitleEdit.trim() });
      const updated = { ...activePage, title: newTitleEdit.trim() };
      setActivePage(updated);
      setPages(p => p.map(pg => pg._id === activePage._id ? updated : pg));
      setRenamingTitle(false);
      toast('Page renamed', 'success');
    } catch { toast('Failed to rename page', 'error'); }
  };

  // ── history ──────────────────────────────────────────────────────────────────

  const openHistory = async () => {
    if (!activePage) return;
    setHistoryModal(true);
    setLoadingVersions(true);
    try {
      const { data } = await wikiApi.versions(ws._id, currentProject._id, activePage._id);
      setVersions(data.versions ?? data);
    } catch { toast('Failed to load history', 'error'); }
    finally { setLoadingVersions(false); }
  };

  const restoreVersion = async (version, commitMessage) => {
    const ok = await savePage(version.content || '', commitMessage);
    if (ok) { setHistoryModal(false); toast('Version restored', 'success'); }
  };

  // ── folder operations ────────────────────────────────────────────────────────

  const createFolder = async (name, parentId) => {
    if (!name.trim()) return;
    try {
      const { data } = await wikiApi.createFolder(ws._id, currentProject._id, { name, parentId: parentId || null });
      setFolders(f => [...f, data.folder ?? data]);
      toast('Folder created', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to create folder', 'error');
    }
  };

  const renameFolder = async (folderId, name) => {
    try {
      const { data } = await wikiApi.updateFolder(ws._id, currentProject._id, folderId, { name });
      setFolders(f => f.map(ff => ff._id === folderId ? (data.folder ?? data) : ff));
      toast('Folder renamed', 'success');
    } catch { toast('Failed to rename folder', 'error'); }
  };

  const deleteFolder = async (folderId) => {
    if (!confirm('Delete folder? Pages inside will be moved to root.')) return;
    try {
      await wikiApi.deleteFolder(ws._id, currentProject._id, folderId);
      setFolders(f => f.filter(ff => ff._id !== folderId));
      // Move affected pages to root in local state
      setPages(p => p.map(pg => String(pg.folder) === String(folderId) ? { ...pg, folder: null } : pg));
      toast('Folder deleted', 'info');
    } catch { toast('Failed to delete folder', 'error'); }
  };

  const movePage = async (pageId, folderId) => {
    try {
      await wikiApi.movePage(ws._id, currentProject._id, pageId, { folderId: folderId || null });
      setPages(p => p.map(pg => pg._id === pageId ? { ...pg, folder: folderId || null } : pg));
    } catch { toast('Failed to move page', 'error'); }
  };

  // ── prev/next assignment ─────────────────────────────────────────────────────

  const savePrevNext = async (prevId, nextId) => {
    try {
      await wikiApi.update(ws._id, currentProject._id, activePage._id, {
        prevPage: prevId || null,
        nextPage: nextId || null,
        // No commitMessage needed — backend allows title/nav updates without one
      });
      const updated = {
        ...activePage,
        prevPage: prevId ? pages.find(p => p._id === prevId) || prevId : null,
        nextPage: nextId ? pages.find(p => p._id === nextId) || nextId : null,
      };
      setActivePage(updated);
      setPages(p => p.map(pg => pg._id === activePage._id ? updated : pg));
      toast('Navigation links saved', 'success');
    } catch { toast('Failed to save navigation links', 'error'); }
  };

  // ── section link insertion ───────────────────────────────────────────────────
  // WikiEditor exposes an `insertLink(href, text)` imperative handle.
  // We store a ref to that and call it after SectionLinkModal resolves.

  const editorRef = useRef(null);

  const handleSectionLinkInsert = ({ pageId, anchor, pageTitle }) => {
    const href = `/wiki/${pageId}${anchor}`;
    // editorRef.current is the WikiEditor instance that exposes insertLink
    if (editorRef.current?.insertLink) {
      editorRef.current.insertLink(href, pageTitle + (anchor ? ` › ${anchor.slice(1)}` : ''));
    }
  };

  // ── @-mention wiring ─────────────────────────────────────────────────────────
  // WikiEditor calls these via props when "@" is typed / dismissed.

  const onMentionOpen = useCallback((query, position, insertFn) => {
    setMentionState({ query, position });
    mentionInsertRef.current = insertFn;
  }, []);

  const onMentionQuery = useCallback((query) => {
    setMentionState(s => s ? { ...s, query } : null);
  }, []);

  const onMentionClose = useCallback(() => {
    setMentionState(null);
    mentionInsertRef.current = null;
  }, []);

  const handleMentionSelect = (page) => {
    if (mentionInsertRef.current) {
      mentionInsertRef.current(`[${page.title}](/wiki/${page._id})`);
    }
    setMentionState(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (!currentProject) return <div className={s.empty}>Select a project to view the wiki.</div>;

  return (
    <div className={s.page}>

      {/* ── Sidebar ── */}
      <aside className={s.sidebar}>
        <div className={s.sideHeader}>
          <span className={s.sideTitle}>Pages</span>
          <button className={s.addBtn} onClick={() => setCreateModal(true)} title="New page">+</button>
        </div>

        <WikiFolderTree
          folders={folders}
          pages={pages}
          activePage={activePage}
          onPageClick={loadPage}
          onDeletePage={deletePage}
          onCreateFolder={createFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          onMovePage={movePage}
        />
      </aside>

      {/* ── Editor area ── */}
      <main className={s.editor} style={{ position: 'relative' }}>
        {activePage ? (
          <>
            {/* toolbar */}
            <div className={s.editorToolbar}>
              {renamingTitle ? (
                <form onSubmit={handleRenameTitle} className={s.renameForm}>
                  <input className={s.renameTitleInput} value={newTitleEdit} onChange={e => setNewTitleEdit(e.target.value)} autoFocus required />
                  <Button type="submit" variant="primary" size="sm">Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setRenamingTitle(false)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <h2 className={s.pageTitle}>{activePage.title}</h2>
                  <button className={s.renameBtn} onClick={() => { setNewTitleEdit(activePage.title); setRenamingTitle(true); }} title="Rename page">✏</button>
                </>
              )}

              <div className={s.toolbarRight}>
                {/* Prev/Next assignment button */}
                <button className={s.navLinksBtn} onClick={() => setPrevNextModal(true)} title="Set prev / next pages">
                  ⇄ Nav links
                </button>
                {/* Section link button */}
                <button className={s.sectionLinkBtn} onClick={() => setSectionLinkModal(true)} title="Insert link to page section">
                  🔗 Section link
                </button>
                <button className={s.historyBtn} onClick={openHistory} title="Version history">⏱ History</button>
              </div>
            </div>

            {/* Prev/Next navigation bar */}
            <PrevNextBar activePage={activePage} pages={pages} onNavigate={loadPage} />

            {/* Editor */}
            <WikiEditor
              ref={editorRef}
              page={{ ...activePage, content: activeContent }}
              onSave={requestSave}
              // @-mention props — pass these only if WikiEditor supports them
              onMentionOpen={onMentionOpen}
              onMentionQuery={onMentionQuery}
              onMentionClose={onMentionClose}
              // Internal page link click handler
              onInternalLinkClick={(pageId) => {
                const target = pages.find(p => p._id === pageId);
                if (target) loadPage(target);
              }}
            />

            {/* @-mention picker (floating) */}
            {mentionState && (
              <PageLinkPicker
                pages={pages}
                query={mentionState.query}
                position={mentionState.position}
                onSelect={handleMentionSelect}
                onClose={onMentionClose}
              />
            )}
          </>
        ) : (
          <div className={s.empty}>Select a page or create one to start writing.</div>
        )}
      </main>

      {/* ── Modals ── */}

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="New Wiki Page" size="sm">
        <form onSubmit={createPage} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Page title" placeholder="Getting Started" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
          <Button type="submit" variant="primary" size="md">Create Page</Button>
        </form>
      </Modal>

      <Modal open={commitModal} onClose={() => setCommitModal(false)} title="Save with Commit Message" size="sm">
        <form onSubmit={handleCommitSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
            Describe what changed in this save (min. 10 characters — saved to version history).
          </p>
          <Input label="Commit message" placeholder="Fixed typo in setup section" value={commitMsg} onChange={e => setCommitMsg(e.target.value)} required />
          <Button type="submit" variant="primary" size="md" loading={saving} disabled={commitMsg.length < 10}>Save Page</Button>
        </form>
      </Modal>

      <WikiHistoryModal
        open={historyModal}
        onClose={() => setHistoryModal(false)}
        pageTitle={activePage?.title}
        versions={versions}
        loading={loadingVersions}
        saving={saving}
        onRestore={restoreVersion}
      />

      <PrevNextModal
        open={prevNextModal}
        onClose={() => setPrevNextModal(false)}
        pages={pages}
        activePage={activePage}
        onSave={savePrevNext}
      />

      <SectionLinkModal
        open={sectionLinkModal}
        onClose={() => setSectionLinkModal(false)}
        pages={pages}
        currentPageId={activePage?._id}
        onInsert={handleSectionLinkInsert}
      />
    </div>
  );
}