// lib/hooks.js — all custom hooks
import { useState, useEffect, useCallback, useRef } from 'react';
import socket, { getSocketIdentity } from './socket';

/** Debounce a value */
export function useDebounce(value, delay = 400) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

/** Intersection observer for scroll animations */
export function useInView(opts = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); ob.disconnect(); } },
      { threshold: 0.1, ...opts }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return [ref, inView];
}

/** Socket presence tracker — scoped to a specific projectId.
 *  Self-sufficient: announces identity, joins the room, and requests presence
 *  on its own so it doesn't depend on parent-effect ordering. */
export function usePresence(projectId) {
  const [online, setOnline] = useState([]);
  useEffect(() => {
    if (!projectId) return;
    const announceAndJoin = () => {
      const identity = getSocketIdentity();
      if (identity) socket.emit('user_online', identity);
      socket.emit('join_project', projectId);
      socket.emit('request_presence', projectId);
    };
    const onPresenceUpdate = (data) => {
      if (data?.projectId === projectId) setOnline(data.users || []);
    };
    const onFocus = () => { if (socket.connected) announceAndJoin(); };
    socket.on('presence:update', onPresenceUpdate);
    socket.on('connect', announceAndJoin);
    window.addEventListener('focus', onFocus);
    if (socket.connected) announceAndJoin();
    const heartbeat = setInterval(() => { if (socket.connected) announceAndJoin(); }, 15000);
    return () => {
      socket.off('presence:update', onPresenceUpdate);
      socket.off('connect', announceAndJoin);
      window.removeEventListener('focus', onFocus);
      clearInterval(heartbeat);
    };
  }, [projectId]);
  return online;
}

/** Local storage sync */
export function useLocalStorage(key, init) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? init; }
    catch { return init; }
  });
  const set = useCallback(v => {
    setVal(v);
    localStorage.setItem(key, JSON.stringify(v));
  }, [key]);
  return [val, set];
}

/** Click outside */
export function useClickOutside(ref, cb) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, cb]);
}
