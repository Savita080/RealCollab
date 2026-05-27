// pages/Wiki.jsx
import { useEffect, useState } from 'react';
import { useWorkspace } from '../store/workspace';
import { wiki as wikiApi } from '../lib/api';
import { useUI } from '../store/ui';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import WikiEditor from '../components/wiki/WikiEditor';
import WikiHistoryModal from '../components/wiki/WikiHistoryModal';
import s from '../styles/modules/Wiki.module.css';

export default function Wiki() {
  const { current: ws, currentProject } = useWorkspace();
  const { toast } = useUI();
  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [activeContent, setActiveContent] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [historyModal, setHistoryModal] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [commitModal, setCommitModal] = useState(false); // true when awaiting commit message
  const [pendingContent, setPendingContent] = useState(null); // content waiting to be saved
  const [commitMsg, setCommitMsg] = useState('');
  const [saving, setSaving] = useState(false);
  // Rename title
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [newTitleEdit, setNewTitleEdit] = useState('');

  useEffect(() => {
    if (!currentProject || !ws) return;
    wikiApi.pages(ws._id, currentProject._id).then(({ data }) => {
      const list = data.pages ?? data;
      setPages(list);
      if (list.length) loadPage(list[0]);
    });
  }, [currentProject?._id, ws?._id]);

  const loadPage = async (pg) => {
    setActivePage(pg);
    // Pages list only has title, fetch full content separately
    try {
      const { data } = await wikiApi.get(ws._id, currentProject._id, pg._id);
      const full = data.page ?? data;
      setActiveContent(full.content || '');
    } catch {
      setActiveContent(pg.content || '');
    }
  };

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

  // Called by WikiEditor when user hits Save — opens commit message prompt
  const requestSave = (content) => {
    if (content === activeContent) {
      toast('No changes to save', 'info');
      return;
    }
    setPendingContent(content);
    setCommitMsg('');
    setCommitModal(true);
  };

  const savePage = async (content, commitMessage) => {
    if (commitMessage.length < 10) {
      toast('Commit message must be at least 10 characters', 'error');
      return false;
    }
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
    if (ok) {
      setHistoryModal(false);
      toast('Version restored', 'success');
    }
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

  if (!currentProject) return <div className={s.empty}>Select a project to view the wiki.</div>;

  return (
    <div className={s.page}>
      {/* Sidebar */}
      <aside className={s.sidebar}>
        <div className={s.sideHeader}>
          <span className={s.sideTitle}>Pages</span>
          <button className={s.addBtn} onClick={() => setCreateModal(true)} title="New page">+</button>
        </div>
        <div className={s.pageList}>
          {pages.map(pg => (
            <div key={pg._id} className={`${s.pageRow} ${activePage?._id === pg._id ? s.activeRow : ''}`}>
              <button
                className={`${s.pageItem} ${activePage?._id === pg._id ? s.active : ''}`}
                onClick={() => loadPage(pg)}
              >
                □ {pg.title}
              </button>
              <button className={s.deletePageBtn} onClick={() => deletePage(pg)} title="Delete page">✕</button>
            </div>
          ))}
          {pages.length === 0 && <p className={s.noPages}>No pages yet</p>}
        </div>
      </aside>

      {/* Editor */}
      <main className={s.editor}>
        {activePage ? (
          <>
            <div className={s.editorToolbar}>
              {renamingTitle ? (
                <form onSubmit={handleRenameTitle} className={s.renameForm}>
                  <input
                    className={s.renameTitleInput}
                    value={newTitleEdit}
                    onChange={e => setNewTitleEdit(e.target.value)}
                    autoFocus
                    required
                  />
                  <Button type="submit" variant="primary" size="sm">Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setRenamingTitle(false)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <h2 className={s.pageTitle}>{activePage.title}</h2>
                  <button
                    className={s.renameBtn}
                    onClick={() => { setNewTitleEdit(activePage.title); setRenamingTitle(true); }}
                    title="Rename page"
                  >✏</button>
                </>
              )}
              <button className={s.historyBtn} onClick={openHistory} title="Version history">⏱ History</button>
            </div>
            <WikiEditor page={{ ...activePage, content: activeContent }} onSave={requestSave} />
          </>
        ) : (
          <div className={s.empty}>Select a page or create one to start writing.</div>
        )}
      </main>

      {/* Create modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="New Wiki Page" size="sm">
        <form onSubmit={createPage} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Page title" placeholder="Getting Started" value={newTitle}
            onChange={e => setNewTitle(e.target.value)} required />
          <Button type="submit" variant="primary" size="md">Create Page</Button>
        </form>
      </Modal>

      {/* Commit message modal */}
      <Modal open={commitModal} onClose={() => setCommitModal(false)} title="Save with Commit Message" size="sm">
        <form onSubmit={handleCommitSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
            Describe what changed in this save (min. 10 characters — saved to version history).
          </p>
          <Input
            label="Commit message"
            placeholder="Fixed typo in setup section"
            value={commitMsg}
            onChange={e => setCommitMsg(e.target.value)}
            required
          />
          <Button type="submit" variant="primary" size="md" loading={saving}
            disabled={commitMsg.length < 10}>
            Save Page
          </Button>
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
    </div>
  );
}
