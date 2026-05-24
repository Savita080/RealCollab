// components/kanban/TaskDetail.jsx
import { useState, useEffect, useRef } from 'react';
import { useTasks } from '../../store/tasks';
import { useWorkspace } from '../../store/workspace';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { tasks as tasksApi, notifications as notifApi, workspaces as wsApi } from '../../lib/api';
import socket from '../../lib/socket';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, Textarea, Select } from '../ui/Input';
import { PriorityChip, Avatar } from '../ui/Badge';
import { fmtDate, fmtRelative } from '../../lib/utils';
import s from './TaskDetail.module.css';

export default function TaskDetail({ task, onClose }) {
  const { update, delete: deleteTask } = useTasks();
  const { current: ws, currentProject } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useUI();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority || 'P1',
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
  });
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [members, setMembers] = useState([]);
  const commentsEndRef = useRef(null);

  // Load existing comments on mount
  useEffect(() => {
    tasksApi.comments(task._id)
      .then(({ data }) => setComments(data.comments ?? data))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [task._id]);

  // Load workspace members for @mention resolution
  useEffect(() => {
    if (!ws) return;
    wsApi.members(ws._id)
      .then(({ data }) => setMembers(data.members ?? []))
      .catch(() => {});
  }, [ws?._id]);

  // Live: listen for comments added/deleted in this project room
  useEffect(() => {
    const onAdded = (c) => {
      if (c.task === task._id || c.task?._id === task._id) {
        setComments(prev => [...prev, c]);
      }
    };
    const onDeleted = ({ commentId, taskId }) => {
      if (taskId === task._id || taskId?.toString() === task._id) {
        setComments(prev => prev.filter(c => c._id !== commentId));
      }
    };
    socket.on('task_comment_added', onAdded);
    socket.on('task_comment_deleted', onDeleted);
    return () => {
      socket.off('task_comment_added', onAdded);
      socket.off('task_comment_deleted', onDeleted);
    };
  }, [task._id]);

  // Scroll to bottom when comments update
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSave = async () => {
    try {
      await update(ws._id, currentProject._id, task._id, form);
      toast('Task updated', 'success');
      setEditing(false);
    } catch {
      toast('Failed to update task', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(ws._id, currentProject._id, task._id);
    toast('Task deleted', 'info');
    onClose();
  };

  // Detect @mentions and fire notifications
  const detectMentions = async (content) => {
    const mentionPattern = /@(\w+)/g;
    let match;
    while ((match = mentionPattern.exec(content)) !== null) {
      const mentionedName = match[1].toLowerCase();
      const mentioned = members.find(m =>
        (m.user?.name || '').toLowerCase().replace(/\s+/g, '') === mentionedName
      );
      if (mentioned && mentioned.user?._id !== user?.id) {
        try {
          await notifApi.create({
            recipientId: mentioned.user._id,
            type: 'MENTION',
            content: `${user?.name || 'Someone'} mentioned you in a comment on task "${task.title}"`,
            link: `/kanban`,
          });
        } catch (_) {}
      }
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const { data } = await tasksApi.comment(task._id, {
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
      await tasksApi.deleteComment(task._id, commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch {
      toast('Failed to delete comment', 'error');
    }
  };

  return (
    <Modal open onClose={onClose} title="Task Detail" size="lg">
      <div className={s.body}>
        {/* Title */}
        {editing ? (
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        ) : (
          <h2 className={s.title}>{task.title}</h2>
        )}

        {/* Meta row */}
        <div className={s.meta}>
          <PriorityChip priority={task.priority} />
          <span className={s.status}>{task.status}</span>
          {task.dueDate && <span className={s.due}>Due {fmtDate(task.dueDate)}</span>}
          {task.labels?.length > 0 && (
            <div className={s.labels}>
              {task.labels.map(l => <span key={l} className={s.label}>{l}</span>)}
            </div>
          )}
        </div>

        {/* Description */}
        <div className={s.section}>
          <span className={s.sLabel}>Description</span>
          {editing ? (
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          ) : (
            <p className={s.desc}>{task.description || <em>No description</em>}</p>
          )}
        </div>

        {/* Edit fields */}
        {editing && (
          <div className={s.editFields}>
            <Select label="Priority" value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              options={['P0', 'P1', 'P2']} />
            <Input label="Due date" type="date" value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
        )}

        {/* Actions */}
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
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
          <form onSubmit={submitComment} className={s.commentForm}>
            <Input
              placeholder="Add a comment… @name to notify someone"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
            <Button type="submit" variant="ghost" size="sm">Post</Button>
          </form>
        </div>
      </div>
    </Modal>
  );
}
