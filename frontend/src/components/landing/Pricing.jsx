import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export default function Pricing() {
  return (
    <section id="pricing" className="py-32 relative overflow-hidden bg-transparent">
      {/* Background illumination */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#00D4FF]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black tracking-tight text-white"
          >
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-base mt-4"
          >
            No hidden fees. Scale up your team parameters as productivity expands.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
          {/* Free Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-black/35 border-2 border-white/5 hover:border-white/10 rounded-3xl p-8 space-y-6 flex flex-col justify-between backdrop-blur-xl shadow-2xl transition-all duration-300 relative group"
          >
            <div className="space-y-4">
              <div className="text-sm font-bold uppercase tracking-wider text-gray-500">Free Tier</div>
              <div className="flex items-baseline text-white">
                <span className="text-5xl font-black">$0</span>
                <span className="text-sm font-medium text-gray-500 ml-1">/month</span>
              </div>
              <p className="text-sm text-gray-400 font-medium">Ideal for bootstrapping devs</p>
              <hr className="border-white/5" />
              <ul className="space-y-3.5 text-sm text-gray-400">
                {[
                  "Up to 5 workspace members",
                  "Core Kanban task flows",
                  "Shared code snippet blocks",
                  "Community level support channel",
                  "Basic webhook analytics"
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#6C63FF]/10 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-[#a78bfa]" />
                    </div>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button className="w-full py-3.5 rounded-xl border border-[#6C63FF]/30 hover:border-[#6C63FF] hover:bg-[#6C63FF]/10 text-white font-bold transition-all duration-300 mt-8">
              Get Started
            </button>
          </motion.div>

          {/* Pro Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-[#0b0c24]/55 border-2 border-[#6C63FF]/45 rounded-3xl p-8 space-y-6 flex flex-col justify-between backdrop-blur-xl shadow-[0_20px_50px_rgba(108,99,255,0.15)] md:scale-[1.03] transition-all duration-300 relative group overflow-hidden"
          >
            {/* Holographic Glowing Ribbon */}
            <div className="absolute top-4 right-4 bg-gradient-to-r from-[#6C63FF] to-[#00D4FF] text-white text-[9px] uppercase font-black px-3 py-1 rounded-full tracking-wider shadow-[0_0_15px_rgba(108,99,255,0.5)]">
              Most Popular
            </div>

            <div className="space-y-4">
              <div className="text-sm font-bold uppercase tracking-wider text-[#00D4FF]">Pro Enterprise</div>
              <div className="flex items-baseline text-white">
                <span className="text-5xl font-black">$12</span>
                <span className="text-sm font-medium text-[#00D4FF]/70 ml-1">/month</span>
              </div>
              <p className="text-sm text-gray-400 font-medium">Optimized for scaling production teams</p>
              <hr className="border-white/10" />
              <ul className="space-y-3.5 text-sm text-gray-300">
                {[
                  "Unlimited workspace members",
                  "Advanced custom metrics feeds",
                  "Interactive collaborative streams",
                  "Full Octo AI companion logs",
                  "Dedicated 24/7 priority support",
                  "Custom administrative dashboard"
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#00D4FF]/10 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-[#00D4FF]" />
                    </div>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(108,99,255,0.4)" }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D4FF] text-white font-bold transition-all duration-300 mt-8"
            >
              Start Pro Trial
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
