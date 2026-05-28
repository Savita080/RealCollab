// pages/workspace/project/ProjectWhiteboards.jsx — Standalone whiteboards page
import { useEffect, useState, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { whiteboards as wbApi } from '../../../lib/api';
import { joinWhiteboard, leaveWhiteboard, emitDraw, emitSaveWb, emitPointerUpdate } from '../../../lib/socket';
import socket from '../../../lib/socket';
import { useAuth } from '../../../store/auth';
import { useUI } from '../../../store/ui';
import { useTheme } from '../../../store/theme';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import RoleGate from '../../../components/common/RoleGate';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import s from '../../../styles/modules/Collab.module.css';

export default function ProjectWhiteboards() {
  const ctx = useOutletContext();
  const { workspaceId, projectId, canEdit } = ctx;
  const { user } = useAuth();
  const { toast } = useUI();
  const themeKind = useTheme(s => s.getActive().kind);

  const [whiteboards, setWhiteboards] = useState([]);
  const [activeWb, setActiveWb] = useState(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [wbModal, setWbModal] = useState(false);
  const [newWbName, setNewWbName] = useState('');
  const [loading, setLoading] = useState(true);

  const elementsRef = useRef([]);
  const isRemoteUpdateRef = useRef(false);
  const isDrawingRef = useRef(false);
  const pendingUpdateRef = useRef(null);
  const drawThrottleRef = useRef(null);
  const pointerThrottleRef = useRef(null);
  const collaboratorsRef = useRef(new Map());
  const activeWbRef = useRef(null);
  const saveIntervalRef = useRef(null);

  activeWbRef.current = activeWb;

  const saveNow = useCallback((wbId) => {
    const id = wbId ?? activeWbRef.current?._id;
    if (!id || !elementsRef.current?.length) return;
    emitSaveWb({ whiteboardId: id, elements: elementsRef.current });
  }, []);

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setLoading(true);
    wbApi.list(workspaceId, projectId)
      .then(({ data }) => {
        const list = data.whiteboards ?? data;
        setWhiteboards(list);
        if (list.length && !activeWb) selectWb(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  // Socket events
  useEffect(() => {
    const onSync = (elements) => {
      if (!Array.isArray(elements)) return;
      isRemoteUpdateRef.current = true;
      elementsRef.current = elements;
      setInitialData({ elements, scrollToContent: true });
      if (excalidrawAPI) excalidrawAPI.updateScene({ elements });
      requestAnimationFrame(() => { isRemoteUpdateRef.current = false; });
    };

    const onUpdate = (elements) => {
      if (!Array.isArray(elements)) return;
      if (!excalidrawAPI) return;
      
      if (isDrawingRef.current) {
          pendingUpdateRef.current = elements;
          return;
      }
      
      isRemoteUpdateRef.current = true;
      const localElements = excalidrawAPI.getSceneElements();
      
      const localMap = new Map(localElements.map(el => [el.id, el]));
      const nextElementsMap = new Map();
      
      for (const remoteEl of elements) {
         const localEl = localMap.get(remoteEl.id);
         if (localEl && localEl.version > remoteEl.version) {
             nextElementsMap.set(localEl.id, localEl);
         } else {
             nextElementsMap.set(remoteEl.id, remoteEl);
         }
      }
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

    const onPointerUpdateSocket = (data) => {
      const { socketId, pointer, button, user, color } = data;
      const baseColor = color || '#3498db';
      collaboratorsRef.current.set(socketId, {
        pointer,
        button,
        username: user || 'Anonymous',
        color: { background: baseColor, stroke: baseColor }
      });
      if (excalidrawAPI) {
        excalidrawAPI.updateScene({ collaborators: new Map(collaboratorsRef.current) });
      }
    };

    socket.on('whiteboard_sync', onSync);
    socket.on('whiteboard_update', onUpdate);
    socket.on('whiteboard_pointer_update', onPointerUpdateSocket);
    
    return () => { 
      socket.off('whiteboard_sync', onSync); 
      socket.off('whiteboard_update', onUpdate); 
      socket.off('whiteboard_pointer_update', onPointerUpdateSocket);
    };
  }, [excalidrawAPI]);

  useEffect(() => {
    if (!activeWb) return;
    joinWhiteboard(activeWb._id);
    saveIntervalRef.current = setInterval(() => {
      if (elementsRef.current?.length) emitSaveWb({ whiteboardId: activeWb._id, elements: elementsRef.current });
    }, 10_000);
    return () => {
      saveNow(activeWb._id);
      leaveWhiteboard(activeWb._id);
      clearInterval(saveIntervalRef.current);
    };
  }, [activeWb?._id, saveNow]);

  const selectWb = (wb) => {
    if (activeWb?._id === wb._id) return;
    if (activeWb) { saveNow(activeWb._id); leaveWhiteboard(activeWb._id); }
    setActiveWb(wb); setInitialData(null); elementsRef.current = [];
  };

  const createWb = async (e) => {
    e.preventDefault();
    try {
      const { data } = await wbApi.create(workspaceId, projectId, { name: newWbName || 'Untitled Whiteboard' });
      const wb = data.whiteboard ?? data;
      setWhiteboards(prev => [...prev, wb]);
      setNewWbName(''); setWbModal(false);
      selectWb(wb);
      toast('Whiteboard created!', 'success');
    } catch (err) { toast(err?.response?.data?.message || 'Failed', 'error'); }
  };

  const deleteWb = async (wb) => {
    if (!confirm(`Delete "${wb.name}"?`)) return;
    try {
      await wbApi.delete(workspaceId, projectId, wb._id);
      const rest = whiteboards.filter(w => w._id !== wb._id);
      setWhiteboards(rest);
      if (activeWb?._id === wb._id) {
        if (rest.length) selectWb(rest[0]);
        else { setActiveWb(null); setInitialData(null); }
      }
    } catch { toast('Failed to delete', 'error'); }
  };

  const onChange = useCallback((elements) => {
    elementsRef.current = elements;
    if (isRemoteUpdateRef.current || !activeWbRef.current) return;
    if (drawThrottleRef.current) clearTimeout(drawThrottleRef.current);
    drawThrottleRef.current = setTimeout(() => {
      const id = activeWbRef.current?._id;
      if (!id || isRemoteUpdateRef.current) return;
      emitDraw({ whiteboardId: id, elements: elementsRef.current });
    }, 50);
  }, []);
  
  // We need a stable reference to onUpdate to call it from onPointerUpdate
  const onUpdateRef = useRef(null);
  useEffect(() => {
    onUpdateRef.current = (elements) => {
      if (!Array.isArray(elements) || !excalidrawAPI) return;
      isRemoteUpdateRef.current = true;
      const localElements = excalidrawAPI.getSceneElements();
      const localMap = new Map(localElements.map(el => [el.id, el]));
      const nextElementsMap = new Map();
      for (const remoteEl of elements) {
         const localEl = localMap.get(remoteEl.id);
         if (localEl && localEl.version > remoteEl.version) nextElementsMap.set(localEl.id, localEl);
         else nextElementsMap.set(remoteEl.id, remoteEl);
      }
      for (const localEl of localElements) {
         if (!nextElementsMap.has(localEl.id)) nextElementsMap.set(localEl.id, localEl);
      }
      const mergedElements = Array.from(nextElementsMap.values());
      elementsRef.current = mergedElements;
      excalidrawAPI.updateScene({ elements: mergedElements });
      requestAnimationFrame(() => { isRemoteUpdateRef.current = false; });
    };
  }, [excalidrawAPI]);

  return (
    <div className={s.page} style={{ height: 'calc(100vh - 56px)' }}>
      <div className={s.header}>
        <h1 className={s.title}>Whiteboards</h1>
        <RoleGate show={canEdit}>
          <Button variant="primary" size="sm" onClick={() => setWbModal(true)}>+ New Whiteboard</Button>
        </RoleGate>
      </div>

      <div className={s.body} style={{ flex: 1 }}>
        <div className={s.wbPanel} style={{ display: 'flex', flex: 1 }}>
          <div className={s.wbSidebar}>
            <div className={s.wbSideHeader}><span>Whiteboards</span></div>
            <div className={s.wbList}>
              {loading && <p className={s.wbEmpty}>Loading…</p>}
              {!loading && whiteboards.length === 0 && <p className={s.wbEmpty}>No whiteboards.<br/>Create one to start.</p>}
              {whiteboards.map(wb => (
                <div key={wb._id} className={`${s.wbItem} ${activeWb?._id === wb._id ? s.wbItemActive : ''}`}>
                  <button className={s.wbItemBtn} onClick={() => selectWb(wb)}>🖊 {wb.name}</button>
                  <RoleGate show={canEdit}>
                    <button className={s.wbDeleteBtn} onClick={() => deleteWb(wb)}>✕</button>
                  </RoleGate>
                </div>
              ))}
            </div>
          </div>
          <div className={s.whiteboard}>
            {!activeWb ? (
              <div className={s.wbPlaceholder}>
                <p>Select or create a whiteboard</p>
                <RoleGate show={canEdit}>
                  <Button variant="primary" size="sm" onClick={() => setWbModal(true)}>+ New Whiteboard</Button>
                </RoleGate>
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
                      onChange={onChange}
                      theme={themeKind}
                      viewModeEnabled={!canEdit}
                      UIOptions={{ canvasActions: { saveToActiveFile: false, loadScene: false, export: false } }}
                      onPointerUpdate={(payload) => {
                        const wasDrawing = isDrawingRef.current;
                        isDrawingRef.current = payload.button === "down";
                        
                        // If user just finished drawing, apply any pending updates
                        if (wasDrawing && !isDrawingRef.current && pendingUpdateRef.current) {
                            if (onUpdateRef.current) onUpdateRef.current(pendingUpdateRef.current);
                            pendingUpdateRef.current = null;
                        }
                        
                        if (!activeWbRef.current) return;
                        if (pointerThrottleRef.current) return;
                        
                        pointerThrottleRef.current = setTimeout(() => {
                          pointerThrottleRef.current = null;
                        }, 40);
                        
                        emitPointerUpdate({
                          whiteboardId: activeWbRef.current._id,
                          pointer: payload.pointer,
                          button: payload.button,
                          user: user?.name
                        });
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Modal open={wbModal} onClose={() => setWbModal(false)} title="New Whiteboard" size="sm">
        <form onSubmit={createWb} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Name" placeholder="System Architecture" value={newWbName} onChange={e => setNewWbName(e.target.value)} />
          <Button type="submit" variant="primary" size="md">Create Whiteboard</Button>
        </form>
      </Modal>
    </div>
  );
}
