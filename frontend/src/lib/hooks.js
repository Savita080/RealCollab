// lib/hooks.js — all custom hooks
import { useState, useEffect, useCallback, useRef } from 'react';
import socket from './socket';

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
 *  Robust against missed broadcasts via a 15s heartbeat + focus refresh. */
export function usePresence(projectId) {
  const [online, setOnline] = useState([]);
  useEffect(() => {
    if (!projectId) return;
    console.log('[presence] usePresence MOUNT projectId=', projectId, 'connected=', socket.connected);
    const requestPresence = () => {
      console.log('[presence] -> emit request_presence', projectId, 'connected=', socket.connected);
      socket.emit('request_presence', projectId);
    };
    // Server sends { projectId, users } — accept only updates for OUR room.
    const onPresenceUpdate = (data) => {
      const match = data?.projectId === projectId;
      console.log('[presence] <- presence:update', { received: data, expected: projectId, match });
      if (match) setOnline(data.users || []);
    };
    const onFocus = () => { if (socket.connected) requestPresence(); };
    socket.on('presence:update', onPresenceUpdate);
    socket.on('connect', requestPresence);
    window.addEventListener('focus', onFocus);
    // React fires child effects BEFORE parent effects — so this hook runs
    // before ProjectLayout's joinProject. Defer the initial request to the
    // next macrotask so join_project lands first, putting our socket in the
    // room before request_presence asks who's in it.
    let initialTimer;
    if (socket.connected) {
      initialTimer = setTimeout(requestPresence, 0);
    }
    // Heartbeat — re-request presence every 15s as a safety net
    const heartbeat = setInterval(() => { if (socket.connected) requestPresence(); }, 15000);
    return () => {
      socket.off('presence:update', onPresenceUpdate);
      socket.off('connect', requestPresence);
      window.removeEventListener('focus', onFocus);
      window.clearTimeout(initialTimer);
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
