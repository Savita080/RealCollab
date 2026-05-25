// pages/workspace/project/ProjectWiki.jsx — Adapted from Wiki.jsx
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { wiki as wikiApi } from '../../../lib/api';
import { useUI } from '../../../store/ui';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Input, Textarea } from '../../../components/ui/Input';
import WikiEditor from '../../../components/wiki/WikiEditor';
import RoleGate from '../../../components/common/RoleGate';
import { fmtRelative } from '../../../lib/utils';
import s from '../../../styles/modules/Wiki.module.css';

export default function ProjectWiki() {
  const ctx = useOutletContext();
  const { workspaceId, projectId, canEdit } = ctx;
  const { toast } = useUI();

  const [pages, setPages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pageContent, setPageContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [commitModal, setCommitModal] = useState(false);
  const [pendingContent, setPendingContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setLoading(true);
    wikiApi.pages(workspaceId, projectId)
      .then(({ data }) => {
        const list = data.pages ?? data;
        setPages(list);
        if (list.length && !selected) loadPage(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

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
      const { data } = await wikiApi.create(workspaceId, projectId, { title: newTitle.trim() });
      const page = data.page ?? data;
      setPages(prev => [page, ...prev]);
      setCreateModal(false);
      setNewTitle('');
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

  return (
    <div className={s.page}>
      <div className={s.sidebar}>
        <div className={s.sideHeader}>
          <span className={s.sideTitle}>Wiki Pages</span>
          <RoleGate show={canEdit}>
            <button className={s.newBtn} onClick={() => setCreateModal(true)}>+</button>
          </RoleGate>
        </div>
        <div className={s.pageList}>
          {loading && <p className={s.empty}>Loading…</p>}
          {!loading && pages.length === 0 && <p className={s.empty}>No pages yet.</p>}
          {pages.map(p => (
            <div
              key={p._id}
              className={`${s.pageItem} ${selected?._id === p._id ? s.pageItemActive : ''}`}
              onClick={() => loadPage(p)}
            >
              <span className={s.pageIcon}>📄</span>
              <span className={s.pageTitle}>{p.title}</span>
              <RoleGate show={canEdit}>
                <button className={s.deleteBtn} onClick={(e) => { e.stopPropagation(); deletePage(p); }}>✕</button>
              </RoleGate>
            </div>
          ))}
        </div>
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
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="New Wiki Page" size="sm">
        <form onSubmit={createPage} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Page title" value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus />
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
