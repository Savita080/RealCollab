import React from "react";
import { motion } from "framer-motion";
import Tilt from "react-parallax-tilt";
import { Layout, Sparkles, Code2, BookOpen, Users, Zap } from "lucide-react";

const features = [
  {
    icon: Layout,
    title: "Kanban Board",
    desc: "Drag tasks across customizable columns. Ship features faster every single sprint.",
    bg: "from-[#FF6B6B]/20 to-[#FF8E53]/5",
    border: "group-hover:border-[#FF8E53]/50",
    glow: "rgba(255, 142, 83, 0.15)",
    iconColor: "text-[#FF6B6B]"
  },
  {
    icon: Sparkles,
    title: "Smart Assistant",
    desc: "AI-powered automatic standups, blockage detectors, and workspace summaries.",
    bg: "from-[#A78BFA]/20 to-[#6C63FF]/5",
    border: "group-hover:border-[#6C63FF]/50",
    glow: "rgba(108, 99, 255, 0.15)",
    iconColor: "text-[#A78BFA]"
  },
  {
    icon: Code2,
    title: "Code Snippets",
    desc: "Save, share, and review reusable code blocks with full live syntax highlighting.",
    bg: "from-[#06B6D4]/20 to-[#0284C7]/5",
    border: "group-hover:border-[#0284C7]/50",
    glow: "rgba(2, 132, 199, 0.15)",
    iconColor: "text-[#06B6D4]"
  },
  {
    icon: BookOpen,
    title: "Team Wiki",
    desc: "Rich wiki documentation. Complete with inline editors, search, and full version logs.",
    bg: "from-[#34D399]/20 to-[#059669]/5",
    border: "group-hover:border-[#059669]/50",
    glow: "rgba(5, 150, 105, 0.15)",
    iconColor: "text-[#34D399]"
  },
  {
    icon: Users,
    title: "Live Collab",
    desc: "Real-time peer presence indicators. Instantly know who is working on what.",
    bg: "from-[#FBBF24]/20 to-[#F97316]/5",
    border: "group-hover:border-[#F97316]/50",
    glow: "rgba(249, 115, 22, 0.15)",
    iconColor: "text-[#FBBF24]"
  },
  {
    icon: Zap,
    title: "Activity Feed",
    desc: "A centralized operational logging feed of commits, tasks, and updates in real time.",
    bg: "from-[#EF4444]/20 to-[#EF4444]/5",
    border: "group-hover:border-[#EF4444]/50",
    glow: "rgba(239, 68, 68, 0.15)",
    iconColor: "text-[#EF4444]"
  }
];

export default function Features() {
  return (
    <section id="features" className="py-32 relative overflow-hidden bg-transparent">
      {/* Background radial gradient to frame section */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#6C63FF]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black tracking-tight text-white mt-6"
          >
            Built For High-Velocity Squads
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-base mt-4"
          >
            All tools required for modern agile product shipping, packed into a single modular, unified interface.
          </motion.p>
        </div>

        {/* 3D Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, index) => {
            const IconComponent = feat.icon;
            return (
              <Tilt
                key={index}
                tiltMaxAngleX={15}
                tiltMaxAngleY={15}
                perspective={1000}
                scale={1.03}
                transitionSpeed={1200}
                className="h-full"
              >
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.5 }}
                  className={`group relative h-full p-8 rounded-3xl bg-gradient-to-b ${feat.bg} border border-white/5 hover:bg-black/40 hover:border-white/10 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between text-left`}
                  style={{
                    boxShadow: `0 10px 30px -10px rgba(0, 0, 0, 0.5)`,
                  }}
                >
                  {/* Glowing background on hover */}
                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${feat.glow}, transparent 70%)`,
                    }}
                  />

                  {/* Icon */}
                  <div className="mb-8 z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <IconComponent size={24} className={`${feat.iconColor}`} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="z-10 mt-auto">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#00D4FF] transition-colors duration-300">
                      {feat.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </motion.div>
              </Tilt>
            );
          })}
        </div>
      </div>
    </section>
  );
}
