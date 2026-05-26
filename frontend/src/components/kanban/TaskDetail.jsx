// components/kanban/TaskDetail.jsx
import { useState, useEffect, useRef } from 'react';
import { useTasks, TASK_COLUMNS } from '../../store/tasks';
import { useWorkspace } from '../../store/workspace';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { tasks as tasksApi, workspaces as wsApi } from '../../lib/api';
import socket from '../../lib/socket';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, Textarea, Select } from '../ui/Input';
import MentionInput from '../ui/MentionInput';
import EmojiPickerButton from '../ui/EmojiPickerButton';
import ReactionBar from '../ui/ReactionBar';
import { PriorityChip, Avatar } from '../ui/Badge';
import { fmtDate, fmtRelative } from '../../lib/utils';
import s from '../../styles/modules/TaskDetail.module.css';

export default function TaskDetail({ task, onClose, wsMembers = [], mentionMembers, canEdit = true }) {
  const storeTasks = useTasks(state => state.tasks);
  const currentTask = storeTasks.find(t => t._id === task._id) || task;

  // Mentions in task comments are scoped to project members only — fall back to
  // wsMembers if a project-scoped list wasn't provided (legacy callers).
  const mentionPool = mentionMembers ?? wsMembers;
  const { update, delete: deleteTask } = useTasks();
  const { current: ws, currentProject } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useUI();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: currentTask.title,
    description: currentTask.description || '',
    priority: currentTask.priority || 'P1',
    status: currentTask.status || 'To Do',
    assignee: currentTask.assignee?._id || currentTask.assignee || '',
    dueDate: currentTask.dueDate ? currentTask.dueDate.slice(0, 10) : '',
  });
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const commentsEndRef = useRef(null);

  // Sync form state when the current task updates in store (e.g. edited elsewhere or saved)
  useEffect(() => {
    setForm({
      title: currentTask.title,
      description: currentTask.description || '',
      priority: currentTask.priority || 'P1',
      status: currentTask.status || 'To Do',
      assignee: currentTask.assignee?._id || currentTask.assignee || '',
      dueDate: currentTask.dueDate ? currentTask.dueDate.slice(0, 10) : '',
    });
  }, [currentTask]);

  // Load existing comments on mount
  useEffect(() => {
    tasksApi.comments(currentTask._id)
      .then(({ data }) => setComments(data.comments ?? data))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [currentTask._id]);

  // Live: listen for comments added/deleted in this project room
  useEffect(() => {
    const onAdded = (c) => {
      if (c.task === currentTask._id || c.task?._id === currentTask._id) {
        setComments(prev => [...prev, c]);
      }
    };
    const onDeleted = ({ commentId, taskId }) => {
      if (taskId === currentTask._id || taskId?.toString() === currentTask._id) {
        setComments(prev => prev.filter(c => c._id !== commentId));
      }
    };
    const onReaction = ({ commentId, reactions }) => {
      setComments(prev => prev.map(c => c._id === commentId ? { ...c, reactions } : c));
    };
    socket.on('task_comment_added', onAdded);
    socket.on('task_comment_deleted', onDeleted);
    socket.on('comment_reaction_updated', onReaction);
    return () => {
      socket.off('task_comment_added', onAdded);
      socket.off('task_comment_deleted', onDeleted);
      socket.off('comment_reaction_updated', onReaction);
    };
  }, [currentTask._id]);

  // Scroll to bottom when comments update
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSave = async () => {
    try {
      await update(ws._id, currentProject._id, currentTask._id, form);
      toast('Task updated', 'success');
      setEditing(false);
    } catch {
      toast('Failed to update task', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(ws._id, currentProject._id, currentTask._id);
    toast('Task deleted', 'info');
    onClose();
  };

  // Detect @mentions — NOTE: backend handles notifications automatically when comment is created
  // We keep this as a no-op to avoid double notifications
  const detectMentions = async (_content) => {};

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const { data } = await tasksApi.comment(currentTask._id, {
        content: comment,
        projectId: currentProject._id,
      });
      const newComment = data.comment ?? data;
      // Optimistically add if socket doesn't fire for self
      setComments(prev => {
        const exists = prev.some(c => c._id === newComment._id);
        return exists ? prev : [...prev, newComment];
      });
      await detectMentions(comment);
      setComment('');
    } catch {
      toast('Failed to post comment', 'error');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await tasksApi.deleteComment(currentTask._id, commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch {
      toast('Failed to delete comment', 'error');
    }
  };

  const myId = user?.id || user?._id;
  const handleReactComment = async (commentId, emoji) => {
    setComments(prev => prev.map(c => {
      if (c._id !== commentId) return c;
      const reactions = [...(c.reactions || [])];
      const idx = reactions.findIndex(r => r.emoji === emoji);
      if (idx === -1) {
        reactions.push({ emoji, users: [myId] });
      } else {
        const users = reactions[idx].users || [];
        const has = users.some(u => (u?._id || u)?.toString() === myId?.toString());
        const next = has ? users.filter(u => (u?._id || u)?.toString() !== myId?.toString()) : [...users, myId];
        if (next.length === 0) reactions.splice(idx, 1);
        else reactions[idx] = { ...reactions[idx], users: next };
      }
      return { ...c, reactions };
    }));
    try { await tasksApi.reactComment(currentTask._id, commentId, emoji, currentProject?._id); }
    catch { toast('Failed to react', 'error'); }
  };

  return (
    <Modal open onClose={onClose} title="Task Detail" size="lg">
      <div className={s.body}>
        {/* Title */}
        {editing && canEdit ? (
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        ) : (
          <h2 className={s.title}>{currentTask.title}</h2>
        )}

        {/* Meta row */}
        <div className={s.meta}>
          <PriorityChip priority={currentTask.priority} />
          <span className={s.status}>{currentTask.status}</span>
          {currentTask.dueDate && <span className={s.due}>Due {fmtDate(currentTask.dueDate)}</span>}
          {currentTask.labels?.length > 0 && (
            <div className={s.labels}>
              {currentTask.labels.map(l => <span key={l} className={s.label}>{l}</span>)}
            </div>
          )}
        </div>

        {/* Description */}
        <div className={s.section}>
          <span className={s.sLabel}>Description</span>
          {editing && canEdit ? (
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          ) : (
            <p className={s.desc}>{currentTask.description || <em>No description</em>}</p>
          )}
        </div>

        {/* Edit fields */}
        {editing && canEdit && (
          <div className={s.editFields}>
            <Select label="Priority" value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              options={['P0', 'P1', 'P2']} />
            <Select label="Status" value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              options={TASK_COLUMNS.map(c => ({ value: c.key, label: c.label }))} />
            <Input label="Due date" type="date" value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            {/* Assignee */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Assignee</label>
              <select
                style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 13, fontFamily: 'var(--font-body)', borderRadius: 'var(--r-sm)', padding: '8px 12px', outline: 'none' }}
                value={form.assignee}
                onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {wsMembers.map(m => (
                  <option key={m.user?._id} value={m.user?._id}>{m.user?.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Actions — viewers can read but not edit/delete */}
        {canEdit && (
          <div className={s.actions}>
            {editing ? (
              <>
                <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
              </>
            )}
          </div>
        )}

        {/* Comments */}
        <div className={s.section}>
          <span className={s.sLabel}>
            Comments ({comments.length})
            <span className={s.liveDot} title="Live" />
          </span>
          <div className={s.comments}>
            {loadingComments && <p className={s.loading}>Loading comments…</p>}
            {!loadingComments && comments.length === 0 && (
              <p className={s.noComments}>No comments yet. Be the first!</p>
            )}
            {comments.map((c) => (
              <div key={c._id} className={s.comment}>
                <Avatar name={c.author?.name || 'U'} size={26} />
                <div className={s.commentBody}>
                  <div className={s.commentHeader}>
                    <strong className={s.commenter}>{c.author?.name || 'Someone'}</strong>
                    <span className={s.commentTime}>{fmtRelative(c.createdAt)}</span>
                    {(c.author?._id === user?.id || c.author === user?.id) && (
                      <button className={s.deleteCommentBtn} onClick={() => handleDeleteComment(c._id)} title="Delete">✕</button>
                    )}
                  </div>
                  <p className={s.commentText}>{c.content}</p>
                  <ReactionBar
                    reactions={c.reactions}
                    currentUserId={myId}
                    members={mentionPool}
                    onToggle={(emoji) => handleReactComment(c._id, emoji)}
                  />
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
          <form onSubmit={submitComment} className={s.commentForm}>
            <MentionInput
              placeholder="Add a comment… use @ to mention someone"
              value={comment}
              members={mentionPool}
              onChange={e => setComment(e.target.value)}
            />
            <EmojiPickerButton
              title="Insert emoji"
              onSelect={(emoji) => setComment(prev => prev + emoji)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, padding: '0 6px' }}
            >
              😊
            </EmojiPickerButton>
            <Button type="submit" variant="ghost" size="sm">Post</Button>
          </form>
        </div>
      </div>
    </Modal>
  );
}
