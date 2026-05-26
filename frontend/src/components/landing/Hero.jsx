import React from "react";
import { motion } from "framer-motion";
import Tilt from "react-parallax-tilt";
import { ArrowRight, Play } from "lucide-react";

export default function Hero() {
  return (
    <header className="min-h-screen max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-32 pb-20">
      {/* Left: Branding & Copywriting */}
      <div className="lg:col-span-6 flex flex-col space-y-6 text-left items-start z-10">
        <h1
          className="text-5xl md:text-[68px] font-black leading-[1.05] tracking-tight font-sans"
          style={{ color: 'var(--text-1)' }}
        >
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
            className="block bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(to right, var(--text-1), var(--text-2), var(--text-3))' }}
          >
            Teams Actually
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="block bg-clip-text text-transparent italic font-serif"
            style={{ backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan), var(--green))' }}
          >
            Ship.
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-lg max-w-xl leading-relaxed"
          style={{ color: 'var(--text-2)' }}
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
            className="px-8 py-4 font-bold rounded-xl flex items-center gap-2 transition-all duration-300"
            style={{
              backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))',
              color: 'var(--bg)',
              boxShadow: 'var(--glow-indigo)',
            }}
          >
            Start Building Free <ArrowRight size={17} />
          </motion.a>

          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 font-bold rounded-xl flex items-center gap-2 backdrop-blur-md transition-all duration-300"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-1)',
            }}
          >
            <Play size={17} /> Watch Demo
          </motion.button>
        </motion.div>

        {/* Live Metrics */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="pt-10 flex gap-8 w-full"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {[
            { val: "2,400+", lbl: "Teams" },
            { val: "50k+", lbl: "Tasks Shipped" },
            { val: "99.9%", lbl: "Uptime" }
          ].map((stat, idx) => (
            <div key={idx} className="space-y-1 pt-4">
              <div className="font-black text-2xl tracking-tight" style={{ color: 'var(--cyan)' }}>{stat.val}</div>
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{stat.lbl}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right: 3D Parallax Dashboard Mock */}
      <div className="lg:col-span-6 flex items-center justify-center relative min-h-[500px]">
        {/* Glow behind the 3D element */}
        <div
          className="absolute w-80 h-80 blur-3xl rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ background: 'var(--accent-soft)' }}
        />

        <Tilt
          tiltMaxAngleX={12}
          tiltMaxAngleY={12}
          perspective={1000}
          transitionSpeed={1500}
          scale={1.02}
          className="w-full max-w-[500px]"
        >
          <div
            className="relative p-6 rounded-3xl backdrop-blur-xl transform-style-3d"
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* Dashboard Header Bar */}
            <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: 'var(--status-danger)' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: 'var(--status-warning)' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: 'var(--status-success)' }} />
              </div>
              <div className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>realcollab-core.yaml</div>
              <div className="w-4 h-4 rounded-full" style={{ background: 'var(--bg-hover)' }} />
            </div>

            {/* Code Output Mock Terminal */}
            <div className="space-y-3 font-mono text-xs text-left mb-4">
              <div style={{ color: 'var(--cyan)' }}>realcollab@engine:~$ <span style={{ color: 'var(--text-1)' }}>npm run collab:start</span></div>
              <div style={{ color: 'var(--text-2)' }}>&gt; initialising collaborative runtime environment...</div>
              <div style={{ color: 'var(--text-2)' }}>&gt; establishing websocket links with socket.io-client</div>
              <div style={{ color: 'var(--status-success)' }}>✓ connected to gateway cluster - active_peers: 14</div>
              <div style={{ color: 'var(--status-success)' }}>✓ smart assistant standup analyzer: online</div>
            </div>

            {/* Mini Visual Chart representation */}
            <div
              className="h-32 rounded-2xl p-4 flex flex-col justify-between mb-4 relative overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex justify-between items-center z-10">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Velocity Graph</span>
                <span className="text-xs font-bold" style={{ color: 'var(--status-success)' }}>+18.4%</span>
              </div>
              {/* Fake Graph Lines */}
              <div className="absolute inset-x-0 bottom-0 h-16 flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path
                    d="M0,25 Q15,5 30,22 T60,8 T90,18 T100,5 L100,30 L0,30 Z"
                    fill="url(#chart-grad)"
                    stroke="var(--cyan)"
                    strokeWidth="1.5"
                  />
                  <defs>
                    <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Floating Glass widgets */}
            <div
              className="absolute -top-6 -right-6 p-4 rounded-2xl backdrop-blur-md flex items-center gap-3"
              style={{
                background: 'var(--bg-dropdown)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
                transform: "translateZ(30px)",
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full animate-ping" style={{ background: 'var(--status-success)' }} />
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-3)' }}>Online Users</div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>42 Devs</div>
              </div>
            </div>

            <div
              className="absolute -bottom-6 -left-6 p-4 rounded-2xl backdrop-blur-md flex items-center gap-3"
              style={{
                background: 'var(--bg-dropdown)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
                transform: "translateZ(40px)",
              }}
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
                style={{ background: 'var(--accent-soft)', color: 'var(--indigo)' }}
              >
                ✦
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-3)' }}>AI Status</div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>0 Blockers</div>
              </div>
            </div>
          </div>
        </Tilt>
      </div>
    </header>
  );
}
