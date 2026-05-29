// pages/workspace/project/ProjectKanban.jsx
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTasks, TASK_COLUMNS, TASK_STATUS_COLORS } from '../../../store/tasks';
import { useUI } from '../../../store/ui';
import { useAuth } from '../../../store/auth';
import { usePresence } from '../../../lib/hooks';
import { PriorityChip, Avatar } from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Input, Textarea, Select } from '../../../components/ui/Input';
import { SkeletonCard } from '../../../components/ui/Skeleton';
import { fmtDate } from '../../../lib/utils';
import TaskDetail from '../../../components/kanban/TaskDetail';
import RoleGate from '../../../components/common/RoleGate';
// ↓ new imports
import KanbanFilters, { applyFilters, EMPTY_FILTERS } from '../../../components/kanban/KanbanFilters';
import s from '../../../styles/modules/Kanban.module.css';
import fs from '../../../styles/modules/KanbanFilters.module.css';

export default function ProjectKanban() {
  const ctx = useOutletContext();
  const { workspaceId, projectId, project, canEdit, wsMembers, projectMembers } = ctx;
  const { tasks, fetch, create, move, loading, delete: deleteTaskStore } = useTasks();
  const { toast } = useUI();
  const { user } = useAuth();
  const online = usePresence(project?._id);

  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [detailEditMode, setDetailEditMode] = useState(false);

  // ── Filter state (local — never shared with other viewers) ──────────────
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const activeFilterCount =
    (filters.assignees?.length  || 0) +
    (filters.priorities?.length || 0) +
    (filters.statuses?.length   || 0) +
    (filters.deadline ? 1 : 0) +
    (filters.tags?.length || 0);

  const handleDeleteTask = async (task) => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTaskStore(workspaceId, projectId, task._id);
      toast('Task deleted', 'info');
    } catch {
      toast('Failed to delete task', 'error');
    }
  };

  const [form, setForm] = useState({
    title: '', description: '', priority: 'P1',
    dueDate: '', labels: '', assignee: '', status: 'To Do',
  });

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    fetch(workspaceId, projectId);
  }, [workspaceId, projectId]);

  // Apply client-side filters — tasks from store are never mutated
  const visibleTasks = activeFilterCount > 0
    ? applyFilters(tasks, filters, user?._id)
    : tasks;

  const columns = TASK_COLUMNS.reduce((acc, col) => ({
    ...acc, [col.key]: visibleTasks.filter(t => t.status === col.key),
  }), {});

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await create(workspaceId, projectId, {
        ...form,
        labels: form.labels ? form.labels.split(',').map(l => l.trim()) : [],
        assignee: form.assignee || undefined,
        dueDate: form.dueDate || undefined,
      });
      setCreateModal(false);
      setForm({ title: '', description: '', priority: 'P1', dueDate: '', labels: '', assignee: '', status: 'To Do' });
      toast('Task created!', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to create task', 'error');
    }
  };

  const handleDragStart = (task) => { if (canEdit) setDragging(task); };
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };
  const handleDragOver = (status, e) => { if (canEdit) { e.preventDefault(); setDragOver(status); } };
  const handleDrop = (status) => {
    if (dragging && dragging.status !== status && canEdit) {
      move(workspaceId, projectId, dragging._id, status, project?._id || projectId);
    }
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Kanban Board</h1>
        <div className={s.headerRight}>
          <div className={s.presence}>
            {online.map(u => <Avatar key={u._id} name={u.name} online size={24} />)}
            <span className={s.onlineCount}>{online.length} online</span>
          </div>

          {/* ── Filter toggle button ─────────────────────── */}
          <button
            className={`${s.filterBtn || ''} ${activeFilterCount > 0 ? s.filterBtnActive || '' : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 12px',
              borderRadius: 6,
              border: activeFilterCount > 0
                ? '1px solid var(--accent, #6c63ff)'
                : '1px solid var(--border, rgba(255,255,255,0.12))',
              background: activeFilterCount > 0
                ? 'rgba(108,99,255,0.12)'
                : 'transparent',
              color: activeFilterCount > 0
                ? 'var(--text-primary, #fff)'
                : 'var(--text-secondary, rgba(255,255,255,0.55))',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
            onClick={() => setShowFilters(v => !v)}
            title="Filter tasks (your view only)"
          >
            {/* Funnel icon */}
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 3h12l-4.5 5.5V13l-3-1.5V8.5L2 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
            </svg>
            Filter
            {activeFilterCount > 0 && (
              <span className={fs.badge}>{activeFilterCount}</span>
            )}
          </button>

          <RoleGate show={canEdit}>
            <Button variant="primary" size="sm" onClick={() => setCreateModal(true)}>+ Add Task</Button>
          </RoleGate>
        </div>
      </div>

      {/* ── Filter bar (shown below header, above board) ───────────────── */}
      {showFilters && (
        <KanbanFilters
          wsMembers={wsMembers || []}
          allTasks={tasks}
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* ── Active filter summary strip ──────────────────────────────── */}
      {!showFilters && activeFilterCount > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 2px',
          marginBottom: 10,
          fontSize: 12,
          color: 'var(--text-secondary, rgba(255,255,255,0.5))',
        }}>
          <span>Showing {visibleTasks.length} of {tasks.length} tasks</span>
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            style={{
              background: 'none',
              border: 'none',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: 12,
              padding: '0 4px',
              textDecoration: 'underline',
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {loading ? (
        <div className={s.board}>
          {TASK_COLUMNS.map(col => (
            <div key={col.key} className={s.column}>
              <div className={s.colHeader} style={{ borderColor: TASK_STATUS_COLORS[col.key] }}>{col.label}</div>
              <SkeletonCard /><SkeletonCard />
            </div>
          ))}
        </div>
      ) : (
        <div className={s.board}>
          {TASK_COLUMNS.map(col => (
            <div
              key={col.key}
              className={`${s.column} ${dragOver === col.key ? s.columnOver : ''}`}
              onDragOver={(e) => handleDragOver(col.key, e)}
              onDrop={() => handleDrop(col.key)}
            >
              <div className={s.colHeader} style={{ borderColor: TASK_STATUS_COLORS[col.key] }}>
                {col.label} <span className={s.colCount}>{columns[col.key]?.length || 0}</span>
              </div>
              <div className={s.cards}>
                {(columns[col.key] || []).map(task => (
                  <div
                    key={task._id}
                    className={`${s.card} ${dragging?._id === task._id ? s.cardDragging : ''}`}
                    draggable={canEdit}
                    onDragStart={() => handleDragStart(task)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      setDetailEditMode(false);
                      setDetailTask(task);
                    }}
                  >
                    <div className={s.cardHeader}>
                      <div className={s.cardTitle}>{task.title}</div>
                      {canEdit && (
                        <div className={s.cardActions}>
                          <button
                            className={s.actionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailEditMode(true);
                              setDetailTask(task);
                            }}
                            title="Edit Task"
                          >
                            ✎
                          </button>
                          <button
                            className={`${s.actionBtn} ${s.deleteBtn}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task);
                            }}
                            title="Delete Task"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                    <div className={s.cardMeta}>
                      <PriorityChip priority={task.priority} />
                      {task.assignee && <Avatar name={task.assignee?.name} src={task.assignee?.avatar} size={20} />}
                      {task.dueDate && <span className={s.dueDate}>{fmtDate(task.dueDate)}</span>}
                    </div>
                    {task.labels?.length > 0 && (
                      <div className={s.labels}>
                        {task.labels.map(l => <span key={l} className={s.label}>{l}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create task modal */}
      <RoleGate show={canEdit}>
        <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Task" size="md">
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
            <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="P0">P0 — Critical</option>
                <option value="P1">P1 — High</option>
                <option value="P2">P2 — Normal</option>
              </Select>
              <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {TASK_COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </Select>
            </div>
            <Select label="Assignee" value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}>
              <option value="">Unassigned</option>
              {(wsMembers || []).map(m => (
                <option key={m.user?._id || m.user} value={m.user?._id || m.user}>
                  {m.user?.name || 'Unknown'}
                </option>
              ))}
            </Select>
            <Input label="Due date" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            <Input label="Labels (comma-separated)" value={form.labels} onChange={e => setForm(f => ({ ...f, labels: e.target.value }))} placeholder="frontend, urgent" />
            <Button type="submit" variant="primary" size="md">Create Task</Button>
          </form>
        </Modal>
      </RoleGate>

      {/* Task detail drawer */}
      {detailTask && (
        <TaskDetail
          task={detailTask}
          workspaceId={workspaceId}
          projectId={projectId}
          wsMembers={wsMembers || []}
          mentionMembers={projectMembers || []}
          canEdit={canEdit}
          initialEditing={detailEditMode}
          onClose={() => setDetailTask(null)}
          onUpdate={(updated) => {
            setDetailTask(updated);
          }}
        />
      )}
    </div>
  );
}