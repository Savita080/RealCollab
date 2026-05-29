// pages/workspace/project/ProjectWiki.jsx — Adapted from Wiki.jsx
import { useEffect, useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { wiki as wikiApi } from '../../../lib/api';
import { useUI } from '../../../store/ui';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import WikiEditor from '../../../components/wiki/WikiEditor';
import RoleGate from '../../../components/common/RoleGate';
import { fmtRelative } from '../../../lib/utils';
import s from '../../../styles/modules/Wiki.module.css';

// ─── tiny icon helpers ────────────────────────────────────────────────────────
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

// ─── WikiFolderTree ───────────────────────────────────────────────────────────
function WikiFolderTree({
  folders, pages, activePage,
  onPageClick, onDeletePage,
  onCreateFolder, onRenameFolder, onDeleteFolder,
  onMovePage,
  canEdit,
}) {
  const [openFolders, setOpenFolders] = useState({});
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renamingVal, setRenamingVal] = useState('');
  const [newFolderParent, setNewFolderParent] = useState(undefined); // undefined = hidden
  const [newFolderName, setNewFolderName] = useState('');
  // Track which folder is being hovered during a drag for visual feedback
  const [dragOverFolder, setDragOverFolder] = useState(null);
  // Track drag-enter nesting depth per folder to avoid flicker on child elements
  const dragCounters = useRef({});
  const draggingPageId = useRef(null);

  const toggle = (id) => setOpenFolders(prev => ({ ...prev, [id]: !prev[id] }));

  const rootPages = pages.filter(p => !p.folder);
  const folderPages = (folderId) => pages.filter(p => String(p.folder) === String(folderId));
  const rootFolders = folders.filter(f => !f.parent);
  const childFolders = (parentId) => folders.filter(f => String(f.parent) === String(parentId));

  // ── drag helpers ──────────────────────────────────────────────────────────

  const handleDragEnter = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    const key = folderId ?? '__root__';
    dragCounters.current[key] = (dragCounters.current[key] || 0) + 1;
    console.log('[Wiki DnD] dragEnter folder:', folderId, 'count:', dragCounters.current[key]);
    setDragOverFolder(folderId);
  };

  const handleDragLeave = (e, folderId) => {
    e.stopPropagation();
    const key = folderId ?? '__root__';
    dragCounters.current[key] = (dragCounters.current[key] || 1) - 1;
    console.log('[Wiki DnD] dragLeave folder:', folderId, 'count:', dragCounters.current[key]);
    if (dragCounters.current[key] <= 0) {
      dragCounters.current[key] = 0;
      setDragOverFolder(prev => prev === folderId ? null : prev);
    }
  };

  const handleDrop = (e, targetFolderId) => {
    e.preventDefault();
    e.stopPropagation();
    const fromRef = draggingPageId.current;
    const fromTransfer = e.dataTransfer.getData('pageId') || e.dataTransfer.getData('text/plain');
    const pageId = fromRef || fromTransfer;
    console.log('[Wiki DnD] DROP on folder:', targetFolderId, '| pageId from ref:', fromRef, '| from dataTransfer:', fromTransfer, '| using:', pageId);
    if (pageId) onMovePage(pageId, targetFolderId ?? null);
    draggingPageId.current = null;
    dragCounters.current = {};
    setDragOverFolder(null);
  };

  // ── renderers ─────────────────────────────────────────────────────────────

  const renderPage = (pg) => (
    <div
      key={pg._id}
      className={`${s.pageRow} ${activePage?._id === pg._id ? s.activeRow : ''}`}
      draggable="true"
      style={{
        cursor: 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitUserDrag: 'element',
        pointerEvents: 'auto',
        position: 'relative',
      }}
      onMouseDown={e => console.log('[Wiki DnD] mousedown on page row', pg.title)}
      onDragStart={(e) => {
        console.log('[Wiki DnD] dragstart fired for page:', pg._id, pg.title);
        e.dataTransfer.setData('text/plain', pg._id);
        e.dataTransfer.setData('pageId', pg._id);
        e.dataTransfer.effectAllowed = 'move';
        draggingPageId.current = pg._id;
      }}
      onDragEnd={(e) => {
        console.log('[Wiki DnD] dragend, dropEffect was:', e.dataTransfer.dropEffect);
        draggingPageId.current = null;
        dragCounters.current = {};
        setDragOverFolder(null);
      }}
      onClick={() => onPageClick(pg)}
    >
      <span
        className={`${s.pageItem} ${activePage?._id === pg._id ? s.active : ''}`}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <FileIcon /> <span className={s.pageLabel}>{pg.title}</span>
      </span>
      {canEdit && (
        <button
          className={s.deletePageBtn}
          onClick={(e) => { e.stopPropagation(); onDeletePage(pg); }}
          title="Delete page"
          draggable={false}
          style={{ pointerEvents: 'auto' }}
        >✕</button>
      )}
    </div>
  );

  const renderFolder = (folder, depth = 0) => {
    const isOpen = openFolders[folder._id] ?? true;
    const children = childFolders(folder._id);
    const fps = folderPages(folder._id);
    const isRenaming = renamingFolder === folder._id;

    return (
      <div key={folder._id} style={{ marginLeft: depth * 12 }}>
        {/*
          The drop zone wraps the entire folder header row.
          It is a plain div (not a button) so drag events reach it reliably.
          The toggle click is delegated to an inner button so the two concerns
          don't interfere with each other.
        */}
        <div
          className={`${s.folderRow} ${dragOverFolder === folder._id ? s.folderDropTarget : ''}`}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          onDragEnter={e => handleDragEnter(e, folder._id)}
          onDragLeave={e => handleDragLeave(e, folder._id)}
          onDrop={e => handleDrop(e, folder._id)}
        >
          {/* Toggle button — does NOT intercept drag events because it is not draggable */}
          <button
            className={s.folderToggle}
            onClick={() => toggle(folder._id)}
            draggable={false}
          >
            <ChevronIcon open={isOpen} />
            <FolderIcon open={isOpen} />
            {isRenaming ? (
              <form
                onSubmit={e => { e.preventDefault(); onRenameFolder(folder._id, renamingVal); setRenamingFolder(null); }}
                style={{ display: 'flex', gap: 4 }}
                onClick={e => e.stopPropagation()}
              >
                <input
                  className={s.folderRenameInput}
                  value={renamingVal}
                  onChange={e => setRenamingVal(e.target.value)}
                  autoFocus
                />
                <button type="submit" className={s.miniBtn} draggable={false}>✓</button>
                <button type="button" className={s.miniBtn} draggable={false} onClick={e => { e.stopPropagation(); setRenamingFolder(null); }}>✕</button>
              </form>
            ) : (
              <span className={s.folderLabel}>{folder.name}</span>
            )}
          </button>

          {canEdit && (
            <div className={s.folderActions}>
              {/* add sub-folder (only if root level) */}
              {!folder.parent && (
                <button
                  className={s.miniIconBtn}
                  title="Add sub-folder"
                  draggable={false}
                  onClick={() => { setNewFolderParent(folder._id); setNewFolderName(''); }}
                >+</button>
              )}
              <button
                className={s.miniIconBtn}
                title="Rename folder"
                draggable={false}
                onClick={() => { setRenamingFolder(folder._id); setRenamingVal(folder.name); }}
              >✏</button>
              <button className={s.miniIconBtn} title="Delete folder" draggable={false} onClick={() => onDeleteFolder(folder._id)}>✕</button>
            </div>
          )}
        </div>

        {/* inline new-sub-folder form */}
        {newFolderParent === folder._id && (
          <form
            className={s.newFolderForm}
            onSubmit={e => { e.preventDefault(); onCreateFolder(newFolderName, folder._id); setNewFolderParent(undefined); }}
            style={{ marginLeft: 20 }}
          >
            <input
              className={s.folderRenameInput}
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Sub-folder name"
              autoFocus
            />
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
        className={`${s.rootDropZone} ${dragOverFolder === '__root__' ? s.folderDropTarget : ''}`}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        onDragEnter={e => handleDragEnter(e, '__root__')}
        onDragLeave={e => handleDragLeave(e, '__root__')}
        onDrop={e => handleDrop(e, null)}
      >
        {rootPages.map(renderPage)}
      </div>

      {/* Create new root folder */}
      {canEdit && (
        newFolderParent === null ? (
          <form
            className={s.newFolderForm}
            onSubmit={e => { e.preventDefault(); onCreateFolder(newFolderName, null); setNewFolderParent(undefined); }}
          >
            <input
              className={s.folderRenameInput}
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              autoFocus
            />
            <button type="submit" className={s.miniBtn}>✓</button>
            <button type="button" className={s.miniBtn} onClick={() => setNewFolderParent(undefined)}>✕</button>
          </form>
        ) : (
          <button
            className={s.newFolderBtn}
            onClick={() => { setNewFolderParent(null); setNewFolderName(''); }}
          >
            + New folder
          </button>
        )
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProjectWiki() {
  const ctx = useOutletContext();
  const { workspaceId, projectId, canEdit } = ctx;
  const { toast } = useUI();

  // Pages
  const [pages, setPages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pageContent, setPageContent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Folders  ← NEW
  const [folders, setFolders] = useState([]);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFolderId, setNewFolderId] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [commitModal, setCommitModal] = useState(false);
  const [pendingContent, setPendingContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);

  // ── data loading ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setLoading(true);

    Promise.all([
      wikiApi.pages(workspaceId, projectId),
      wikiApi.folders(workspaceId, projectId),   // ← NEW
    ])
      .then(([pagesRes, foldersRes]) => {
        const list = pagesRes.data.pages ?? pagesRes.data;
        setPages(list);
        if (list.length && !selected) loadPage(list[0]);

        setFolders(foldersRes.data.folders ?? foldersRes.data);   // ← NEW
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  // ── page operations ──────────────────────────────────────────────────────────

  const loadPage = async (page) => {
    setSelected(page);
    setShowVersions(false);
    try {
      const { data } = await wikiApi.get(workspaceId, projectId, page._id);
      setPageContent(data.page ?? data);
    } catch { toast('Failed to load page', 'error'); }
  };

  const createPage = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const { data } = await wikiApi.create(workspaceId, projectId, {
        title: newTitle.trim(),
        folderId: newFolderId || null,
      });
      const page = data.page ?? data;
      setPages(prev => [page, ...prev]);
      setCreateModal(false);
      setNewTitle('');
      setNewFolderId('');
      loadPage(page);
      toast('Page created!', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed', 'error');
    }
  };

  const requestSave = (content) => {
    setPendingContent(content);
    setCommitMsg('');
    setCommitModal(true);
  };

  const savePage = async () => {
    if (commitMsg.trim().length < 10) {
      toast('Commit message must be at least 10 characters', 'error');
      return;
    }
    setSaving(true);
    try {
      const { data } = await wikiApi.update(workspaceId, projectId, selected._id, {
        content: pendingContent,
        commitMessage: commitMsg.trim(),
      });
      setPageContent(data.page ?? data);
      setCommitModal(false);
      toast('Page saved ✓', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to save', 'error');
    } finally { setSaving(false); }
  };

  const loadVersions = async () => {
    if (!selected) return;
    try {
      const { data } = await wikiApi.versions(workspaceId, projectId, selected._id);
      setVersions(data.versions ?? data);
      setShowVersions(true);
    } catch { toast('Failed to load versions', 'error'); }
  };

  const restoreVersion = async (version) => {
    setPendingContent(version.content);
    setCommitMsg(`Restored version from ${new Date(version.createdAt).toLocaleDateString()}`);
    setCommitModal(true);
  };

  const deletePage = async (page) => {
    if (!confirm(`Delete "${page.title}"?`)) return;
    try {
      await wikiApi.delete(workspaceId, projectId, page._id);
      setPages(prev => prev.filter(p => p._id !== page._id));
      if (selected?._id === page._id) { setSelected(null); setPageContent(null); }
      toast('Page deleted', 'info');
    } catch { toast('Failed to delete', 'error'); }
  };

  // ── folder operations ← NEW ──────────────────────────────────────────────────

  const createFolder = async (name, parentId) => {
    if (!name.trim()) return;
    try {
      const { data } = await wikiApi.createFolder(workspaceId, projectId, { name, parentId: parentId || null });
      setFolders(prev => [...prev, data.folder ?? data]);
      toast('Folder created', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to create folder', 'error');
    }
  };

  const renameFolder = async (folderId, name) => {
    try {
      const { data } = await wikiApi.updateFolder(workspaceId, projectId, folderId, { name });
      setFolders(prev => prev.map(f => f._id === folderId ? (data.folder ?? data) : f));
      toast('Folder renamed', 'success');
    } catch { toast('Failed to rename folder', 'error'); }
  };

  const deleteFolder = async (folderId) => {
    if (!confirm('Delete folder? Pages inside will be moved to root.')) return;
    try {
      await wikiApi.deleteFolder(workspaceId, projectId, folderId);
      setFolders(prev => prev.filter(f => f._id !== folderId));
      setPages(prev => prev.map(pg => String(pg.folder) === String(folderId) ? { ...pg, folder: null } : pg));
      toast('Folder deleted', 'info');
    } catch { toast('Failed to delete folder', 'error'); }
  };

  const movePage = async (pageId, folderId) => {
    try {
      console.log('Moving page:', { pageId, folderId, workspaceId, projectId });
      const res = await wikiApi.move(workspaceId, projectId, pageId, { folderId: folderId || null });
      console.log('Move response:', res);
      setPages(prev => prev.map(pg => pg._id === pageId ? { ...pg, folder: folderId || null } : pg));
    } catch (err) { 
      console.error('Move failed:', err.response?.data, err.response?.status);
      toast('Failed to move page', 'error'); 
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className={s.page}>
      <div className={s.sidebar}>
        <div className={s.sideHeader}>
          <span className={s.sideTitle}>Wiki Pages</span>
          <RoleGate show={canEdit}>
            <button className={s.newBtn} onClick={() => setCreateModal(true)}>+</button>
          </RoleGate>
        </div>

        {/* ← replaced plain page list with folder tree */}
        {loading ? (
          <p className={s.empty}>Loading…</p>
        ) : (
          <WikiFolderTree
            folders={folders}
            pages={pages}
            activePage={selected}
            onPageClick={loadPage}
            onDeletePage={deletePage}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onMovePage={movePage}
            canEdit={canEdit}
          />
        )}
      </div>

      <div className={s.editor}>
        {!pageContent ? (
          <div className={s.emptyEditor}>
            <p>Select a wiki page or create a new one</p>
          </div>
        ) : (
          <>
            <div className={s.editorHeader}>
              <h2 className={s.editorTitle}>{pageContent.title}</h2>
              <div className={s.editorActions}>
                <Button variant="outline" size="sm" onClick={loadVersions}>📜 History</Button>
                <RoleGate show={canEdit}>
                  <Button variant="primary" size="sm" onClick={() => requestSave(pageContent.content || '')}>
                    Save
                  </Button>
                </RoleGate>
              </div>
            </div>
            <WikiEditor
              content={pageContent.content || ''}
              editable={canEdit}
              onChange={(content) => setPageContent(prev => ({ ...prev, content }))}
              onSave={(content) => requestSave(content)}
            />
          </>
        )}

        {/* Version history sidebar */}
        {showVersions && (
          <div className={s.versions}>
            <div className={s.versionsHeader}>
              <span>Version History</span>
              <button className={s.closeVersions} onClick={() => setShowVersions(false)}>✕</button>
            </div>
            {versions.length === 0 ? (
              <p className={s.empty}>No versions yet.</p>
            ) : (
              versions.map((v, i) => (
                <div key={v._id ?? i} className={s.versionItem}>
                  <div className={s.versionMsg}>{v.commitMessage}</div>
                  <div className={s.versionMeta}>
                    {v.savedBy?.name || 'Unknown'} · {fmtRelative(v.createdAt)}
                  </div>
                  <RoleGate show={canEdit}>
                    <button className={s.restoreBtn} onClick={() => restoreVersion(v)}>Restore</button>
                  </RoleGate>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create page modal */}
      <Modal
        open={createModal}
        onClose={() => { setCreateModal(false); setNewTitle(''); setNewFolderId(''); }}
        title="New Wiki Page"
        size="md"
      >
        <form onSubmit={createPage} style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'visible' }}>
          <Input label="Page title" value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus />

          {/* Folder picker — always visible */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Folder <span style={{ fontWeight: 400, opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <select
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surface, #1e1e1e)',
                color: 'var(--text-1, #e0e0e0)',
                fontSize: '0.875rem',
                cursor: folders.length === 0 ? 'default' : 'pointer',
                opacity: folders.length === 0 ? 0.5 : 1,
              }}
              value={newFolderId}
              onChange={e => setNewFolderId(e.target.value)}
              disabled={folders.length === 0}
            >
              <option value="">
                {folders.length === 0 ? 'No folders yet — create one in the sidebar' : '— No folder (root) —'}
              </option>
              {folders.filter(f => !f.parent).map(f => [
                <option key={f._id} value={f._id}>📁 {f.name}</option>,
                ...folders
                  .filter(cf => String(cf.parent) === String(f._id))
                  .map(cf => <option key={cf._id} value={cf._id}>&nbsp;&nbsp;&nbsp;↳ {cf.name}</option>)
              ])}
            </select>
          </div>

          <Button type="submit" variant="primary" size="md">Create Page</Button>
        </form>
      </Modal>

      {/* Commit message modal */}
      <Modal open={commitModal} onClose={() => setCommitModal(false)} title="Save Changes" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Commit message (min 10 characters)"
            placeholder="Describe your changes…"
            value={commitMsg}
            onChange={e => setCommitMsg(e.target.value)}
            autoFocus
          />
          <Button variant="primary" size="md" onClick={savePage} disabled={saving || commitMsg.trim().length < 10}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}