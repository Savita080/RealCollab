// pages/workspace/project/ProjectSnippets.jsx — Wrapper reading IDs from context
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { snippets as snipApi } from '../../../lib/api';
import { useUI } from '../../../store/ui';
import { useAuth } from '../../../store/auth';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Input, Textarea, Select } from '../../../components/ui/Input';
import SnippetCard from '../../../components/snippets/SnippetCard';
import RoleGate from '../../../components/common/RoleGate';
import s from '../../../styles/modules/Snippets.module.css';

const LANGUAGES = ['javascript','python','typescript','java','c','cpp','go','rust','html','css','sql','bash','json','yaml','markdown','other'];

export default function ProjectSnippets() {
  const ctx = useOutletContext();
  const { workspaceId, projectId, canEdit } = ctx;
  const { toast } = useUI();

  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ title: '', language: 'javascript', code: '', description: '', tags: '' });

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setLoading(true);
    snipApi.list(workspaceId, projectId)
      .then(({ data }) => setSnippets(data.snippets ?? data))
      .catch(() => toast('Failed to load snippets', 'error'))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  const filtered = snippets.filter(sn =>
    sn.title?.toLowerCase().includes(search.toLowerCase()) ||
    sn.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await snipApi.create(workspaceId, projectId, {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      });
      setSnippets(prev => [data.snippet ?? data, ...prev]);
      setCreateModal(false);
      setForm({ title: '', language: 'javascript', code: '', description: '', tags: '' });
      toast('Snippet created!', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this snippet?')) return;
    try {
      await snipApi.delete(workspaceId, projectId, id);
      setSnippets(prev => prev.filter(sn => sn._id !== id));
      toast('Snippet deleted', 'info');
    } catch { toast('Failed to delete', 'error'); }
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Code Snippets</h1>
        <RoleGate show={canEdit}>
          <Button variant="primary" size="sm" onClick={() => setCreateModal(true)}>+ Add Snippet</Button>
        </RoleGate>
      </div>

      <Input
        placeholder="Search by title or tag…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 20, maxWidth: 400 }}
      />

      {loading ? (
        <p style={{ color: 'var(--text-3)' }}>Loading snippets…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--text-3)' }}>No snippets found.</p>
      ) : (
        <div className={s.grid}>
          {filtered.map(sn => (
            <SnippetCard key={sn._id} snippet={sn} canEdit={canEdit} onDelete={() => handleDelete(sn._id)} />
          ))}
        </div>
      )}

      <RoleGate show={canEdit}>
        <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add Snippet" size="md">
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
            <Select label="Language" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </Select>
            <Textarea label="Code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} rows={8} style={{ fontFamily: 'var(--font-mono)' }} />
            <Input label="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <Input label="Tags (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="react, hook, auth" />
            <Button type="submit" variant="primary" size="md">Create Snippet</Button>
          </form>
        </Modal>
      </RoleGate>
    </div>
  );
}
