// pages/workspace/WorkspaceChat.jsx — Workspace-wide chat
import { useEffect, useState, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { chat as chatApi, workspaces as wsApi } from '../../lib/api';
import socket from '../../lib/socket';
import MentionInput from '../../components/ui/MentionInput';
import { Avatar } from '../../components/ui/Badge';
import { fmtRelative } from '../../lib/utils';
import s from '../../styles/modules/Collab.module.css';

export default function WorkspaceChat() {
  const { workspaceId } = useParams();
  const ctx = useOutletContext();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  // Load workspace members for @mention autocomplete
  useEffect(() => {
    if (!workspaceId) return;
    wsApi.members(workspaceId)
      .then(({ data }) => setMembers(data.members ?? []))
      .catch(() => setMembers([]));
  }, [workspaceId]);

  // Load chat history
  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    chatApi.workspaceMessages(workspaceId)
      .then(({ data }) => setMessages(data.messages ?? data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  // Live socket: workspace chat messages (correct event name: new_workspace_message)
  useEffect(() => {
    const onMsg = (msg) => {
      const wsId = msg.workspace?._id ?? msg.workspace;
      if (wsId !== workspaceId) return;
      setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
    };
    socket.on('new_workspace_message', onMsg);
    return () => socket.off('new_workspace_message', onMsg);
  }, [workspaceId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    try {
      const { data } = await chatApi.sendWorkspace(workspaceId, { content: text });
      const msg = data.chatMessage ?? data;
      setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
    } catch { setInput(text); }
  };

  const isMe = (msg) => {
    const id = msg.sender?._id ?? msg.sender;
    return id === user?.id || id === user?._id;
  };

  return (
    <div className={s.page} style={{ height: 'calc(100vh - 56px)' }}>
      <div className={s.header}>
        <h1 className={s.title}>Workspace Chat</h1>
      </div>
      <div className={s.body} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className={s.chatFull} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className={s.chatHeader}>
            Workspace Chat
            <span className={s.livePill}>● LIVE</span>
          </div>
          <div className={s.messages} style={{ flex: 1 }}>
            {loading && <p className={s.noMsg}>Loading messages…</p>}
            {!loading && messages.length === 0 && (
              <p className={s.noMsg}>No messages yet. Say hello! 👋</p>
            )}
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
          <form className={s.inputRow} onSubmit={sendMessage}>
            <MentionInput
              className={s.mentionWrap}
              inputClassName={s.chatInput}
              placeholder="Message workspace… (use @ to mention)"
              value={input}
              members={members}
              autoFocus
              onChange={e => setInput(e.target.value)}
            />
            <button type="submit" className={s.sendBtn} disabled={!input.trim()}>↑</button>
          </form>
        </div>
      </div>
    </div>
  );
}
