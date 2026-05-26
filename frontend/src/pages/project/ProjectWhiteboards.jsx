// pages/project/ProjectWhiteboards.jsx — collaborative whiteboards (Excalidraw)
import { useEffect, useRef, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Palette, Trash2 } from 'lucide-react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useUI } from '../../store/ui';
import { useTheme } from '../../store/theme';
import { whiteboards as wbApi } from '../../lib/api';
import { joinWhiteboard, leaveWhiteboard, emitDraw, emitSaveWb } from '../../lib/socket';
import socket from '../../lib/socket';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import s from '../../styles/modules/Whiteboards.module.css';

export default function ProjectWhiteboards() {
  const { workspaceId, projectId, project, canEdit } = useOutletContext();
  const { toast } = useUI();
  const themeKind = useTheme(s => s.getActive().kind);

  const [whiteboards, setWhiteboards] = useState([]);
  const [activeWb, setActiveWb] = useState(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [wbModal, setWbModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const elementsRef = useRef([]);
  const isRemoteUpdateRef = useRef(false);
  const drawThrottleRef = useRef(null);
  const activeWbRef = useRef(null);
  const saveIntervalRef = useRef(null);

  activeWbRef.current = activeWb;

  const saveNow = useCallback((wbId) => {
    const id = wbId ?? activeWbRef.current?._id;
    if (!id || !elementsRef.current?.length) return;
    emitSaveWb({ whiteboardId: id, elements: elementsRef.current });
  }, []);

  // Load whiteboards for this project
  useEffect(() => {
    if (!workspaceId || !projectId) return;
    wbApi.list(workspaceId, projectId)
      .then(({ data }) => {
        const list = data.whiteboards ?? data ?? [];
        setWhiteboards(list);
        if (list.length && !activeWb) selectWb(list[0]);
      })
      .catch(() => setWhiteboards([]));
  }, [workspaceId, projectId]);

  // Join/leave room and auto-save
  useEffect(() => {
    if (!activeWb) return;
    joinWhiteboard(activeWb._id);
    saveIntervalRef.current = setInterval(() => {
      if (elementsRef.current?.length) {
        emitSaveWb({ whiteboardId: activeWb._id, elements: elementsRef.current });
      }
    }, 10_000);
    return () => {
      saveNow(activeWb._id);
      leaveWhiteboard(activeWb._id);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      if (drawThrottleRef.current) clearTimeout(drawThrottleRef.current);
    };
  }, [activeWb?._id, saveNow]);

  // Socket events
  useEffect(() => {
    const apply = (elements) => {
      if (!Array.isArray(elements)) return;
      isRemoteUpdateRef.current = true;
      elementsRef.current = elements;
      setInitialData({ elements, scrollToContent: true });
      if (excalidrawAPI) excalidrawAPI.updateScene({ elements });
      requestAnimationFrame(() => { isRemoteUpdateRef.current = false; });
    };
    const onSync = (els) => apply(els);
    const onUpdate = (els) => apply(els);
    socket.on('whiteboard_sync', onSync);
    socket.on('whiteboard_update', onUpdate);
    return () => {
      socket.off('whiteboard_sync', onSync);
      socket.off('whiteboard_update', onUpdate);
    };
  }, [excalidrawAPI]);

  // Save on unmount
  useEffect(() => {
    return () => { saveNow(); };
  }, [saveNow]);

  const selectWb = (wb) => {
    if (activeWb?._id === wb._id) return;
    if (activeWb) {
      saveNow(activeWb._id);
      leaveWhiteboard(activeWb._id);
    }
    setActiveWb(wb);
    setInitialData(null);
    elementsRef.current = [];
  };

  const onChange = useCallback((elements) => {
    elementsRef.current = elements;
    if (isRemoteUpdateRef.current || !activeWbRef.current) return;
    if (drawThrottleRef.current) clearTimeout(drawThrottleRef.current);
    drawThrottleRef.current = setTimeout(() => {
      const wbId = activeWbRef.current?._id;
      if (!wbId || isRemoteUpdateRef.current) return;
      emitDraw({ whiteboardId: wbId, elements: elementsRef.current });
    }, 50);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canEdit) return toast('Read-only access', 'error');
    setCreating(true);
    try {
      const { data } = await wbApi.create(workspaceId, projectId, { name: newName || 'Untitled Whiteboard' });
      const wb = data.whiteboard ?? data;
      setWhiteboards(prev => [...prev, wb]);
      setNewName('');
      setWbModal(false);
      selectWb(wb);
      toast('Whiteboard created!', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to create', 'error');
    } finally { setCreating(false); }
  };

  const handleDelete = async (wb) => {
    if (!confirm(`Delete "${wb.name}"?`)) return;
    try {
      await wbApi.delete(workspaceId, projectId, wb._id);
      const remaining = whiteboards.filter(w => w._id !== wb._id);
      setWhiteboards(remaining);
      if (activeWb?._id === wb._id) {
        if (remaining.length) selectWb(remaining[0]);
        else { setActiveWb(null); setInitialData(null); }
      }
      toast('Whiteboard deleted', 'info');
    } catch { toast('Failed to delete', 'error'); }
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Whiteboards</h1>
          <p className={s.subtitle}>Real-time collaborative canvas · {project?.name}</p>
        </div>
        {canEdit && (
          <Button variant="primary" size="md" onClick={() => setWbModal(true)}>
            <Plus size={14} /> New Whiteboard
          </Button>
        )}
      </div>

      <div className={s.body}>
        <aside className={s.sideList}>
          <div className={s.sideHead}>
            <span>Whiteboards</span>
            <span className={s.count}>{whiteboards.length}</span>
          </div>
          {whiteboards.length === 0 ? (
            <p className={s.empty}>No whiteboards.<br/>Create one to start.</p>
          ) : (
            whiteboards.map(wb => (
              <div
                key={wb._id}
                className={`${s.item} ${activeWb?._id === wb._id ? s.itemActive : ''}`}
              >
                <button className={s.itemBtn} onClick={() => selectWb(wb)}>
                  <Palette size={13} /> {wb.name}
                </button>
                {canEdit && (
                  <button className={s.itemDel} onClick={() => handleDelete(wb)} title="Delete">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))
          )}
        </aside>

        <div className={s.canvas}>
          {!activeWb ? (
            <div className={s.placeholder}>
              <Palette size={32} className={s.placeholderIcon} />
              <p>Select or create a whiteboard to get started</p>
              {canEdit && (
                <Button variant="primary" size="sm" onClick={() => setWbModal(true)}>
                  <Plus size={12} /> New Whiteboard
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className={s.canvasHead}>
                <span className={s.canvasName}>{activeWb.name}</span>
                <span className={s.canvasMeta}>● Live · Auto-save 10s</span>
              </div>
              <div className={s.canvasArea}>
                <Excalidraw
                  key={activeWb._id}
                  excalidrawAPI={(api) => setExcalidrawAPI(api)}
                  initialData={initialData ?? { elements: elementsRef.current, scrollToContent: false }}
                  onChange={onChange}
                  theme={themeKind}
                  viewModeEnabled={!canEdit}
                  UIOptions={{
                    canvasActions: {
                      saveToActiveFile: false,
                      loadScene: false,
                      export: false,
                    },
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {wbModal && (
        <div className={s.modalOverlay} onClick={() => setWbModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <h3 className={s.modalTitle}>New Whiteboard</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input
                label="Whiteboard name"
                placeholder="System Architecture"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
              <div className={s.modalActions}>
                <Button type="button" variant="ghost" onClick={() => setWbModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" loading={creating}>Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
