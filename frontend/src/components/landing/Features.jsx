// components/Features.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout, Sparkles, Code2, BookOpen, Users, Zap } from "lucide-react";

/* ── Mini card visuals ─────────────────────────────────────────── */
const w = "rgba(255,255,255,";

function KanbanVisual() {
  const cols = [
    { label: "TODO", color: w+"0.4)", tasks: ["Auth", "Wiki"] },
    { label: "DOING", color: "#fbbf24", tasks: ["DnD"] },
    { label: "DONE", color: "#34d399", tasks: ["JWT"] },
  ];
  return (
    <div style={{ display: "flex", gap: 6, width: "100%", height: "100%" }}>
      {cols.map((c, i) => (
        <div key={c.label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontSize: 7, fontWeight: 800, color: c.color, letterSpacing: 0.5 }}>{c.label}</div>
          {c.tasks.map((t, ti) => (
            <div key={t} style={{
              background: w+"0.1)",
              border: `1px solid ${w}0.05)`,
              borderRadius: 4,
              padding: "5px 4px",
              fontSize: 8,
              color: w+"0.9)",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              transform: (i === 1 && ti === 0) ? "rotate(-4deg) scale(1.05)" : "none",
              transition: "transform 0.2s",
              position: (i === 1 && ti === 0) ? "relative" : "static",
              zIndex: (i === 1 && ti === 0) ? 10 : 1
            }}>
              {t}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function OctoVisual() {
  return (
    <div style={{
      background: "rgba(0,0,0,0.3)",
      border: `1px solid ${w}0.08)`,
      borderRadius: 8,
      width: "100%",
      padding: "8px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)"
    }}>
      <div style={{ display: "flex", gap: 4 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444" }}/>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#eab308" }}/>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }}/>
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 8, lineHeight: 1.6 }}>
        <div style={{ color: w+"0.5)" }}>&gt; Reviewing snippet...</div>
        <div style={{ color: "#34d399" }}>✓ Logic looks solid</div>
        <div style={{ color: "#38bdf8" }}>→ Suggesting refactor</div>
        <div style={{ color: "#c084fc" }}>★ 0 Bugs found</div>
      </div>
    </div>
  );
}

function SnippetVisual() {
  return (
    <div style={{
      background: "#1e1e1e",
      borderRadius: 8,
      width: "100%",
      padding: "8px",
      fontFamily: "monospace",
      fontSize: 8,
      lineHeight: 1.6,
      border: `1px solid ${w}0.1)`,
      boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "stretch"
    }}>
      <div style={{ color: "#858585", marginRight: 8, userSelect: "none", textAlign: "right" }}>
        1<br/>2<br/>3<br/>4
      </div>
      <div>
        <span style={{ color: "#c586c0" }}>export const</span> <span style={{ color: "#dcdcaa" }}>sync</span> <span style={{ color: "#d4d4d4" }}>= (</span><span style={{ color: "#9cdcfe" }}>data</span><span style={{ color: "#d4d4d4" }}>) =&gt; {'{'}</span><br/>
        <span style={{ color: "#d4d4d4" }}>  socket.</span><span style={{ color: "#dcdcaa" }}>emit</span><span style={{ color: "#d4d4d4" }}> (</span><span style={{ color: "#ce9178" }}>'push'</span><span style={{ color: "#d4d4d4" }}>);</span><br/>
        <span style={{ color: "#6a9955" }}>  // real-time</span><br/>
        <span style={{ color: "#d4d4d4" }}>{'}'}</span>
      </div>
    </div>
  );
}

function WikiVisual() {
  const pages = [
    { icon: "⚡", name: "Quick Start", active: true },
    { icon: "🎨", name: "Design System", active: false },
    { icon: "🔒", name: "Auth Flow", active: false },
  ];
  return (
    <div style={{
      background: w+"0.05)",
      borderRadius: 8,
      padding: 6,
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      border: `1px solid ${w}0.08)`
    }}>
      {pages.map((p, i) => (
        <div key={i} style={{
          background: p.active ? w+"0.15)" : "transparent",
          padding: "5px 8px",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          gap: 6
        }}>
          <span style={{ fontSize: 10 }}>{p.icon}</span>
          <span style={{ fontSize: 9, color: p.active ? "#fff" : w+"0.6)", fontWeight: p.active ? 600 : 400 }}>{p.name}</span>
          {p.active && <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" }} />}
        </div>
      ))}
    </div>
  );
}

function PresenceVisual() {
  const cursors = [
    { x: 15, y: 15, color: "#f43f5e", name: "Sarah" },
    { x: 55, y: 35, color: "#0ea5e9", name: "Alex" },
  ];
  return (
    <div style={{
      background: w+"0.03)",
      borderRadius: 8,
      width: "100%",
      height: 80,
      position: "relative",
      overflow: "hidden",
      border: `1px dashed ${w}0.2)`
    }}>
      <div style={{ position: "absolute", top: 20, left: 15, width: 50, height: 4, background: w+"0.1)", borderRadius: 2 }} />
      <div style={{ position: "absolute", top: 32, left: 15, width: 80, height: 4, background: w+"0.1)", borderRadius: 2 }} />
      <div style={{ position: "absolute", top: 44, left: 15, width: 40, height: 4, background: w+"0.1)", borderRadius: 2 }} />
      
      {cursors.map((c, i) => (
        <div key={i} style={{ position: "absolute", top: c.y, left: c.x, display: "flex", flexDirection: "column", alignItems: "flex-start", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={c.color} stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(-15deg)" }}>
            <polygon points="3 3 10 21 14 14 21 10 3 3"></polygon>
          </svg>
          <div style={{ background: c.color, color: "#fff", fontSize: 7, fontWeight: 700, padding: "2px 5px", borderRadius: 4, marginTop: -2, marginLeft: 8 }}>
            {c.name}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityVisual() {
  const events = [
    { time: "2m", text: "Deployed v1.2", color: "#34d399" },
    { time: "1h", text: "Merged PR #42", color: "#a855f7" },
    { time: "3h", text: "Updated docs", color: "#38bdf8" },
  ];
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 10,
      width: "100%",
      paddingLeft: 6
    }}>
      {events.map((e, i) => (
        <div key={i} style={{ display: "flex", gap: 10, position: "relative" }}>
          {i !== events.length - 1 && (
            <div style={{ position: "absolute", left: 3, top: 12, bottom: -14, width: 2, background: w+"0.1)" }} />
          )}
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, border: `2px solid rgba(0,0,0,0.4)`, zIndex: 1, marginTop: 2, boxShadow: `0 0 8px ${e.color}80` }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 9, color: w+"0.9)", fontWeight: 600 }}>{e.text}</span>
            <span style={{ fontSize: 7, color: w+"0.5)", fontWeight: 500 }}>{e.time} ago</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const VISUALS = [KanbanVisual, OctoVisual, SnippetVisual, WikiVisual, PresenceVisual, ActivityVisual];

const features = [
  {
    icon: Layout,
    title: "Kanban Board",
    sub: "Drag-and-drop sprints",
    desc: "Move tasks across To Do, In Progress and Done columns. Assign members, set priorities and ship every sprint on time.",
    rating: "4.8",
    bg: "linear-gradient(160deg, #7c3aed, #4c1d95)",
    glow: "rgba(124,58,237,0.45)",
  },
  {
    icon: Sparkles,
    title: "Octo AI",
    sub: "Smart Code Reviewer",
    desc: "Octo AI instantly reviews your code snippets, catches potential bugs, and suggests optimizations before you ship.",
    rating: "4.9",
    bg: "linear-gradient(160deg, #db2777, #831843)",
    glow: "rgba(219,39,119,0.45)",
  },
  {
    icon: Code2,
    title: "Code Snippets",
    sub: "Syntax-highlighted sharing",
    desc: "Save, share and review reusable code blocks with full live syntax highlighting across 20+ languages — right inside your project.",
    rating: "4.7",
    bg: "linear-gradient(160deg, #0ea5e9, #0369a1)",
    glow: "rgba(14,165,233,0.45)",
  },
  {
    icon: BookOpen,
    title: "Team Wiki",
    sub: "Version-controlled docs",
    desc: "Rich wiki pages with inline editing, full version history and per-page search. Living documentation that evolves with your codebase.",
    rating: "4.6",
    bg: "linear-gradient(160deg, #10b981, #065f46)",
    glow: "rgba(16,185,129,0.45)",
  },
  {
    icon: Users,
    title: "Live Presence",
    sub: "Real-time collaboration",
    desc: "WebSocket-powered presence indicators show exactly who is active and what they're editing — across every project and workspace.",
    rating: "4.5",
    bg: "linear-gradient(160deg, #f59e0b, #92400e)",
    glow: "rgba(245,158,11,0.45)",
  },
  {
    icon: Zap,
    title: "Activity Feed",
    sub: "Live project log stream",
    desc: "A unified activity log for every task update, wiki edit, snippet share and message — streamed in real time to your whole team.",
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
      className="relative overflow-hidden bg-transparent py-16"
    >
      {/* Ambient glow behind focused card */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[100px] transition-all duration-700"
        style={{ background: features[focus].glow }}
      />

      <div className="relative mx-auto max-w-5xl px-6">
        {/* Heading */}
        <div className="mb-10 text-center">
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
            Every tool your team needs to plan, build and ship — packed into one
            unified, real-time workspace.
          </motion.p>
        </div>

        {/* Fan stage */}
        <div
          className="relative flex items-end justify-center"
          style={{ height: 340, perspective: 1200 }}
        >
          {features.map((feat, i) => {
            const Icon = feat.icon;

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
                <div>
                  <Icon size={26} color="#fff" />
                </div>

                {/* Mid visual */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0", minHeight: 0 }}>
                  {(() => { const V = VISUALS[i]; return <V />; })()}
                </div>

                {/* Bottom content */}
                <div>
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
            className="mx-auto mt-6 max-w-xs text-center text-sm"
            style={{ color: 'var(--text-2)' }}
          >
            {features[focus].desc}
          </motion.p>
        </AnimatePresence>

        {/* Dot navigation */}
        <div className="mt-4 flex items-center justify-center gap-3">
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