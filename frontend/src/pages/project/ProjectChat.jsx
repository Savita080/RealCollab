// pages/project/ProjectChat.jsx — project-level chat (no whiteboard, no ws chat)
import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Send, Pencil, Trash2, Check, X, Pin, PinOff, Search } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { usePresence } from '../../lib/hooks';
import { chat as chatApi, projects as projectsApi, tasks as tasksApi } from '../../lib/api';
import { useChat } from '../../store/chat';
import { Avatar } from '../../components/ui/Badge';
import MentionInput from '../../components/ui/MentionInput';
import MessageBody from '../../components/ui/MessageBody';
import EmojiPickerButton from '../../components/ui/EmojiPickerButton';
import ReactionBar from '../../components/ui/ReactionBar';
import { ReplyButton, QuoteChip, ReplyPreview } from '../../components/ui/ReplyControls';
import rs from '../../styles/modules/ReplyControls.module.css';
import { fmtRelative } from '../../lib/utils';
import { emitTyping } from '../../lib/socket';
import socket from '../../lib/socket';
import s from '../../styles/modules/Chat.module.css';

export default function ProjectChat() {
  const { workspaceId, projectId, project } = useOutletContext();
  const { user } = useAuth();
  const { toast } = useUI();
  const clearUnread = useChat(s => s.clear);
  // Backend rooms are keyed by canonical _id, not the URL token (which may be a slug).
  const online = usePresence(project?._id);

  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reads, setReads] = useState([]); // [{ user: {_id,name,avatar}, lastReadAt }]
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null); // { _id, content, sender }
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const typingTimeoutRef = useRef(null);
  const typingEmitRef = useRef(null);
  const bottomRef = useRef(null);
  const messageRefs = useRef({}); // msgId → DOM node, for jump-to-original

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setLoading(true);
    chatApi.projectMessages(workspaceId, projectId)
      .then(({ data }) => {
        setMessages(data.messages ?? data ?? []);
        setReads(data.reads ?? []);
      })
      .catch(() => toast('Failed to load chat', 'error'))
      .finally(() => setLoading(false));

    // Project chat @mentions are scoped to project members only — workspace
    // members who don't belong to the project shouldn't be tag-able from here.
    projectsApi.members(workspaceId, projectId)
      .then(({ data }) => setMembers(data.members ?? []))
      .catch(() => setMembers([]));
  }, [workspaceId, projectId]);

  // Realtime new messages. Socket events use the project's canonical _id, but
  // projectId from useParams may be a slug — compare against project._id.
  useEffect(() => {
    if (!projectId) return;
    const canonicalId = project?._id;
    const onNew = (msg) => {
      const msgProj = msg.project?._id || msg.project;
      if (msgProj !== canonicalId && msgProj !== projectId) return;
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        const senderId = msg.sender?._id || msg.sender;
        const tempIdx = prev.findIndex(m => m._optimistic && m.content === msg.content && (m.sender?._id || m.sender) === senderId);
        if (tempIdx !== -1) {
          const next = [...prev];
          next[tempIdx] = msg;
          return next;
        }
        return [...prev, msg];
      });
    };
    const onReaction = ({ scope, messageId, reactions }) => {
      if (scope !== 'project') return;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    };
    const onEdited = ({ scope, message }) => {
      if (scope !== 'project') return;
      setMessages(prev => prev.map(m => m._id === message._id ? message : m));
    };
    const onDeleted = ({ scope, messageId }) => {
      if (scope !== 'project') return;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deletedAt: new Date().toISOString(), content: '' } : m));
    };
    const onPinned = ({ scope, message }) => {
      if (scope !== 'project') return;
      setMessages(prev => prev.map(m => m._id === message._id ? message : m));
    };
    const onLinkPreview = ({ scope, messageId, linkPreview }) => {
      if (scope !== 'project') return;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, linkPreview } : m));
    };
    const onRead = ({ scope, projectId: pid, user: u, lastReadAt }) => {
      if (scope !== 'project' || (pid !== canonicalId && pid !== projectId)) return;
      setReads(prev => {
        const idx = prev.findIndex(r => (r.user?._id || r.user) === (u?._id || u));
        const entry = { user: u, lastReadAt };
        if (idx === -1) return [...prev, entry];
        const next = [...prev];
        next[idx] = entry;
        return next;
      });
    };
    const onTyping = ({ projectId: pid, userName }) => {
      if ((pid === canonicalId || pid === projectId) && userName !== user?.name) {
        setTypingUser(userName);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2500);
      }
    };
    socket.on('new_group_message', onNew);
    socket.on('message_reaction_updated', onReaction);
    socket.on('user_typing', onTyping);
    socket.on('message_edited', onEdited);
    socket.on('message_deleted', onDeleted);
    socket.on('chat_read', onRead);
    socket.on('message_pinned', onPinned);
    socket.on('message_link_preview', onLinkPreview);
    return () => {
      socket.off('new_group_message', onNew);
      socket.off('message_reaction_updated', onReaction);
      socket.off('user_typing', onTyping);
      socket.off('message_edited', onEdited);
      socket.off('message_deleted', onDeleted);
      socket.off('chat_read', onRead);
      socket.off('message_pinned', onPinned);
      socket.off('message_link_preview', onLinkPreview);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [projectId, project?._id, user?.name]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark chat as read when this page is open + tab focused. Debounced so a
  // burst of incoming messages only triggers one POST. Re-runs on each new
  // message so the seen-by row stays current as the conversation scrolls.
  useEffect(() => {
    if (!workspaceId || !projectId || loading || messages.length === 0) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const t = setTimeout(() => {
      chatApi.markProjectRead(workspaceId, projectId).catch(() => {});
      if (project?._id) clearUnread(project._id);
    }, 500);
    return () => clearTimeout(t);
  }, [workspaceId, projectId, loading, messages.length, project?._id]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    const replyTo = replyingTo;
    const replyToId = replyTo?._id;
    setInput('');
    setReplyingTo(null);

    // Slash command: /task <title> creates a Kanban task and posts a chat
    // record with a link to the new card. Priority hint: trailing !p0/!p1/!p2.
    const taskMatch = text.match(/^\/task\s+(.+)$/i);
    if (taskMatch) {
      let title = taskMatch[1].trim();
      let priority = 'P2';
      const pri = title.match(/\s+!(p[012])\s*$/i);
      if (pri) {
        priority = pri[1].toUpperCase();
        title = title.slice(0, pri.index).trim();
      }
      try {
        const { data } = await tasksApi.create(workspaceId, projectId, { title, priority });
        const task = data.task ?? data;
        const taskUrl = `/workspaces/${workspaceId}/projects/${projectId}/kanban`;
        await chatApi.sendProject(workspaceId, projectId, {
          content: `📌 Created task: **${title}** (${priority}) → [open kanban](${window.location.origin}${taskUrl}) · id: ${task._id}`,
        });
        toast(`Task "${title}" created`, 'success');
      } catch {
        setInput(text);
        toast('Failed to create task', 'error');
      }
      return;
    }

    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic = {
      _id: tempId,
      _optimistic: true,
      content: text,
      sender: { _id: user?.id || user?._id, name: user?.name, avatar: user?.avatar },
      createdAt: new Date().toISOString(),
      reactions: [],
      ...(replyTo ? { replyTo: { _id: replyTo._id, content: replyTo.content, sender: replyTo.sender } } : {}),
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      const { data } = await chatApi.sendProject(workspaceId, projectId, {
        content: text,
        ...(replyToId ? { replyTo: replyToId } : {}),
      });
      const msg = data.chatMessage ?? data;
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev.filter(m => m._id !== tempId);
        return prev.map(m => m._id === tempId ? msg : m);
      });
    } catch {
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setInput(text);
      if (replyTo) setReplyingTo(replyTo);
      toast('Failed to send', 'error');
    }
  };

  // Jump to + flash-highlight an original message when its quote chip is clicked.
  const jumpToMessage = (msgId) => {
    const el = messageRefs.current[msgId];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add(rs.highlight);
    setTimeout(() => el.classList.remove(rs.highlight), 1500);
  };

  // Esc cancels the active reply
  useEffect(() => {
    if (!replyingTo) return;
    const onKey = (e) => { if (e.key === 'Escape') setReplyingTo(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [replyingTo]);

  const isMe = (m) => {
    const id = m.sender?._id ?? m.sender;
    return id === user?.id || id === user?._id;
  };

  const myId = user?.id || user?._id;
  const handleReact = async (msgId, emoji) => {
    // Optimistic update — server broadcast will reconcile
    setMessages(prev => prev.map(m => {
      if (m._id !== msgId) return m;
      const reactions = [...(m.reactions || [])];
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
      return { ...m, reactions };
    }));
    try { await chatApi.reactProject(workspaceId, projectId, msgId, emoji); }
    catch { toast('Failed to react', 'error'); }
  };

  const startEdit = (m) => {
    setEditingId(m._id);
    setEditingText(m.content);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };
  const saveEdit = async () => {
    const text = editingText.trim();
    if (!text || !editingId) return cancelEdit();
    const id = editingId;
    const original = messages.find(m => m._id === id);
    if (!original || original.content === text) return cancelEdit();
    setMessages(prev => prev.map(m => m._id === id ? { ...m, content: text, editedAt: new Date().toISOString() } : m));
    setEditingId(null);
    setEditingText('');
    try { await chatApi.editProject(workspaceId, projectId, id, text); }
    catch {
      setMessages(prev => prev.map(m => m._id === id ? original : m));
      toast('Failed to edit', 'error');
    }
  };
  const handleTogglePin = async (msg) => {
    const id = msg._id;
    const wasPinned = !!msg.pinned;
    setMessages(prev => prev.map(m => m._id === id ? { ...m, pinned: !wasPinned, pinnedAt: !wasPinned ? new Date().toISOString() : null } : m));
    try { await chatApi.togglePin(workspaceId, projectId, id); }
    catch {
      setMessages(prev => prev.map(m => m._id === id ? { ...m, pinned: wasPinned } : m));
      toast('Failed to pin', 'error');
    }
  };
  const handleDelete = async (msgId) => {
    if (!confirm('Delete this message?')) return;
    const original = messages.find(m => m._id === msgId);
    setMessages(prev => prev.map(m => m._id === msgId ? { ...m, deletedAt: new Date().toISOString(), content: '' } : m));
    try { await chatApi.deleteProject(workspaceId, projectId, msgId); }
    catch {
      if (original) setMessages(prev => prev.map(m => m._id === msgId ? original : m));
      toast('Failed to delete', 'error');
    }
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>{project?.name || 'Project'} Chat</h1>
          <p className={s.subtitle}>
            {online.length > 0 ? `${online.length} online` : 'Project conversation'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setSearchOpen(o => !o)}
              title="Search messages"
              style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center' }}
            >
              <Search size={14} />
            </button>
            {searchOpen && (
              <div style={{ position: 'absolute', top: '110%', right: 0, width: 320, background: 'var(--bg-dropdown, var(--bg-card, #fff))', color: 'var(--text-1)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, zIndex: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.18)' }}>
                <input
                  autoFocus
                  type="text"
                  placeholder="Search messages…"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQ(''); } }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2, transparent)', color: 'var(--text-1)', font: 'inherit', marginBottom: 6 }}
                />
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {searchQ.trim() === '' ? (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '4px 2px' }}>Type to search this chat</div>
                  ) : (() => {
                    const q = searchQ.toLowerCase();
                    const hits = messages.filter(m => !m.deletedAt && (m.content || '').toLowerCase().includes(q)).slice(-30).reverse();
                    if (hits.length === 0) return <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '4px 2px' }}>No matches</div>;
                    return hits.map(h => (
                      <button
                        key={h._id}
                        onClick={() => { setSearchOpen(false); setSearchQ(''); jumpToMessage(h._id); }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '6px 4px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                      >
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{h.sender?.name || 'Unknown'} · {fmtRelative(h.createdAt)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.content}</div>
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
          {online.slice(0, 5).map(u => (
            <Avatar key={u._id || u.userId} name={u.name} src={u.avatar} online size={26} />
          ))}
          <span className={s.livePill}>● LIVE</span>
        </div>
      </div>

      {(() => {
        const pinned = messages.filter(m => m.pinned && !m.deletedAt);
        if (pinned.length === 0) return null;
        return (
          <div style={{ borderBottom: '1px solid var(--border)', padding: '6px 12px', background: 'var(--bg-2, rgba(0,0,0,0.04))', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              <Pin size={11} /> Pinned ({pinned.length})
            </div>
            {pinned.slice(0, 3).map(p => (
              <button
                key={p._id}
                onClick={() => jumpToMessage(p._id)}
                style={{ background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--text-2)', fontSize: 12, padding: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title="Jump to message"
              >
                <strong style={{ marginRight: 6 }}>{p.sender?.name || 'Unknown'}:</strong>
                {p.content}
              </button>
            ))}
            {pinned.length > 3 && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>+{pinned.length - 3} more pinned</div>}
          </div>
        );
      })()}

      <div className={s.messages}>
        {loading && <p className={s.empty}>Loading messages…</p>}
        {!loading && messages.length === 0 && <p className={s.empty}>No messages yet. Say hello!</p>}
        {messages.map((m, i) => {
          const mine = isMe(m);
          const senderName = m.sender?.name ?? 'Unknown';
          const prevSenderId = messages[i - 1]?.sender?._id ?? messages[i - 1]?.sender;
          const thisSenderId = m.sender?._id ?? m.sender;
          const showName = !mine && (i === 0 || prevSenderId !== thisSenderId);
          return (
            <div
              key={m._id ?? i}
              ref={el => { if (m._id) messageRefs.current[m._id] = el; }}
              className={`${s.msgGroup} ${mine ? s.mine : ''}`}
            >
              {showName && (
                <div className={s.senderMeta}>
                  <Avatar name={senderName} src={m.sender?.avatar} size={20} />
                  <span className={s.senderName}>{senderName}</span>
                </div>
              )}
              <div className={s.bubble}>
                <QuoteChip replyTo={m.replyTo} mine={mine} onJump={jumpToMessage} />
                {m.deletedAt ? (
                  <span className={s.msgText} style={{ fontStyle: 'italic', opacity: 0.6 }}>
                    [message deleted]
                  </span>
                ) : editingId === m._id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <textarea
                      autoFocus
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                        if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                      }}
                      rows={Math.min(4, editingText.split('\n').length)}
                      style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: 6, color: 'inherit', font: 'inherit', resize: 'vertical', minWidth: 200 }}
                    />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={cancelEdit} title="Cancel" style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', color: 'inherit' }}>
                        <X size={12} />
                      </button>
                      <button type="button" onClick={saveEdit} title="Save (Enter)" style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', color: '#fff' }}>
                        <Check size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className={s.msgText}><MessageBody text={m.content} /></span>
                )}
                {m.linkPreview?.url && !m.deletedAt && editingId !== m._id && (
                  <a
                    href={m.linkPreview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginTop: 6,
                      padding: 8,
                      borderRadius: 8,
                      background: 'rgba(0,0,0,0.06)',
                      border: '1px solid var(--border)',
                      textDecoration: 'none',
                      color: 'inherit',
                      maxWidth: 360,
                      alignItems: 'flex-start',
                    }}
                  >
                    {m.linkPreview.image && (
                      <img
                        src={m.linkPreview.image}
                        alt=""
                        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {m.linkPreview.siteName && (
                        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                          {m.linkPreview.siteName}
                        </div>
                      )}
                      {m.linkPreview.title && (
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {m.linkPreview.title}
                        </div>
                      )}
                      {m.linkPreview.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {m.linkPreview.description}
                        </div>
                      )}
                    </div>
                  </a>
                )}
                <span className={s.msgTime}>
                  {fmtRelative(m.createdAt)}
                  {m.editedAt && !m.deletedAt && <span style={{ marginLeft: 4, opacity: 0.7 }}>(edited)</span>}
                </span>
              </div>
              {!m.deletedAt && editingId !== m._id && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ReactionBar
                    reactions={m.reactions}
                    currentUserId={myId}
                    members={members}
                    onToggle={(emoji) => handleReact(m._id, emoji)}
                  />
                  <ReplyButton onClick={() => setReplyingTo(m)} />
                  {!m._optimistic && (
                    <button type="button" onClick={() => handleTogglePin(m)} title={m.pinned ? 'Unpin' : 'Pin'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: m.pinned ? 'var(--amber, #f59e0b)' : 'var(--text-3)', padding: 2, display: 'flex', alignItems: 'center' }}>
                      {m.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                    </button>
                  )}
                  {mine && !m._optimistic && (
                    <>
                      <button type="button" onClick={() => startEdit(m)} title="Edit" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, display: 'flex', alignItems: 'center' }}>
                        <Pencil size={12} />
                      </button>
                      <button type="button" onClick={() => handleDelete(m._id)} title="Delete" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {(() => {
          // Show "Seen by" avatars for users who've read past the latest message.
          // Skip self; only show when there's a latest message.
          const last = [...messages].reverse().find(m => !m.deletedAt);
          if (!last) return null;
          const lastTime = new Date(last.createdAt).getTime();
          const seers = (reads || []).filter(r => {
            const uid = r.user?._id || r.user;
            if (!uid || uid === myId) return false;
            return new Date(r.lastReadAt).getTime() >= lastTime;
          });
          if (seers.length === 0) return null;
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, padding: '0 8px 4px', fontSize: 10, color: 'var(--text-3)' }}>
              <span>Seen</span>
              {seers.slice(0, 4).map(r => (
                <Avatar key={r.user?._id || r.user} name={r.user?.name} src={r.user?.avatar} size={14} />
              ))}
              {seers.length > 4 && <span>+{seers.length - 4}</span>}
            </div>
          );
        })()}
        <div ref={bottomRef} />
      </div>

      {typingUser && (
        <div style={{ padding: '4px 8px', fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
          {typingUser} is typing…
        </div>
      )}

      <ReplyPreview replyingTo={replyingTo} onCancel={() => setReplyingTo(null)} />
      <form className={s.inputRow} onSubmit={send}>
        <MentionInput
          className={s.mentionWrap}
          inputClassName={s.input}
          placeholder={replyingTo ? `Reply to ${replyingTo.sender?.name || 'message'}…` : `Message ${project?.name || 'project'}… (@ to mention, /task to create)`}
          value={input}
          members={members}
          onChange={e => {
            setInput(e.target.value);
            if (project?._id && user?.name && !typingEmitRef.current) {
              emitTyping(project._id, user.name);
              typingEmitRef.current = setTimeout(() => { typingEmitRef.current = null; }, 2000);
            }
          }}
        />
        <EmojiPickerButton
          className={s.sendBtn}
          title="Insert emoji"
          onSelect={(emoji) => setInput(prev => prev + emoji)}
        >
          😊
        </EmojiPickerButton>
        <button type="submit" className={s.sendBtn} disabled={!input.trim()} title="Send">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
