// pages/Collab.jsx
import { useEffect, useState, useRef } from 'react';
import { useWorkspace } from '../store/workspace';
import { useAuth } from '../store/auth';
import { usePresence } from '../lib/hooks';
import { joinProject, leaveProject } from '../lib/socket';
import socket from '../lib/socket';
import { chat as chatApi } from '../lib/api';
import { Avatar } from '../components/ui/Badge';
import { fmtRelative } from '../lib/utils';
import s from './Collab.module.css';

export default function Collab() {
  const { current: ws, currentProject } = useWorkspace();
  const { user } = useAuth();
  const online = usePresence(currentProject?._id);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Load history + join room
  useEffect(() => {
    if (!currentProject || !ws) return;
    setMessages([]);
    setLoading(true);
    chatApi.projectMessages(ws._id, currentProject._id)
      .then(({ data }) => setMessages(data.messages ?? data))
      .catch(() => {})
      .finally(() => setLoading(false));

    joinProject(currentProject._id);
    return () => leaveProject(currentProject._id);
  }, [currentProject?._id, ws?._id]);

  // Live socket: append incoming messages
  useEffect(() => {
    const onMsg = (msg) => {
      // Only append if it's for current project
      if (msg.project === currentProject?._id || msg.project?._id === currentProject?._id) {
        setMessages(prev => {
          // Avoid duplicate if server echoes back a message we already added optimistically
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };
    socket.on('new_group_message', onMsg);
    return () => socket.off('new_group_message', onMsg);
  }, [currentProject?._id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentProject || !ws) return;
    const text = input.trim();
    setInput('');
    try {
      const { data } = await chatApi.sendProject(ws._id, currentProject._id, { content: text });
      const msg = data.chatMessage ?? data;
      // Add optimistically (socket broadcast comes back too, deduped above)
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    } catch {
      setInput(text); // restore on error
    }
  };

  const isMe = (msg) => {
    const senderId = msg.sender?._id || msg.sender;
    return senderId === user?.id || senderId === user?._id;
  };

  if (!currentProject) return <div className={s.empty}>Select a project to enter the collab room.</div>;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Live Collab — {currentProject.name}</h1>
        <div className={s.presence}>
          {online.map(u => <Avatar key={u._id} name={u.name} online size={32} />)}
          <span className={s.onlineLabel}>{online.length} online</span>
        </div>
      </div>

      <div className={s.body}>
        {/* Chat */}
        <div className={s.chat}>
          <div className={s.chatHeader}>
            Project Chat
            <span className={s.livePill}>● LIVE</span>
          </div>
          <div className={s.messages}>
            {loading && <p className={s.noMsg}>Loading messages…</p>}
            {!loading && messages.length === 0 && (
              <p className={s.noMsg}>No messages yet. Say hello! 👋</p>
            )}
            {messages.map((m, i) => {
              const mine = isMe(m);
              const senderName = m.sender?.name || 'Unknown';
              const showName = !mine && (i === 0 || (messages[i - 1]?.sender?._id || messages[i - 1]?.sender) !== (m.sender?._id || m.sender));
              return (
                <div key={m._id || i} className={`${s.msgGroup} ${mine ? s.mine : ''}`}>
                  {!mine && showName && (
                    <div className={s.senderMeta}>
                      <Avatar name={senderName} size={22} />
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
          <form className={s.inputRow} onSubmit={send}>
            <input
              className={s.chatInput}
              placeholder="Type a message…"
              value={input}
              onChange={e => setInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className={s.sendBtn} disabled={!input.trim()}>↑</button>
          </form>
        </div>

        {/* Whiteboard placeholder */}
        <div className={s.whiteboard}>
          <div className={s.wbHeader}>
            <span>Whiteboard</span>
            <span className={s.wbBadge}>Socket.IO + Redis</span>
          </div>
          <div className={s.wbCanvas}>
            <span>🎨</span>
            <p>Collaborative whiteboard via Excalidraw.</p>
            <code className={s.wbNote}>Canvas state synced in real-time via Socket.IO.</code>
            <p className={s.wbSub}>Install Excalidraw to activate: <code>npm install @excalidraw/excalidraw</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
