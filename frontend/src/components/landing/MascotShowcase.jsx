import React from "react";
import { motion } from "framer-motion";
import mascot from "../../assets/mascot.png";

export default function MascotShowcase() {
  return (
    <section className="py-24 relative overflow-hidden bg-transparent border-t border-b border-white/5">
      {/* Background Neon Orbs */}
      <div className="absolute w-[500px] h-[300px] bg-[#6C63FF]/5 blur-[120px] rounded-full top-1/2 left-1/3 -translate-y-1/2 pointer-events-none" />
      <div className="absolute w-[400px] h-[250px] bg-[#00D4FF]/5 blur-[120px] rounded-full top-1/2 right-1/4 -translate-y-1/2 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        {/* Left Column: Mascot Chamber */}
        <div className="lg:col-span-6 flex justify-center items-center relative min-h-[400px]">
          {/* Holographic Chamber Circles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="w-[320px] h-[320px] border border-dashed border-[#6C63FF]/25 rounded-full"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              className="w-[380px] h-[380px] border border-[#00D4FF]/15 rounded-full absolute"
            />
            <div className="w-[280px] h-[280px] bg-radial-gradient from-[#6C63FF]/10 to-transparent blur-xl rounded-full absolute" />
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
              className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(108,99,255,0.3)]"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
            <div className="hidden absolute inset-0 bg-[#030014]/60 border border-white/10 rounded-full flex flex-col items-center justify-center font-mono opacity-60">
              <span className="text-white text-sm">[ 3D Mascot Octo ]</span>
              <span className="text-[10px] text-gray-500">assets/mascot.png</span>
            </div>
          </motion.div>

          {/* Floating Telemetry Badge */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-6 top-12 p-3 rounded-2xl bg-[#030014]/90 border border-[#00D4FF]/30 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-20 font-mono text-[10px] text-left text-gray-400"
          >
            <div className="text-white font-bold mb-1">Telemetry Status</div>
            <div>CPU Load: <span className="text-[#00D4FF]">2.4%</span></div>
            <div>Sync Latency: <span className="text-emerald-400">12ms</span></div>
          </motion.div>
        </div>

        {/* Right Column: Copywriting & Stats */}
        <div className="lg:col-span-6 flex flex-col space-y-6 text-left items-start z-10">
          <span className="text-xs font-bold tracking-widest text-[#6C63FF] uppercase bg-[#6C63FF]/10 px-3.5 py-1.5 rounded-full border border-[#6C63FF]/20">
            Meet Your Companion
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Meet Octo,<br />Your AI Team Mascot.
          </h2>
          <p className="text-gray-400 text-base leading-relaxed max-w-xl">
            Octo integrates directly into your workspace pipelines. Monitoring git checkins, triggering smart sprint reports, notifying blockers, and celebrating task completions. 
          </p>

          <div className="grid grid-cols-2 gap-6 w-full pt-4">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
              <div className="text-2xl font-black text-[#00D4FF]">Automated</div>
              <div className="text-xs text-gray-400 mt-2">Standups, task summaries & reports compiled automatically.</div>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
              <div className="text-2xl font-black text-[#6C63FF]">Interactive</div>
              <div className="text-xs text-gray-400 mt-2">Gamified project milestones and team achievements.</div>
            </div>
          </div>

          <div className="pt-4">
            <motion.a
              href="/register"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3.5 text-sm bg-gradient-to-r from-[#6C63FF] to-[#00D4FF] text-white font-bold rounded-xl shadow-[0_8px_20px_rgba(108,99,255,0.3)] inline-block transition-transform"
            >
              Integrate Octo Free
            </motion.a>
          </div>
        </div>
      </div>
    </section>
  );
}
