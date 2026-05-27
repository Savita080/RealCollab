// pages/workspace/WorkspaceChat.jsx — workspace-level chat (no project context)
import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Send } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { chat as chatApi, workspaces as wsApi } from '../../lib/api';
import { Avatar } from '../../components/ui/Badge';
import MentionInput from '../../components/ui/MentionInput';
import EmojiPickerButton from '../../components/ui/EmojiPickerButton';
import ReactionBar from '../../components/ui/ReactionBar';
import { ReplyButton, QuoteChip, ReplyPreview } from '../../components/ui/ReplyControls';
import rs from '../../styles/modules/ReplyControls.module.css';
import { fmtRelative } from '../../lib/utils';
import socket from '../../lib/socket';
import { joinWorkspace, leaveWorkspace } from '../../lib/socket';
import s from '../../styles/modules/Chat.module.css';

export default function WorkspaceChat() {
  const { workspaceId, workspace } = useOutletContext();
  const { user } = useAuth();
  const { toast } = useUI();

  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const typingTimeoutRef = useRef(null);
  const typingEmitRef = useRef(null);
  const bottomRef = useRef(null);
  const messageRefs = useRef({});

  // Join workspace socket room + load history. Socket rooms are keyed by
  // canonical _id, so use workspace?._id (slug from URL won't match the room).
  useEffect(() => {
    if (!workspaceId) return;
    const roomId = workspace?._id;
    if (roomId) joinWorkspace(roomId);
    setLoading(true);
    chatApi.workspaceMessages(workspaceId)
      .then(({ data }) => setMessages(data.messages ?? data ?? []))
      .catch(() => toast('Failed to load chat', 'error'))
      .finally(() => setLoading(false));

    wsApi.members(workspaceId)
      .then(({ data }) => setMembers(data.members ?? []))
      .catch(() => setMembers([]));

    return () => { if (roomId) leaveWorkspace(roomId); };
  }, [workspaceId, workspace?._id]);

  // Realtime new messages + typing
  useEffect(() => {
    if (!workspaceId) return;
    const canonicalId = workspace?._id;
    const onNew = (msg) => {
      setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
    };
    const onReaction = ({ scope, messageId, reactions }) => {
      if (scope !== 'workspace') return;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    };
    const onTyping = ({ workspaceId: wsId, userName }) => {
      // Payload carries canonical _id; URL token may be slug — accept both.
      if ((wsId === canonicalId || wsId === workspaceId) && userName !== user?.name) {
        setTypingUser(userName);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2500);
      }
    };
    socket.on('new_workspace_message', onNew);
    socket.on('message_reaction_updated', onReaction);
    socket.on('workspace_user_typing', onTyping);
    return () => {
      socket.off('new_workspace_message', onNew);
      socket.off('message_reaction_updated', onReaction);
      socket.off('workspace_user_typing', onTyping);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [workspaceId, workspace?._id, user?.name]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    const replyToId = replyingTo?._id;
    setInput('');
    setReplyingTo(null);
    try {
      const { data } = await chatApi.sendWorkspace(workspaceId, {
        content: text,
        ...(replyToId ? { replyTo: replyToId } : {}),
      });
      const msg = data.chatMessage ?? data;
      setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
    } catch {
      setInput(text);
      if (replyToId) setReplyingTo(replyingTo);
      toast('Failed to send', 'error');
    }
  };

  const jumpToMessage = (msgId) => {
    const el = messageRefs.current[msgId];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add(rs.highlight);
    setTimeout(() => el.classList.remove(rs.highlight), 1500);
  };

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
    try { await chatApi.reactWorkspace(workspaceId, msgId, emoji); }
    catch { toast('Failed to react', 'error'); }
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>{workspace?.name || 'Workspace'} Chat</h1>
          <p className={s.subtitle}>Workspace-wide conversation · {members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <span className={s.livePill}>● LIVE</span>
      </div>

      <div className={s.messages}>
        {loading && <p className={s.empty}>Loading messages…</p>}
        {!loading && messages.length === 0 && (
          <p className={s.empty}>No messages yet. Say hello!</p>
        )}
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
                <span className={s.msgText}>{m.content}</span>
                <span className={s.msgTime}>{fmtRelative(m.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ReactionBar
                  reactions={m.reactions}
                  currentUserId={myId}
                  members={members}
                  onToggle={(emoji) => handleReact(m._id, emoji)}
                />
                <ReplyButton onClick={() => setReplyingTo(m)} />
              </div>
            </div>
          );
        })}
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
          placeholder={replyingTo ? `Reply to ${replyingTo.sender?.name || 'message'}…` : `Message ${workspace?.name || 'workspace'}… (use @ to mention)`}
          value={input}
          members={members}
          onChange={e => {
            setInput(e.target.value);
            const emitId = workspace?._id || workspaceId;
            if (emitId && user?.name && !typingEmitRef.current) {
              socket.emit('workspace_typing', { workspaceId: emitId, userName: user.name });
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
