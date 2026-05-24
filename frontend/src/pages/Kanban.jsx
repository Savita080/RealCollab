// pages/Kanban.jsx
import { useEffect, useState } from 'react';
import { useWorkspace } from '../store/workspace';
import { useTasks } from '../store/tasks';
import { useUI } from '../store/ui';
import { joinProject, leaveProject } from '../lib/socket';
import { usePresence } from '../lib/hooks';
import { PriorityChip } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Textarea, Select } from '../components/ui/Input';
import { SkeletonCard } from '../components/ui/Skeleton';
import { fmtDate } from '../lib/utils';
import TaskDetail from '../components/kanban/TaskDetail';
import s from './Kanban.module.css';

const COLUMNS = ['To Do', 'In Progress', 'In Review', 'Done'];
const COL_COLORS = { 'To Do': '#6366f1', 'In Progress': '#f59e0b', 'In Review': '#00d4ff', 'Done': '#10b981' };

export default function Kanban() {
  const { current: ws, currentProject } = useWorkspace();
  const { tasks, fetch, create, move, loading, bindSocket, unbindSocket } = useTasks();
  const { toast } = useUI();
  const online = usePresence(currentProject?._id);

  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'P1', dueDate: '', labels: '' });

  useEffect(() => {
    if (!currentProject || !ws) return;
    fetch(ws._id, currentProject._id);
    joinProject(currentProject._id);
    bindSocket();
    return () => { leaveProject(currentProject._id); unbindSocket(); };
  }, [currentProject?._id, ws?._id]);

  const columns = COLUMNS.reduce((acc, col) => ({
    ...acc,
    [col]: tasks.filter(t => t.status === col),
  }), {});

  const handleDrop = async (status) => {
    if (!dragging || dragging.status === status) return;
    await move(ws._id, currentProject._id, dragging._id, status, currentProject._id);
    setDragging(null);
    setDragOver(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const labels = form.labels.split(',').map(l => l.trim()).filter(Boolean);
      await create(ws._id, currentProject._id, { ...form, labels });
      setCreateModal(false);
      setForm({ title: '', description: '', priority: 'P1', dueDate: '', labels: '' });
      toast('Task created', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to create task', 'error');
    }
  };

  if (!currentProject) {
    return <div className={s.empty}>Select or create a project to view the Kanban board.</div>;
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Kanban Board</h1>
          <p className={s.project}>{currentProject.name}</p>
        </div>
        <div className={s.headerRight}>
          {online.length > 0 && (
            <div className={s.presence}>
              <span className={s.presenceDot} />
              <span>{online.length} online</span>
            </div>
          )}
          <Button variant="primary" size="sm" onClick={() => setCreateModal(true)}>
            + New Task
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className={s.board}>
        {COLUMNS.map(col => (
          <div
            key={col}
            className={`${s.column} ${dragOver === col ? s.dragOver : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(col); }}
            onDrop={() => handleDrop(col)}
            onDragLeave={() => setDragOver(null)}
          >
            <div className={s.colHeader} style={{ '--c': COL_COLORS[col] }}>
              <div className={s.colDot} />
              <span className={s.colName}>{col}</span>
              <span className={s.colCount}>{columns[col].length}</span>
            </div>

            <div className={s.cards}>
              {loading && columns[col].length === 0 && (
                <><SkeletonCard /><SkeletonCard /></>
              )}
              {columns[col].map(task => (
                <div
                  key={task._id}
                  className={`${s.card} ${dragging?._id === task._id ? s.dragging : ''}`}
                  draggable
                  onDragStart={() => setDragging(task)}
                  onDragEnd={() => setDragging(null)}
                  onClick={() => setDetailTask(task)}
                >
                  <p className={s.taskTitle}>{task.title}</p>
                  {task.description && (
                    <p className={s.taskDesc}>{task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}</p>
                  )}
                  <div className={s.cardMeta}>
                    <PriorityChip priority={task.priority} />
                    {task.dueDate && (
                      <span className={s.due}>{fmtDate(task.dueDate)}</span>
                    )}
                  </div>
                  {task.labels?.length > 0 && (
                    <div className={s.labels}>
                      {task.labels.map(l => (
                        <span key={l} className={s.label}>{l}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create task modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Task">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Input label="Title" placeholder="Implement login flow" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Textarea label="Description" placeholder="What needs to be done?" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Select label="Priority" value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            options={['P0', 'P1', 'P2']} />
          <Input label="Labels (comma separated)" placeholder="frontend, bug, auth"
            value={form.labels} onChange={e => setForm(f => ({ ...f, labels: e.target.value }))} />
          <Input label="Due date" type="date" value={form.dueDate}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          <Button type="submit" variant="primary" size="md">Create Task</Button>
        </form>
      </Modal>

      {/* Task detail */}
      {detailTask && (
        <TaskDetail task={detailTask} onClose={() => setDetailTask(null)} />
      )}
    </div>
  );
}
