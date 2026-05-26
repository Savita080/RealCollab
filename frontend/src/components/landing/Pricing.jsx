import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export default function Pricing() {
  return (
    <section id="pricing" className="py-32 relative overflow-hidden bg-transparent">
      {/* Background illumination */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] blur-[120px] rounded-full pointer-events-none"
        style={{ background: 'var(--accent-soft)' }}
      />

      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black tracking-tight"
            style={{ color: 'var(--text-1)' }}
          >
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base mt-4"
            style={{ color: 'var(--text-2)' }}
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
            className="rounded-3xl p-8 space-y-6 flex flex-col justify-between backdrop-blur-xl transition-all duration-300 relative group"
            style={{
              background: 'var(--bg-glass)',
              border: '2px solid var(--border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="space-y-4">
              <div
                className="text-sm font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-3)' }}
              >
                Free Tier
              </div>
              <div className="flex items-baseline" style={{ color: 'var(--text-1)' }}>
                <span className="text-5xl font-black">$0</span>
                <span className="text-sm font-medium ml-1" style={{ color: 'var(--text-3)' }}>/month</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Ideal for bootstrapping devs</p>
              <hr style={{ borderColor: 'var(--border)' }} />
              <ul className="space-y-3.5 text-sm" style={{ color: 'var(--text-2)' }}>
                {[
                  "Up to 5 workspace members",
                  "Core Kanban task flows",
                  "Shared code snippet blocks",
                  "Community level support channel",
                  "Basic webhook analytics"
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--accent-soft)' }}
                    >
                      <Check size={12} style={{ color: 'var(--violet)' }} />
                    </div>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              className="w-full py-3.5 rounded-xl font-bold transition-all duration-300 mt-8"
              style={{
                border: '1px solid var(--border-hover)',
                color: 'var(--text-1)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--indigo)';
                e.currentTarget.style.background = 'var(--accent-soft)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Get Started
            </button>
          </motion.div>

          {/* Pro Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl p-8 space-y-6 flex flex-col justify-between backdrop-blur-xl md:scale-[1.03] transition-all duration-300 relative group overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              border: '2px solid var(--indigo)',
              boxShadow: 'var(--glow-indigo)',
            }}
          >
            {/* Holographic Glowing Ribbon */}
            <div
              className="absolute top-4 right-4 text-[9px] uppercase font-black px-3 py-1 rounded-full tracking-wider"
              style={{
                backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))',
                color: 'var(--bg)',
                boxShadow: 'var(--glow-indigo)',
              }}
            >
              Most Popular
            </div>

            <div className="space-y-4">
              <div
                className="text-sm font-bold uppercase tracking-wider"
                style={{ color: 'var(--cyan)' }}
              >
                Pro Enterprise
              </div>
              <div className="flex items-baseline" style={{ color: 'var(--text-1)' }}>
                <span className="text-5xl font-black">$12</span>
                <span className="text-sm font-medium ml-1" style={{ color: 'var(--text-3)' }}>/month</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Optimized for scaling production teams</p>
              <hr style={{ borderColor: 'var(--border)' }} />
              <ul className="space-y-3.5 text-sm" style={{ color: 'var(--text-2)' }}>
                {[
                  "Unlimited workspace members",
                  "Advanced custom metrics feeds",
                  "Interactive collaborative streams",
                  "Full Octo AI companion logs",
                  "Dedicated 24/7 priority support",
                  "Custom administrative dashboard"
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--accent-soft)' }}
                    >
                      <Check size={12} style={{ color: 'var(--cyan)' }} />
                    </div>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl font-bold transition-all duration-300 mt-8"
              style={{
                backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))',
                color: 'var(--bg)',
                boxShadow: 'var(--glow-indigo)',
              }}
            >
              Start Pro Trial
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
