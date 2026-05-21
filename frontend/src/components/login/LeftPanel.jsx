import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

export default function LeftPanel() {
  const orbs = [
    { size: 420, x: "-10%", y: "-15%", color: "rgba(99,102,241,0.35)", dur: 18 },
    { size: 300, x: "55%",  y: "50%",  color: "rgba(34,211,238,0.25)", dur: 14 },
    { size: 200, x: "20%",  y: "65%",  color: "rgba(139,92,246,0.2)",  dur: 22 },
  ];

  return (
    <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-[#050818] p-14">
      {/* animated mesh background */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(34,211,238,0.2) 0%, transparent 60%)",
        }}
      />

      {/* floating orbs */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-[80px] pointer-events-none"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: orb.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* grid texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* content */}
      <div className="relative z-10">
        <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl tracking-tight">
          {/* <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div> */}
          RealCollab
        </Link>
      </div>

      <div className="relative z-10 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h2 className="text-5xl font-black text-white leading-[1.05] tracking-tight">
            Ship faster,
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              together.
            </span>
          </h2>
          <p className="mt-4 text-white/50 text-base leading-relaxed max-w-xs">
            Your team's mission control. Tasks, code, wikis, and standups — unified.
          </p>
        </motion.div>

        {/* stat pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex gap-3 flex-wrap"
        >
          {[
            { label: "2,400+ Teams" },
            { label: "50k+ Tasks Shipped" },
            { label: "99.9% Uptime" },
          ].map((s) => (
            <div
              key={s.label}
              className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs text-white/60"
            >
              {s.label}
            </div>
          ))}
        </motion.div>

        {/* testimonial card */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 max-w-xs"
        >
          <p className="text-white/70 text-sm leading-relaxed">
            "RealCollab cut our sprint planning time in half. The AI standup alone is worth it."
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500" />
            <div>
              <p className="text-xs text-white font-semibold">Maya Chen</p>
              <p className="text-[10px] text-white/40">Lead Engineer, Vercel</p>
            </div>
          </div>
        </motion.div> */}
      </div>

      {/* bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050818] to-transparent pointer-events-none" />
    </div>
  );
}