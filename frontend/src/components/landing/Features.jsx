// components/Features.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout, Sparkles, Code2, BookOpen, Users, Zap } from "lucide-react";

const features = [
  {
    icon: Layout,
    title: "Kanban Board",
    sub: "Ship sprints faster",
    desc: "Drag tasks across customizable columns. Ship features faster every single sprint.",
    rating: "4.8",
    bg: "linear-gradient(160deg, #7c3aed, #4c1d95)",
    glow: "rgba(124,58,237,0.45)",
  },
  {
    icon: Sparkles,
    title: "Smart Assistant",
    sub: "AI-powered standups",
    desc: "AI-powered automatic standups, blockage detectors, and workspace summaries.",
    rating: "4.9",
    bg: "linear-gradient(160deg, #db2777, #831843)",
    glow: "rgba(219,39,119,0.45)",
  },
  {
    icon: Code2,
    title: "Code Snippets",
    sub: "Live syntax highlight",
    desc: "Save, share, and review reusable code blocks with full live syntax highlighting.",
    rating: "4.7",
    bg: "linear-gradient(160deg, #0ea5e9, #0369a1)",
    glow: "rgba(14,165,233,0.45)",
  },
  {
    icon: BookOpen,
    title: "Team Wiki",
    sub: "Version-controlled docs",
    desc: "Rich wiki documentation. Complete with inline editors, search, and full version logs.",
    rating: "4.6",
    bg: "linear-gradient(160deg, #10b981, #065f46)",
    glow: "rgba(16,185,129,0.45)",
  },
  {
    icon: Users,
    title: "Live Collab",
    sub: "Peer presence live",
    desc: "Real-time peer presence indicators. Instantly know who is working on what.",
    rating: "4.5",
    bg: "linear-gradient(160deg, #f59e0b, #92400e)",
    glow: "rgba(245,158,11,0.45)",
  },
  {
    icon: Zap,
    title: "Activity Feed",
    sub: "Real-time log stream",
    desc: "A centralized operational logging feed of commits, tasks, and updates in real time.",
    rating: "4.4",
    bg: "linear-gradient(160deg, #ef4444, #7f1d1d)",
    glow: "rgba(239,68,68,0.45)",
  },
];

export default function Features() {
  const [focus, setFocus] = useState(2);

  const getCardStyle = (i) => {
    const rel = i - focus;
    const absRel = Math.abs(rel);
    const rotate = rel * 10;
    const translateX = rel * 88;
    const translateY = absRel === 0 ? -24 : absRel === 1 ? 0 : 18;
    const scale = absRel === 0 ? 1.08 : absRel === 1 ? 0.97 : 0.88;
    const zIndex = features.length - absRel;
    const brightness = absRel > 2 ? 0.55 : absRel > 0 ? 1 - absRel * 0.08 : 1;

    return {
      transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`,
      zIndex,
      filter: `brightness(${brightness})`,
    };
  };

  return (
    <section
      id="features"
      className="relative overflow-hidden bg-transparent py-28"
    >
      {/* Ambient glow behind focused card */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[100px] transition-all duration-700"
        style={{ background: features[focus].glow }}
      />

      <div className="relative mx-auto max-w-5xl px-6">
        {/* Heading */}
        <div className="mb-20 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl font-black tracking-tight"
            style={{ color: 'var(--text-1)' }}
          >
            Built For High-<br />Velocity Squads
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mx-auto mt-4 max-w-md text-base"
            style={{ color: 'var(--text-3)' }}
          >
            All tools required for modern agile product shipping, packed into a
            single modular, unified interface.
          </motion.p>
        </div>

        {/* Fan stage */}
        <div
          className="relative flex items-end justify-center"
          style={{ height: 380, perspective: 1200 }}
        >
          {features.map((feat, i) => {
            const Icon = feat.icon;
            const rel = Math.abs(i - focus);

            return (
              <motion.div
                key={feat.title}
                animate={getCardStyle(i)}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                onClick={() => setFocus(i)}
                className="absolute cursor-pointer select-none"
                style={{
                  width: 190,
                  height: 300,
                  borderRadius: 22,
                  background: feat.bg,
                  transformOrigin: "center 110%",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                  padding: "22px 18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
                whileHover={{
                  y: -20,
                  transition: { type: "spring", stiffness: 400, damping: 20 },
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={22} color="#fff" />
                </div>

                {/* Bottom content */}
                <div>
                  {/* Rating pill */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: "rgba(255,255,255,0.18)",
                      borderRadius: 99,
                      padding: "3px 10px",
                      marginBottom: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {feat.rating}
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 3px", lineHeight: 1.1 }}>
                    {feat.title}
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", margin: 0, fontWeight: 500 }}>
                    {feat.sub}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Focused card description */}
        <AnimatePresence mode="wait">
          <motion.p
            key={focus}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mx-auto mt-10 max-w-xs text-center text-sm"
            style={{ color: 'var(--text-2)' }}
          >
            {features[focus].desc}
          </motion.p>
        </AnimatePresence>

        {/* Dot navigation */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {features.map((_, i) => (
            <button
              key={i}
              onClick={() => setFocus(i)}
              className="transition-all duration-200"
              style={{
                width: i === focus ? 24 : 8,
                height: 8,
                borderRadius: 99,
                background: i === focus ? 'var(--text-1)' : 'var(--bg-hover)',
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
              aria-label={features[i].title}
            />
          ))}
        </div>
      </div>
    </section>
  );
}