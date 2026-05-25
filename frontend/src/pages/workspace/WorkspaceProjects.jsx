// pages/workspace/WorkspaceProjects.jsx
import { useEffect, useState } from 'react';
import { Link, useParams, useOutletContext } from 'react-router-dom';
import { projects as projApi } from '../../lib/api';
import { useUI } from '../../store/ui';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import RoleGate from '../../components/common/RoleGate';
import s from '../../styles/modules/WorkspaceProjects.module.css';

const PROJECT_COLORS = [
  '#6366f1', '#00d4ff', '#10b981', '#f59e0b',
  '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4',
];

export default function WorkspaceProjects() {
  const { workspaceId } = useParams();
  const ctx = useOutletContext();
  const { toast } = useUI();
  const role = ctx?.role;
  const isAdminOrOwner = role === 'OWNER' || role === 'ADMIN';
  const canCreate = role !== 'VIEWER';

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [popup, setPopup] = useState(null); // for member popup

  useEffect(() => {
    setLoading(true);
    projApi.list(workspaceId)
      .then(({ data }) => setProjects(data.projects ?? data))
      .catch(() => toast('Failed to load projects', 'error'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data } = await projApi.create(workspaceId, { name: name.trim(), description: desc.trim() });
      const proj = data.project ?? data;
      setProjects(prev => [proj, ...prev]);
      setName(''); setDesc(''); setCreateModal(false);
      toast('Project created!', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to create project', 'error');
    } finally { setCreating(false); }
  };

  const handleCardClick = (proj, e) => {
    if (isAdminOrOwner) return; // let Link handle it
    // For MEMBER role, show popup instead
    if (role === 'MEMBER' || role === 'VIEWER') {
      e.preventDefault();
      setPopup(proj);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.heading}>Projects</h1>
        <RoleGate show={canCreate}>
          <Button variant="primary" size="sm" onClick={() => setCreateModal(true)}>+ New Project</Button>
        </RoleGate>
      </div>

      {loading ? (
        <div className={s.grid}>
          {[1,2,3].map(i => (
            <div key={i} className={s.card} style={{ opacity: 0.3 }}>
              <div className={s.cardName}>Loading…</div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className={s.empty}>
          <p>No projects yet.</p>
          <RoleGate show={canCreate}>
            <Button variant="primary" size="sm" onClick={() => setCreateModal(true)} style={{ marginTop: 12 }}>
              Create First Project
            </Button>
          </RoleGate>
        </div>
      ) : (
        <div className={s.grid}>
          {projects.map((proj, i) => {
            const color = PROJECT_COLORS[i % PROJECT_COLORS.length];
            const isClickable = isAdminOrOwner;
            const Wrapper = isClickable ? Link : 'div';
            const wrapperProps = isClickable
              ? { to: `/workspaces/${workspaceId}/projects/${proj._id}` }
              : { onClick: (e) => handleCardClick(proj, e) };

            return (
              <Wrapper
                key={proj._id}
                className={`${s.card} ${isClickable ? s.cardClickable : s.cardLocked}`}
                {...wrapperProps}
              >
                <div className={s.cardColor} style={{ background: color }} />
                <div className={s.cardName}>{proj.name}</div>
                {proj.description && <div className={s.cardDesc}>{proj.description}</div>}
                <div className={s.cardFooter}>
                  <span>👥 {proj.members?.length ?? 0} members</span>
                </div>
              </Wrapper>
            );
          })}
        </div>
      )}

      {/* Popup for non-admin members */}
      {popup && (
        <div className={s.popup} onClick={() => setPopup(null)}>
          <div className={s.popupCard} onClick={e => e.stopPropagation()}>
            <div className={s.popupName}>{popup.name}</div>
            <div className={s.popupDesc}>{popup.description || 'No description'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
              👥 {popup.members?.length ?? 0} members
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
              You need to be added as a project member to open this project.
              Ask a project contributor or workspace admin.
            </p>
            <button className={s.popupClose} onClick={() => setPopup(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Create project modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Project" size="sm">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Project name" placeholder="Website Redesign" value={name} onChange={e => setName(e.target.value)} autoFocus />
          <Input label="Description (optional)" placeholder="Brief project description" value={desc} onChange={e => setDesc(e.target.value)} />
          <Button type="submit" variant="primary" size="md" disabled={creating || !name.trim()}>
            {creating ? 'Creating…' : 'Create Project'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
