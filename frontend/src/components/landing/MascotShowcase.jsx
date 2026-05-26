import React from "react";
import { motion } from "framer-motion";
import mascot from "../../assets/mascot.png";

export default function MascotShowcase() {
  return (
    <section
      className="py-24 relative overflow-hidden bg-transparent"
      style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
    >
      {/* Background Neon Orbs */}
      <div
        className="absolute w-[500px] h-[300px] blur-[120px] rounded-full top-1/2 left-1/3 -translate-y-1/2 pointer-events-none"
        style={{ background: 'var(--accent-soft)' }}
      />
      <div
        className="absolute w-[400px] h-[250px] blur-[120px] rounded-full top-1/2 right-1/4 -translate-y-1/2 pointer-events-none"
        style={{ background: 'var(--accent-soft)' }}
      />

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        {/* Left Column: Mascot Chamber */}
        <div className="lg:col-span-6 flex justify-center items-center relative min-h-[400px]">
          {/* Holographic Chamber Circles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="w-[320px] h-[320px] rounded-full"
              style={{ border: '1px dashed var(--border-hover)' }}
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              className="w-[380px] h-[380px] rounded-full absolute"
              style={{ border: '1px solid var(--border)' }}
            />
            <div
              className="w-[280px] h-[280px] blur-xl rounded-full absolute"
              style={{ background: 'var(--accent-soft)' }}
            />
          </div>

          {/* Floating Mascot Image */}
          <motion.div
            animate={{ y: [0, -18, 0], rotate: [0, 2, -2, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            className="z-10 w-72 md:w-80 h-72 md:h-80 relative flex items-center justify-center"
          >
            <img
              src={mascot}
              alt="Octo Mascot"
              className="w-full h-full object-contain"
              style={{ filter: 'drop-shadow(0 20px 40px var(--accent-soft))' }}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
            <div
              className="hidden absolute inset-0 rounded-full flex flex-col items-center justify-center font-mono opacity-60"
              style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)' }}
            >
              <span className="text-sm" style={{ color: 'var(--text-1)' }}>[ 3D Mascot Octo ]</span>
              <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>assets/mascot.png</span>
            </div>
          </motion.div>

          {/* Floating Telemetry Badge */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-6 top-12 p-3 rounded-2xl backdrop-blur-md z-20 font-mono text-[10px] text-left"
            style={{
              background: 'var(--bg-dropdown)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-card)',
              color: 'var(--text-2)',
            }}
          >
            <div className="font-bold mb-1" style={{ color: 'var(--text-1)' }}>Telemetry Status</div>
            <div>CPU Load: <span style={{ color: 'var(--cyan)' }}>2.4%</span></div>
            <div>Sync Latency: <span style={{ color: 'var(--status-success)' }}>12ms</span></div>
          </motion.div>
        </div>

        {/* Right Column: Copywriting & Stats */}
        <div className="lg:col-span-6 flex flex-col space-y-6 text-left items-start z-10">
          <span
            className="text-xs font-bold tracking-widest uppercase px-3.5 py-1.5"
            style={{ color: 'var(--indigo)' }}
          >
            Meet Your Companion
          </span>
          <h2
            className="text-4xl md:text-5xl font-black tracking-tight leading-tight"
            style={{ color: 'var(--text-1)' }}
          >
            Meet Octo,<br />Your AI Code Reviewer.
          </h2>
          <p
            className="text-base leading-relaxed max-w-xl"
            style={{ color: 'var(--text-2)' }}
          >
            Octo integrates directly into your workspace pipelines. Monitoring git checkins, triggering smart sprint reports, and analyzing code snippets.
          </p>

          <div className="grid grid-cols-2 gap-6 w-full pt-4">
            <div
              className="p-5 rounded-2xl flex flex-col justify-between"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="text-2xl font-black" style={{ color: 'var(--cyan)' }}>Automated</div>
              <div className="text-xs mt-2" style={{ color: 'var(--text-2)' }}>Standups, task summaries & reports compiled automatically.</div>
            </div>
            <div
              className="p-5 rounded-2xl flex flex-col justify-between"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="text-2xl font-black" style={{ color: 'var(--indigo)' }}>Interactive</div>
              <div className="text-xs mt-2" style={{ color: 'var(--text-2)' }}>Gamified project milestones and team achievements.</div>
            </div>
          </div>

          <div className="pt-4">
            <motion.a
              href="/register"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3.5 text-sm font-bold rounded-xl inline-block transition-transform"
              style={{
                backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))',
                color: 'var(--bg)',
                boxShadow: 'var(--glow-indigo)',
              }}
            >
              Try Octo Free
            </motion.a>
          </div>
        </div>
      </div>
    </section>
  );
}
