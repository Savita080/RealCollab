// pages/Collab.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useWorkspace } from '../store/workspace';
import { useAuth } from '../store/auth';
import { usePresence } from '../lib/hooks';
import {
  joinProject, leaveProject,
  joinWhiteboard, leaveWhiteboard,
  emitDraw, emitSaveWb
} from '../lib/socket';
import socket from '../lib/socket';
import { chat as chatApi } from '../lib/api';
import { Avatar } from '../components/ui/Badge';
import { fmtRelative } from '../lib/utils';
import { Excalidraw } from '@excalidraw/excalidraw';
import s from './Collab.module.css';

// ─── Import Excalidraw's own CSS (required for correct rendering) ────────────
import '@excalidraw/excalidraw/index.css';

export default function Collab() {
  const { current: ws, currentProject } = useWorkspace();
  const { user } = useAuth();
  const online = usePresence(currentProject?._id);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Whiteboard state
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const elementsRef = useRef([]);

  // ── Load history + join chat room ──────────────────────────────────────────
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

  // ── Join whiteboard room ────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentProject) return;
    joinWhiteboard(currentProject._id);
    return () => leaveWhiteboard(currentProject._id);
  }, [currentProject?._id]);

  // ── Live socket: incoming chat messages ────────────────────────────────────
  useEffect(() => {
    const onMsg = (msg) => {
      const projectId = msg.project?._id ?? msg.project;
      if (projectId !== currentProject?._id) return;
      setMessages(prev =>
        prev.some(m => m._id === msg._id) ? prev : [...prev, msg]
      );
    };
    socket.on('new_group_message', onMsg);
    return () => socket.off('new_group_message', onMsg);
  }, [currentProject?._id]);

  // ── Live socket: whiteboard events ─────────────────────────────────────────
  useEffect(() => {
    // Full sync on join (server sends saved state)
    const onSync = (elements) => {
      if (!Array.isArray(elements)) return;
      elementsRef.current = elements;
      setInitialData({ elements, scrollToContent: true });
    };

    // Incremental update from another user
    const onUpdate = (elements) => {
      if (!Array.isArray(elements) || !excalidrawAPI) return;
      excalidrawAPI.updateScene({ elements });
      elementsRef.current = elements;
    };

    socket.on('whiteboard_sync', onSync);
    socket.on('whiteboard_update', onUpdate);
    return () => {
      socket.off('whiteboard_sync', onSync);
      socket.off('whiteboard_update', onUpdate);
    };
  }, [excalidrawAPI]);

  // ── Auto-scroll chat ────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Send message ────────────────────────────────────────────────────────────
  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentProject || !ws) return;
    const text = input.trim();
    setInput('');
    try {
      const { data } = await chatApi.sendProject(ws._id, currentProject._id, { content: text });
      const msg = data.chatMessage ?? data;
      setMessages(prev =>
        prev.some(m => m._id === msg._id) ? prev : [...prev, msg]
      );
    } catch {
      setInput(text); // restore on failure
    }
  };

  const isMe = (msg) => {
    const id = msg.sender?._id ?? msg.sender;
    return id === user?.id || id === user?._id;
  };

  // ── Whiteboard change: emit while the user is actively drawing ─────────────
  const onWhiteboardChange = useCallback((elements, appState) => {
    if (
      appState.draggingElement ||
      appState.editingElement ||
      appState.resizingElement
    ) {
      emitDraw({ whiteboardId: currentProject._id, elements });
      elementsRef.current = elements;
    }
  }, [currentProject?._id]);

  // ── Periodic DB save every 10 seconds ──────────────────────────────────────
  useEffect(() => {
    if (!currentProject) return;
    const id = setInterval(() => {
      if (elementsRef.current?.length) {
        emitSaveWb({ whiteboardId: currentProject._id, elements: elementsRef.current });
      }
    }, 10_000);
    return () => clearInterval(id);
  }, [currentProject?._id]);

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!currentProject) {
    return <div className={s.empty}>Select a project to enter the collab room.</div>;
  }

  return (
    <div className={s.page}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={s.header}>
        <h1 className={s.title}>Live Collab — {currentProject.name}</h1>
        <div className={s.presence}>
          {online.map(u => (
            <Avatar key={u._id} name={u.name} online size={28} />
          ))}
          <span className={s.onlineLabel}>{online.length} online</span>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className={s.body}>

        {/* Chat ──────────────────────────────────────────────────────────── */}
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

          <form className={s.inputRow} onSubmit={send}>
            <input
              className={s.chatInput}
              placeholder="Type a message…"
              value={input}
              onChange={e => setInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className={s.sendBtn} disabled={!input.trim()}>
              ↑
            </button>
          </form>
        </div>

        {/* Whiteboard ────────────────────────────────────────────────────── */}
        <div className={s.whiteboard}>
          <div className={s.wbHeader}>
            <span>Whiteboard</span>
            <span className={s.wbBadge}>Socket.IO · Redis</span>
          </div>

          {/*
            KEY FIX:
            wbCanvas is `position: relative; flex: 1 1 0; overflow: hidden`
            The inner div is `position: absolute; inset: 0`
            This gives Excalidraw a concrete pixel size to measure against,
            which prevents it from rendering the giant lock placeholder.
          */}
          <div className={s.wbCanvas}>
            <div>
              <Excalidraw
                excalidrawAPI={(api) => setExcalidrawAPI(api)}
                initialData={initialData ?? { elements: [], scrollToContent: false }}
                onChange={onWhiteboardChange}
                theme="dark"
                UIOptions={{
                  canvasActions: {
                    saveToActiveFile: false,
                    loadScene: false,
                    export: false,
                  },
                }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}