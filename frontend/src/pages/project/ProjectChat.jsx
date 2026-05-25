// pages/project/ProjectChat.jsx — project-level chat (no whiteboard, no ws chat)
import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Send } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { usePresence } from '../../lib/hooks';
import { chat as chatApi, workspaces as wsApi } from '../../lib/api';
import { Avatar } from '../../components/ui/Badge';
import MentionInput from '../../components/ui/MentionInput';
import { fmtRelative } from '../../lib/utils';
import { emitTyping } from '../../lib/socket';
import socket from '../../lib/socket';
import s from '../../styles/modules/Chat.module.css';

export default function ProjectChat() {
  const { workspaceId, projectId, project } = useOutletContext();
  const { user } = useAuth();
  const { toast } = useUI();
  const online = usePresence(projectId);

  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);
  const typingEmitRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setLoading(true);
    chatApi.projectMessages(workspaceId, projectId)
      .then(({ data }) => setMessages(data.messages ?? data ?? []))
      .catch(() => toast('Failed to load chat', 'error'))
      .finally(() => setLoading(false));

    wsApi.members(workspaceId)
      .then(({ data }) => setMembers(data.members ?? []))
      .catch(() => setMembers([]));
  }, [workspaceId, projectId]);

  // Realtime new messages
  useEffect(() => {
    if (!projectId) return;
    const onNew = (msg) => {
      if (msg.project === projectId || msg.project?._id === projectId) {
        setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
      }
    };
    const onTyping = ({ projectId: pid, userName }) => {
      if (pid === projectId && userName !== user?.name) {
        setTypingUser(userName);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2500);
      }
    };
    socket.on('new_message', onNew);
    socket.on('typing', onTyping);
    return () => {
      socket.off('new_message', onNew);
      socket.off('typing', onTyping);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [projectId, user?.name]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    try {
      const { data } = await chatApi.sendProject(workspaceId, projectId, { content: text });
      const msg = data.chatMessage ?? data;
      setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
    } catch {
      setInput(text);
      toast('Failed to send', 'error');
    }
  };

  const isMe = (m) => {
    const id = m.sender?._id ?? m.sender;
    return id === user?.id || id === user?._id;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {online.slice(0, 5).map(u => (
            <Avatar key={u._id || u.userId} name={u.name} online size={26} />
          ))}
          <span className={s.livePill}>● LIVE</span>
        </div>
      </div>

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
            <div key={m._id ?? i} className={`${s.msgGroup} ${mine ? s.mine : ''}`}>
              {showName && (
                <div className={s.senderMeta}>
                  <Avatar name={senderName} size={20} />
                  <span className={s.senderName}>{senderName}</span>
                </div>
              )}
              <div className={s.bubble}>
                <span className={s.msgText}>{m.content}</span>
                <span className={s.msgTime}>{fmtRelative(m.createdAt)}</span>
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

      <form className={s.inputRow} onSubmit={send}>
        <MentionInput
          className={s.mentionWrap}
          inputClassName={s.input}
          placeholder={`Message ${project?.name || 'project'}… (use @ to mention)`}
          value={input}
          members={members}
          onChange={e => {
            setInput(e.target.value);
            if (projectId && user?.name && !typingEmitRef.current) {
              emitTyping(projectId, user.name);
              typingEmitRef.current = setTimeout(() => { typingEmitRef.current = null; }, 2000);
            }
          }}
        />
        <button type="submit" className={s.sendBtn} disabled={!input.trim()} title="Send">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
