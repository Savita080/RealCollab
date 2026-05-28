// pages/Collab.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useWorkspace } from '../store/workspace';
import { useAuth } from '../store/auth';
import { useTheme } from '../store/theme';
import { usePresence } from '../lib/hooks';
import {
  joinProject, leaveProject,
  joinWhiteboard, leaveWhiteboard,
  emitDraw, emitSaveWb, emitTyping
} from '../lib/socket';
import socket from '../lib/socket';
import { chat as chatApi, whiteboards as wbApi, workspaces as wsApi } from '../lib/api';
import MentionInput from '../components/ui/MentionInput';
import { useUI } from '../store/ui';
import { Avatar } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { fmtRelative } from '../lib/utils';
import { Excalidraw } from '@excalidraw/excalidraw';
import s from '../styles/modules/Collab.module.css';

// ─── Import Excalidraw's own CSS (required for correct rendering) ────────────
import '@excalidraw/excalidraw/index.css';

const TABS = [
  { id: 'project',   label: 'Project View',   icon: '💬' },
  { id: 'workspace', label: 'Workspace Chat', icon: '🌐' },
];

export default function Collab() {
  const { current: ws, currentProject } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useUI();
  const themeKind = useTheme(s => s.getActive().kind);
  const online = usePresence(currentProject?._id);

  const [tab, setTab] = useState('project');
  const [wsMembers, setWsMembers] = useState([]);
  const [projectMessages, setProjectMessages] = useState([]);
  const [wsMessages, setWsMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);
  const typingEmitRef = useRef(null);
  const bottomRef = useRef(null);
  const wsChatBottomRef = useRef(null);

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

  // ── Load project chat history ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentProject || !ws) return;
    setProjectMessages([]);
    setLoading(true);
    chatApi.projectMessages(ws._id, currentProject._id)
      .then(({ data }) => setProjectMessages(data.messages ?? data))
      .catch(() => {})
      .finally(() => setLoading(false));

    joinProject(currentProject._id);
    return () => leaveProject(currentProject._id);
  }, [currentProject?._id, ws?._id]);

  // ── Load workspace chat history ────────────────────────────────────────────
  useEffect(() => {
    if (!ws) return;
    chatApi.workspaceMessages(ws._id)
      .then(({ data }) => setWsMessages(data.messages ?? data))
      .catch(() => {});
  }, [ws?._id]);

  // ── Load workspace members for @mention autocomplete ─────────────────────
  useEffect(() => {
    if (!ws) return;
    wsApi.members(ws._id)
      .then(({ data }) => setWsMembers(data.members ?? []))
      .catch(() => setWsMembers([]));
  }, [ws?._id]);

  // ── Load whiteboards for current project ───────────────────────────────────
  useEffect(() => {
    if (!ws || !currentProject) return;
    wbApi.list(ws._id, currentProject._id)
      .then(({ data }) => {
        const list = data.whiteboards ?? data;
        setWhiteboards(list);
        if (list.length && !activeWb) {
          selectWhiteboard(list[0]);
        }
      })
      .catch(() => {});
  }, [ws?._id, currentProject?._id]);

  // ── Join whiteboard room when active whiteboard changes ────────────────────
  useEffect(() => {
    if (!activeWb) return;
    // #region agent log
    fetch('http://127.0.0.1:7918/ingest/a206e052-0209-4dae-ac9e-d5dd54b7287b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6711b2'},body:JSON.stringify({sessionId:'6711b2',location:'Collab.jsx:joinWb',message:'join_whiteboard',data:{wbId:activeWb._id,socketConnected:socket.connected},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    joinWhiteboard(activeWb._id);
    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7918/ingest/a206e052-0209-4dae-ac9e-d5dd54b7287b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6711b2'},body:JSON.stringify({sessionId:'6711b2',location:'Collab.jsx:leaveWb',message:'leave_whiteboard',data:{wbId:activeWb._id,elementsCount:elementsRef.current?.length??0,hadInitialData:!!initialData},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      saveWhiteboardNow(activeWb._id);
      leaveWhiteboard(activeWb._id);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      if (drawThrottleRef.current) clearTimeout(drawThrottleRef.current);
    };
  }, [activeWb?._id, saveWhiteboardNow]);

  // ── Live socket: incoming project chat messages ────────────────────────────
  useEffect(() => {
    const onMsg = (msg) => {
      const projectId = msg.project?._id ?? msg.project;
      if (projectId !== currentProject?._id) return;
      setProjectMessages(prev =>
        prev.some(m => m._id === msg._id) ? prev : [...prev, msg]
      );
    };
    socket.on('new_group_message', onMsg);
    return () => socket.off('new_group_message', onMsg);
  }, [currentProject?._id]);

  // ── Live socket: workspace chat messages ───────────────────────────────────
  useEffect(() => {
    const onWsMsg = (msg) => {
      const workspaceId = msg.workspace?._id ?? msg.workspace;
      if (workspaceId !== ws?._id) return;
      setWsMessages(prev =>
        prev.some(m => m._id === msg._id) ? prev : [...prev, msg]
      );
    };
    socket.on('new_group_message', onWsMsg);
    return () => socket.off('new_group_message', onWsMsg);
  }, [ws?._id]);

  // ── Live socket: typing indicator ────────────────────────────────────────
  useEffect(() => {
    const onTyping = ({ userName, projectId: pid }) => {
      if (pid !== currentProject?._id) return;
      setTypingUser(userName);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
    };
    socket.on('user_typing', onTyping);
    return () => {
      socket.off('user_typing', onTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [currentProject?._id]);

  // ── Live socket: whiteboard events ─────────────────────────────────────────
  useEffect(() => {
    const onSync = (elements) => {
      // #region agent log
      fetch('http://127.0.0.1:7918/ingest/a206e052-0209-4dae-ac9e-d5dd54b7287b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6711b2'},body:JSON.stringify({sessionId:'6711b2',location:'Collab.jsx:onSync',message:'whiteboard_sync',data:{count:elements?.length??0,hasAPI:!!excalidrawAPI},timestamp:Date.now(),hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      if (!Array.isArray(elements)) return;
      isRemoteUpdateRef.current = true;
      elementsRef.current = elements;
      setInitialData({ elements, scrollToContent: true });
      if (excalidrawAPI) excalidrawAPI.updateScene({ elements });
      requestAnimationFrame(() => { isRemoteUpdateRef.current = false; });
    };

    const onUpdate = (elements) => {
      if (!Array.isArray(elements)) return;
      // #region agent log
      fetch('http://127.0.0.1:7918/ingest/a206e052-0209-4dae-ac9e-d5dd54b7287b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6711b2'},body:JSON.stringify({sessionId:'6711b2',location:'Collab.jsx:onUpdate',message:'whiteboard_update',data:{count:elements.length},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      if (!excalidrawAPI) return;
      
      isRemoteUpdateRef.current = true;
      const localElements = excalidrawAPI.getSceneElements();
      
      // Merge remote and local elements by version
      const localMap = new Map(localElements.map(el => [el.id, el]));
      const nextElementsMap = new Map();
      
      // 1. Process remote elements
      for (const remoteEl of elements) {
         const localEl = localMap.get(remoteEl.id);
         if (localEl && localEl.version > remoteEl.version) {
             nextElementsMap.set(localEl.id, localEl);
         } else {
             nextElementsMap.set(remoteEl.id, remoteEl);
         }
      }
      
      // 2. Add local elements that are missing in remote
      for (const localEl of localElements) {
         if (!nextElementsMap.has(localEl.id)) {
             nextElementsMap.set(localEl.id, localEl);
         }
      }
      
      const mergedElements = Array.from(nextElementsMap.values());
      elementsRef.current = mergedElements;
      excalidrawAPI.updateScene({ elements: mergedElements });
      
      requestAnimationFrame(() => { isRemoteUpdateRef.current = false; });
    };
    socket.on('whiteboard_sync', onSync);
    socket.on('whiteboard_update', onUpdate);
    return () => {
      socket.off('whiteboard_sync', onSync);
      socket.off('whiteboard_update', onUpdate);
    };
  }, [excalidrawAPI]);

  // ── Auto-scroll chats ────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [projectMessages.length]);

  useEffect(() => {
    wsChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [wsMessages.length]);

  // ── Auto-save whiteboard every 10 seconds ─────────────────────────────────
  useEffect(() => {
    if (!activeWb) return;
    saveIntervalRef.current = setInterval(() => {
      if (elementsRef.current?.length) {
        // #region agent log
        fetch('http://127.0.0.1:7918/ingest/a206e052-0209-4dae-ac9e-d5dd54b7287b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6711b2'},body:JSON.stringify({sessionId:'6711b2',location:'Collab.jsx:autoSave',message:'emit save_whiteboard',data:{wbId:activeWb._id,count:elementsRef.current.length},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        emitSaveWb({ whiteboardId: activeWb._id, elements: elementsRef.current });
      }
    }, 10_000);
    return () => clearInterval(saveIntervalRef.current);
  }, [activeWb?._id]);

  // ── Debug: log unmount (navigate away from Collab page) ───────────────────
  useEffect(() => {
    return () => {
      saveWhiteboardNow();
      // #region agent log
      fetch('http://127.0.0.1:7918/ingest/a206e052-0209-4dae-ac9e-d5dd54b7287b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6711b2'},body:JSON.stringify({sessionId:'6711b2',location:'Collab.jsx:unmount',message:'Collab page unmount',data:{elementsCount:elementsRef.current?.length??0,activeWbId:activeWbRef.current?._id},timestamp:Date.now(),hypothesisId:'D,C'})}).catch(()=>{});
      // #endregion
    };
  }, [saveWhiteboardNow]);

  // ── Select whiteboard ──────────────────────────────────────────────────────
  const selectWhiteboard = (wb) => {
    if (activeWb?._id === wb._id) return;
    if (activeWb) {
      saveWhiteboardNow(activeWb._id);
      leaveWhiteboard(activeWb._id);
    }
    setActiveWb(wb);
    setInitialData(null);
    elementsRef.current = [];
  };

  // ── Create whiteboard ──────────────────────────────────────────────────────
  const createWhiteboard = async (e) => {
    e.preventDefault();
    try {
      const { data } = await wbApi.create(ws._id, currentProject._id, { name: newWbName || 'Untitled Whiteboard' });
      const wb = data.whiteboard ?? data;
      setWhiteboards(prev => [...prev, wb]);
      setNewWbName('');
      setWbModal(false);
      selectWhiteboard(wb);
      toast('Whiteboard created!', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to create whiteboard', 'error');
    }
  };

  // ── Delete whiteboard ──────────────────────────────────────────────────────
  const deleteWhiteboard = async (wb) => {
    if (!confirm(`Delete "${wb.name}"?`)) return;
    try {
      await wbApi.delete(ws._id, currentProject._id, wb._id);
      const remaining = whiteboards.filter(w => w._id !== wb._id);
      setWhiteboards(remaining);
      if (activeWb?._id === wb._id) {
        if (remaining.length) selectWhiteboard(remaining[0]);
        else { setActiveWb(null); setInitialData(null); }
      }
      toast('Whiteboard deleted', 'info');
    } catch { toast('Failed to delete', 'error'); }
  };

  // ── Send project chat ──────────────────────────────────────────────────────
  const sendProject = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentProject || !ws) return;
    const text = input.trim();
    setInput('');
    try {
      const { data } = await chatApi.sendProject(ws._id, currentProject._id, { content: text });
      const msg = data.chatMessage ?? data;
      setProjectMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
    } catch { setInput(text); }
  };

  // ── Send workspace chat ────────────────────────────────────────────────────
  const sendWorkspace = async (e) => {
    e.preventDefault();
    if (!input.trim() || !ws) return;
    const text = input.trim();
    setInput('');
    try {
      const { data } = await chatApi.sendWorkspace(ws._id, { content: text });
      const msg = data.chatMessage ?? data;
      setWsMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
    } catch { setInput(text); }
  };

  const isMe = (msg) => {
    const id = msg.sender?._id ?? msg.sender;
    return id === user?.id || id === user?._id;
  };

  // ── Whiteboard change handler ──────────────────────────────────────────────
  const onWhiteboardChange = useCallback((elements) => {
    elementsRef.current = elements;
    if (isRemoteUpdateRef.current || !activeWbRef.current) return;

    if (drawThrottleRef.current) clearTimeout(drawThrottleRef.current);
    drawThrottleRef.current = setTimeout(() => {
      const wbId = activeWbRef.current?._id;
      if (!wbId || isRemoteUpdateRef.current) return;
      // #region agent log
      fetch('http://127.0.0.1:7918/ingest/a206e052-0209-4dae-ac9e-d5dd54b7287b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6711b2'},body:JSON.stringify({sessionId:'6711b2',location:'Collab.jsx:onChange',message:'emit whiteboard_draw',data:{elementCount:elementsRef.current.length,activeWbId:wbId},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      emitDraw({ whiteboardId: wbId, elements: elementsRef.current });
    }, 50);
  }, []);

  if (!currentProject) {
    return <div className={s.empty}>Select a project to enter the collab room.</div>;
  }

  const messages = tab === 'project' ? projectMessages : wsMessages;

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

      {/* ── Tab switcher ────────────────────────────────────────────────────── */}
      <div className={s.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${s.tab} ${tab === t.id ? s.tabActive : ''}`}
            onClick={() => { setTab(t.id); setInput(''); }}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className={s.body}>

        {/* ── Chat panel ──────────────────────────── */}
        <div className={tab === 'project' ? s.chat : s.chatFull}>
            <div className={s.chatHeader}>
              {tab === 'project' ? `${currentProject.name} — Project Chat` : `${ws?.name} — Workspace Chat`}
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
                        <Avatar name={senderName} src={m.sender?.avatar} size={20} />
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
              <div ref={tab === 'project' ? bottomRef : wsChatBottomRef} />
            </div>

            <form className={s.inputRow} onSubmit={tab === 'project' ? sendProject : sendWorkspace}>
              <MentionInput
                className={s.mentionWrap}
                inputClassName={s.chatInput}
                placeholder={`Message ${tab === 'project' ? currentProject.name : ws?.name}… (use @ to mention)`}
                value={input}
                members={wsMembers}
                autoFocus
                onChange={e => {
                  setInput(e.target.value);
                  if (tab === 'project' && currentProject?._id && user?.name && !typingEmitRef.current) {
                    emitTyping(currentProject._id, user.name);
                    typingEmitRef.current = setTimeout(() => { typingEmitRef.current = null; }, 2000);
                  }
                }}
              />
              <button type="submit" className={s.sendBtn} disabled={!input.trim()}>
                ↑
              </button>
            </form>
            {tab === 'project' && typingUser && (
              <div className={s.typingIndicator}>{typingUser} is typing…</div>
            )}
          </div>

        {/* ── Whiteboard panel (kept mounted so canvas state survives tab switches) ─ */}
          <div className={`${s.wbPanel} ${tab !== 'project' ? s.wbPanelHidden : ''}`}>
            {/* Whiteboard list sidebar */}
            <div className={s.wbSidebar}>
              <div className={s.wbSideHeader}>
                <span>Whiteboards</span>
                <button className={s.wbNewBtn} onClick={() => setWbModal(true)} title="New whiteboard">+</button>
              </div>
              <div className={s.wbList}>
                {whiteboards.length === 0 && (
                  <p className={s.wbEmpty}>No whiteboards.<br/>Create one to start.</p>
                )}
                {whiteboards.map(wb => (
                  <div
                    key={wb._id}
                    className={`${s.wbItem} ${activeWb?._id === wb._id ? s.wbItemActive : ''}`}
                  >
                    <button className={s.wbItemBtn} onClick={() => selectWhiteboard(wb)}>
                      🖊 {wb.name}
                    </button>
                    <button className={s.wbDeleteBtn} onClick={() => deleteWhiteboard(wb)} title="Delete">✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Canvas */}
            <div className={s.whiteboard}>
              {!activeWb ? (
                <div className={s.wbPlaceholder}>
                  <p>Select or create a whiteboard</p>
                  <Button variant="primary" size="sm" onClick={() => setWbModal(true)}>+ New Whiteboard</Button>
                </div>
              ) : (
                <>
                  <div className={s.wbHeader}>
                    <span>{activeWb.name}</span>
                    <span className={s.wbBadge}>Socket.IO · Redis · Auto-save 10s</span>
                  </div>
                  <div className={s.wbCanvas}>
                    <div>
                      <Excalidraw
                        key={activeWb._id}
                        excalidrawAPI={(api) => setExcalidrawAPI(api)}
                        initialData={initialData ?? { elements: elementsRef.current, scrollToContent: false }}
                        onChange={onWhiteboardChange}
                        theme={themeKind}
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
                </>
              )}
            </div>
          </div>
      </div>

      {/* Create whiteboard modal */}
      <Modal open={wbModal} onClose={() => setWbModal(false)} title="New Whiteboard" size="sm">
        <form onSubmit={createWhiteboard} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Whiteboard name"
            placeholder="System Architecture"
            value={newWbName}
            onChange={e => setNewWbName(e.target.value)}
          />
          <Button type="submit" variant="primary" size="md">Create Whiteboard</Button>
        </form>
      </Modal>
    </div>
  );
}