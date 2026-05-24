import React from "react";
import { motion } from "framer-motion";
import Tilt from "react-parallax-tilt";
import { ArrowRight, Play } from "lucide-react";

export default function Hero() {
  return (
    <header className="min-h-screen max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-32 pb-20">
      {/* Left: Branding & Copywriting */}
      <div className="lg:col-span-6 flex flex-col space-y-6 text-left items-start z-10">
        {/* <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#6C63FF]/20 text-[#a78bfa] border border-[#6C63FF]/30 tracking-wider uppercase"
        >
          ✦ Developer Collaboration Platform
        </motion.div> */}

        <h1 className="text-5xl md:text-[68px] font-black leading-[1.05] tracking-tight text-white font-sans">
          <motion.span 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="block"
          >
            Where Developer
          </motion.span>
          <motion.span 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400"
          >
            Teams Actually
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="block bg-gradient-to-r from-[#6C63FF] via-[#00D4FF] to-[#34D399] bg-clip-text text-transparent italic font-serif"
          >
            Ship.
          </motion.span>
        </h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-gray-400 text-lg max-w-xl leading-relaxed"
        >
          Unify task workflows, interactive code repositories, whiteboards, and intelligent standups. A high-fidelity, futuristic environment built for peak-performance squads.
        </motion.p>

        {/* Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap gap-4 pt-2 w-full sm:w-auto"
        >
          <motion.a 
            href="/register"
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 bg-gradient-to-r from-[#6C63FF] to-[#00D4FF] text-white font-bold rounded-xl shadow-[0_8px_32px_rgba(108,99,255,0.4)] flex items-center gap-2 transition-all duration-300"
          >
            Start Building Free <ArrowRight size={17} />
          </motion.a>
          
          <motion.button 
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl flex items-center gap-2 backdrop-blur-md transition-all duration-300"
          >
            <Play size={17} fill="#white" /> Watch Demo
          </motion.button>
        </motion.div>

        {/* Live Metrics */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="pt-10 flex gap-8 border-t border-white/5 w-full"
        >
          {[
            { val: "2,400+", lbl: "Teams" },
            { val: "50k+", lbl: "Tasks Shipped" },
            { val: "99.9%", lbl: "Uptime" }
          ].map((stat, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-[#00D4FF] font-black text-2xl tracking-tight">{stat.val}</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.lbl}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right: 3D Parallax Dashboard Mock */}
      <div className="lg:col-span-6 flex items-center justify-center relative min-h-[500px]">
        {/* Glow behind the 3D element */}
        <div className="absolute w-80 h-80 bg-[#6C63FF]/15 blur-3xl rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        <Tilt
          tiltMaxAngleX={12}
          tiltMaxAngleY={12}
          perspective={1000}
          transitionSpeed={1500}
          scale={1.02}
          className="w-full max-w-[500px]"
        >
          <div className="relative p-6 rounded-3xl bg-black/45 border border-white/15 backdrop-blur-xl shadow-[0_24px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] transform-style-3d">
            {/* Dashboard Header Bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="text-xs font-mono text-gray-500">realcollab-core.yaml</div>
              <div className="w-4 h-4 rounded-full bg-white/10" />
            </div>

            {/* Code Output Mock Terminal */}
            <div className="space-y-3 font-mono text-xs text-left mb-4">
              <div className="text-[#00D4FF]">realcollab@engine:~$ <span className="text-white">npm run collab:start</span></div>
              <div className="text-gray-400">&gt; initialising collaborative runtime environment...</div>
              <div className="text-gray-400">&gt; establishing websocket links with socket.io-client</div>
              <div className="text-emerald-400">✓ connected to gateway cluster - active_peers: 14</div>
              <div className="text-emerald-400">✓ smart assistant standup analyzer: online</div>
            </div>

            {/* Mini Visual Chart representation */}
            <div className="h-32 bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between mb-4 relative overflow-hidden">
              <div className="flex justify-between items-center z-10">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Velocity Graph</span>
                <span className="text-xs text-emerald-400 font-bold">+18.4%</span>
              </div>
              {/* Fake Graph Lines */}
              <div className="absolute inset-x-0 bottom-0 h-16 flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path
                    d="M0,25 Q15,5 30,22 T60,8 T90,18 T100,5 L100,30 L0,30 Z"
                    fill="url(#chart-grad)"
                    stroke="#00D4FF"
                    strokeWidth="1.5"
                  />
                  <defs>
                    <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Floating Glass widgets (using translation for 3D parallax layers) */}
            {/* Widget 1: Active Users */}
            <div 
              className="absolute -top-6 -right-6 p-4 rounded-2xl bg-[#030014]/85 border border-[#00D4FF]/30 backdrop-blur-md shadow-lg flex items-center gap-3"
              style={{ transform: "translateZ(30px)" }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div className="text-left">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Online Users</div>
                <div className="text-sm font-bold text-white">42 Devs</div>
              </div>
            </div>

            {/* Widget 2: AI Blocker Check */}
            <div 
              className="absolute -bottom-6 -left-6 p-4 rounded-2xl bg-[#030014]/85 border border-[#6C63FF]/30 backdrop-blur-md shadow-lg flex items-center gap-3"
              style={{ transform: "translateZ(40px)" }}
            >
              <div className="w-6 h-6 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center text-[#a78bfa] text-xs">
                ✦
              </div>
              <div className="text-left">
                <div className="text-[10px] text-gray-500 font-bold uppercase">AI Status</div>
                <div className="text-sm font-bold text-white">0 Blockers</div>
              </div>
            </div>
          </div>
        </Tilt>
      </div>
    </header>
  );
}
