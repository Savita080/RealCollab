// pages/workspace/project/ProjectChat.jsx — Project-level chat extracted from Collab.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../../store/auth';
import { usePresence } from '../../../lib/hooks';
import { emitTyping, joinWhiteboard, leaveWhiteboard, emitDraw, emitSaveWb } from '../../../lib/socket';
import socket from '../../../lib/socket';
import { chat as chatApi, whiteboards as wbApi } from '../../../lib/api';
import MentionInput from '../../../components/ui/MentionInput';
import { Avatar } from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { fmtRelative } from '../../../lib/utils';
import { useUI } from '../../../store/ui';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import s from '../../../styles/modules/Collab.module.css';

export default function ProjectChat() {
  const ctx = useOutletContext();
  const { workspaceId, projectId, project, wsMembers, canEdit } = ctx;
  const { user } = useAuth();
  const { toast } = useUI();
  const online = usePresence(projectId);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);
  const typingEmitRef = useRef(null);
  const bottomRef = useRef(null);
  const [showWb, setShowWb] = useState(false);

  // Whiteboard state
  const [whiteboards, setWhiteboards] = useState([]);
  const [activeWb, setActiveWb] = useState(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const elementsRef = useRef([]);
  const isRemoteUpdateRef = useRef(false);
  const drawThrottleRef = useRef(null);
  const activeWbRef = useRef(null);
  const [wbModal, setWbModal] = useState(false);
  const [newWbName, setNewWbName] = useState('');
  const saveIntervalRef = useRef(null);

  activeWbRef.current = activeWb;

  const saveWhiteboardNow = useCallback((wbId) => {
    const id = wbId ?? activeWbRef.current?._id;
    if (!id || !elementsRef.current?.length) return;
    emitSaveWb({ whiteboardId: id, elements: elementsRef.current });
  }, []);

  // Load messages
  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setLoading(true);
    chatApi.projectMessages(workspaceId, projectId)
      .then(({ data }) => setMessages(data.messages ?? data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  // Load whiteboards
  useEffect(() => {
    if (!workspaceId || !projectId) return;
    wbApi.list(workspaceId, projectId)
      .then(({ data }) => {
        const list = data.whiteboards ?? data;
        setWhiteboards(list);
        if (list.length && !activeWb) selectWhiteboard(list[0]);
      })
      .catch(() => {});
  }, [workspaceId, projectId]);

  // Socket: incoming project chat messages
  useEffect(() => {
    const onMsg = (msg) => {
      const pid = msg.project?._id ?? msg.project;
      if (pid !== projectId) return;
      setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
    };
    socket.on('new_group_message', onMsg);
    return () => socket.off('new_group_message', onMsg);
  }, [projectId]);

  // Socket: typing indicator
  useEffect(() => {
    const onTyping = ({ userName, projectId: pid }) => {
      if (pid !== projectId) return;
      setTypingUser(userName);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
    };
    socket.on('user_typing', onTyping);
    return () => { socket.off('user_typing', onTyping); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
  }, [projectId]);

  // Whiteboard socket events
  useEffect(() => {
    const applyRemoteElements = (elements) => {
      if (!Array.isArray(elements)) return;
      isRemoteUpdateRef.current = true;
      elementsRef.current = elements;
      setInitialData({ elements, scrollToContent: true });
      if (excalidrawAPI) excalidrawAPI.updateScene({ elements });
      requestAnimationFrame(() => { isRemoteUpdateRef.current = false; });
    };
    socket.on('whiteboard_sync', applyRemoteElements);
    socket.on('whiteboard_update', applyRemoteElements);
    return () => { socket.off('whiteboard_sync'); socket.off('whiteboard_update'); };
  }, [excalidrawAPI]);

  // Join/leave whiteboard room
  useEffect(() => {
    if (!activeWb) return;
    joinWhiteboard(activeWb._id);
    return () => { saveWhiteboardNow(activeWb._id); leaveWhiteboard(activeWb._id); if (saveIntervalRef.current) clearInterval(saveIntervalRef.current); };
  }, [activeWb?._id, saveWhiteboardNow]);

  // Auto-save whiteboard every 10s
  useEffect(() => {
    if (!activeWb) return;
    saveIntervalRef.current = setInterval(() => {
      if (elementsRef.current?.length) emitSaveWb({ whiteboardId: activeWb._id, elements: elementsRef.current });
    }, 10_000);
    return () => clearInterval(saveIntervalRef.current);
  }, [activeWb?._id]);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const selectWhiteboard = (wb) => {
    if (activeWb?._id === wb._id) return;
    if (activeWb) { saveWhiteboardNow(activeWb._id); leaveWhiteboard(activeWb._id); }
    setActiveWb(wb); setInitialData(null); elementsRef.current = [];
  };

  const createWhiteboard = async (e) => {
    e.preventDefault();
    try {
      const { data } = await wbApi.create(workspaceId, projectId, { name: newWbName || 'Untitled Whiteboard' });
      const wb = data.whiteboard ?? data;
      setWhiteboards(prev => [...prev, wb]);
      setNewWbName(''); setWbModal(false);
      selectWhiteboard(wb);
      toast('Whiteboard created!', 'success');
    } catch (err) { toast(err?.response?.data?.message || 'Failed', 'error'); }
  };

  const deleteWhiteboard = async (wb) => {
    if (!confirm(`Delete "${wb.name}"?`)) return;
    try {
      await wbApi.delete(workspaceId, projectId, wb._id);
      const remaining = whiteboards.filter(w => w._id !== wb._id);
      setWhiteboards(remaining);
      if (activeWb?._id === wb._id) {
        if (remaining.length) selectWhiteboard(remaining[0]);
        else { setActiveWb(null); setInitialData(null); }
      }
    } catch { toast('Failed to delete', 'error'); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    try {
      const { data } = await chatApi.sendProject(workspaceId, projectId, { content: text });
      const msg = data.chatMessage ?? data;
      setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
    } catch { setInput(text); }
  };

  const isMe = (msg) => {
    const id = msg.sender?._id ?? msg.sender;
    return id === user?.id || id === user?._id;
  };

  const onWhiteboardChange = useCallback((elements) => {
    elementsRef.current = elements;
    if (isRemoteUpdateRef.current || !activeWbRef.current) return;
    if (drawThrottleRef.current) clearTimeout(drawThrottleRef.current);
    drawThrottleRef.current = setTimeout(() => {
      const wbId = activeWbRef.current?._id;
      if (!wbId || isRemoteUpdateRef.current) return;
      emitDraw({ whiteboardId: wbId, elements: elementsRef.current });
    }, 50);
  }, []);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>{project?.name} — Chat</h1>
        <div className={s.presence}>
          {online.map(u => <Avatar key={u._id} name={u.name} online size={28} />)}
          <span className={s.onlineLabel}>{online.length} online</span>
          <Button variant="outline" size="sm" onClick={() => setShowWb(!showWb)}>
            {showWb ? 'Hide Whiteboard' : '🖊 Whiteboard'}
          </Button>
        </div>
      </div>

      <div className={s.body}>
        {/* Chat panel */}
        <div className={showWb ? s.chat : s.chatFull}>
          <div className={s.chatHeader}>
            {project?.name} — Project Chat
            <span className={s.livePill}>● LIVE</span>
          </div>
          <div className={s.messages}>
            {loading && <p className={s.noMsg}>Loading messages…</p>}
            {!loading && messages.length === 0 && <p className={s.noMsg}>No messages yet. Say hello! 👋</p>}
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
              placeholder={`Message ${project?.name}… (use @ to mention)`}
              value={input}
              members={wsMembers || []}
              autoFocus
              onChange={e => {
                setInput(e.target.value);
                if (projectId && user?.name && !typingEmitRef.current) {
                  emitTyping(projectId, user.name);
                  typingEmitRef.current = setTimeout(() => { typingEmitRef.current = null; }, 2000);
                }
              }}
            />
            <button type="submit" className={s.sendBtn} disabled={!input.trim()}>↑</button>
          </form>
          {typingUser && <div className={s.typingIndicator}>{typingUser} is typing…</div>}
        </div>

        {/* Whiteboard panel */}
        {showWb && (
          <div className={s.wbPanel}>
            <div className={s.wbSidebar}>
              <div className={s.wbSideHeader}>
                <span>Whiteboards</span>
                <button className={s.wbNewBtn} onClick={() => setWbModal(true)} title="New whiteboard">+</button>
              </div>
              <div className={s.wbList}>
                {whiteboards.length === 0 && <p className={s.wbEmpty}>No whiteboards.<br/>Create one to start.</p>}
                {whiteboards.map(wb => (
                  <div key={wb._id} className={`${s.wbItem} ${activeWb?._id === wb._id ? s.wbItemActive : ''}`}>
                    <button className={s.wbItemBtn} onClick={() => selectWhiteboard(wb)}>🖊 {wb.name}</button>
                    {canEdit && <button className={s.wbDeleteBtn} onClick={() => deleteWhiteboard(wb)} title="Delete">✕</button>}
                  </div>
                ))}
              </div>
            </div>
            <div className={s.whiteboard}>
              {!activeWb ? (
                <div className={s.wbPlaceholder}>
                  <p>Select or create a whiteboard</p>
                  <Button variant="primary" size="sm" onClick={() => setWbModal(true)}>+ New Whiteboard</Button>
                </div>
              ) : (
                <>
                  <div className={s.wbHeader}><span>{activeWb.name}</span></div>
                  <div className={s.wbCanvas}>
                    <div>
                      <Excalidraw
                        key={activeWb._id}
                        excalidrawAPI={(api) => setExcalidrawAPI(api)}
                        initialData={initialData ?? { elements: elementsRef.current, scrollToContent: false }}
                        onChange={onWhiteboardChange}
                        theme="dark"
                        viewModeEnabled={!canEdit}
                        UIOptions={{ canvasActions: { saveToActiveFile: false, loadScene: false, export: false } }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal open={wbModal} onClose={() => setWbModal(false)} title="New Whiteboard" size="sm">
        <form onSubmit={createWhiteboard} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Whiteboard name" placeholder="System Architecture" value={newWbName} onChange={e => setNewWbName(e.target.value)} />
          <Button type="submit" variant="primary" size="md">Create Whiteboard</Button>
        </form>
      </Modal>
    </div>
  );
}
