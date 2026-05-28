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
    const requestPresence = () => socket.emit('request_presence', projectId);
    // Server sends { projectId, users } — accept only updates for OUR room.
    // Tolerate legacy array payloads (no projectId field) too.
    const onPresenceUpdate = (data) => {
      if (Array.isArray(data)) { setOnline(data); return; }
      if (data?.projectId === projectId) setOnline(data.users || []);
    };
    const onFocus = () => { if (socket.connected) requestPresence(); };
    socket.on('presence:update', onPresenceUpdate);
    socket.on('connect', requestPresence);
    window.addEventListener('focus', onFocus);
    // Request immediately in case socket is already connected
    if (socket.connected) requestPresence();
    // Heartbeat — re-request presence every 15s as a safety net for missed broadcasts
    const heartbeat = setInterval(() => { if (socket.connected) requestPresence(); }, 15000);
    return () => {
      socket.off('presence:update', onPresenceUpdate);
      socket.off('connect', requestPresence);
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
