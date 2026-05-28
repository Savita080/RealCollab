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

/** Socket presence tracker */
export function usePresence(projectId) {
  const [online, setOnline] = useState([]);
  useEffect(() => {
    if (!projectId) return;
    socket.on('presence:update', setOnline);
    // Request current presence snapshot immediately on mount
    socket.emit('request_presence', projectId);
    return () => socket.off('presence:update', setOnline);
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
