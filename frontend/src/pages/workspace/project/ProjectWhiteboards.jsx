// pages/workspace/project/ProjectWhiteboards.jsx — Standalone whiteboards page
import { useEffect, useState, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { whiteboards as wbApi } from '../../../lib/api';
import { joinWhiteboard, leaveWhiteboard, emitDraw, emitSaveWb } from '../../../lib/socket';
import socket from '../../../lib/socket';
import { useUI } from '../../../store/ui';
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
  const { toast } = useUI();

  const [whiteboards, setWhiteboards] = useState([]);
  const [activeWb, setActiveWb] = useState(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [wbModal, setWbModal] = useState(false);
  const [newWbName, setNewWbName] = useState('');
  const [loading, setLoading] = useState(true);

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
    const apply = (elements) => {
      if (!Array.isArray(elements)) return;
      isRemoteUpdateRef.current = true;
      elementsRef.current = elements;
      setInitialData({ elements, scrollToContent: true });
      if (excalidrawAPI) excalidrawAPI.updateScene({ elements });
      requestAnimationFrame(() => { isRemoteUpdateRef.current = false; });
    };
    socket.on('whiteboard_sync', apply);
    socket.on('whiteboard_update', apply);
    return () => { socket.off('whiteboard_sync'); socket.off('whiteboard_update'); };
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
