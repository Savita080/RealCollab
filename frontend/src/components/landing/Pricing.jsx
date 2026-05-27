import React from "react";
import { motion } from "framer-motion";
<<<<<<< Updated upstream
import { Check, Sparkles } from "lucide-react";

const PLANS = [
  {
    id: "free",
    label: "FREE",
    price: "₹0",
    period: "/ month",
    tagline: "Get started with the essentials",
    accentColor: "var(--status-success)",
    checkIcon: "✓",
    cta: "Get Started",
    ctaStyle: "outline",
    features: [
      "2 workspaces",
      "3 projects per workspace",
      "50 tasks per project",
      "10 AI requests / month",
      "4 members per workspace",
      "Kanban, Wiki, Snippets, Whiteboards",
      "Real-time collaboration",
    ],
  },
  {
    id: "pro",
    label: "PRO",
    price: "₹499",
    period: "/ year",
    tagline: "Everything you need to scale",
    accentColor: "var(--cyan)",
    checkIcon: "✦",
    cta: "Upgrade to Pro",
    ctaStyle: "gradient",
    badge: "Best Value",
    features: [
      "Unlimited workspaces",
      "Unlimited projects, tasks, wikis, snippets",
      "200 AI requests / month",
      "Up to 50 members per workspace",
      "Everything in FREE",
      "Priority email support",
    ],
  },
];
=======
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
>>>>>>> Stashed changes

export default function Pricing() {
  return (
    <section id="pricing" className="py-16 relative overflow-hidden bg-transparent">
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] blur-[130px] rounded-full pointer-events-none"
        style={{ background: "var(--accent-soft)" }}
      />

      <div className="max-w-5xl mx-auto px-6 relative">
        {/* Heading */}
        <div className="text-center max-w-xl mx-auto mb-8">


          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black tracking-tight mb-4"
            style={{ color: "var(--text-1)" }}
          >
            <span className="block">Two Plans.</span>
            <span
              className="block bg-clip-text text-transparent whitespace-nowrap"
              style={{
                backgroundImage: "linear-gradient(to right, var(--indigo), var(--cyan))",
              }}
            >
              Zero Confusion.
            </span>
          </motion.h2>


          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base"
            style={{ color: "var(--text-2)" }}
          >
            Start free forever. Upgrade to Pro when your team is ready to scale.
          </motion.p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto items-stretch">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="relative rounded-2xl p-6 flex flex-col"
              style={{
                background: "var(--bg-card)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className="absolute top-5 right-5 text-[9px] uppercase font-black px-3 py-1 rounded-full tracking-widest"
                  style={{
                    backgroundImage: "linear-gradient(to right, var(--indigo), var(--cyan))",
                    color: "var(--bg)",
                    boxShadow: "var(--glow-indigo)",
                  }}
                >
                  {plan.badge}
                </div>
              )}

              {/* Plan name + price */}
              <div className="mb-6">
                <div
                  className="text-xs font-black uppercase tracking-widest mb-3"
                  style={{ color: plan.accentColor }}
                >
                  {plan.label}
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-5xl font-black"
                    style={{ color: "var(--text-1)" }}
                  >
                    {plan.price}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-3)" }}
                  >
                    {plan.period}
                  </span>
                </div>
                <p
                  className="text-sm mt-2"
                  style={{ color: "var(--text-3)" }}
                >
                  {plan.tagline}
                </p>
              </div>

              {/* Divider */}
              <div
<<<<<<< Updated upstream
                className="mb-6"
                style={{ height: "1px", background: "var(--border)" }}
              />

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-5">
                {plan.features.map((f, fi) => (
                  <li key={fi} className="flex items-start gap-3 text-sm">
                    <span
                      className="flex-shrink-0 mt-px font-bold text-base leading-none"
                      style={{ color: plan.accentColor }}
=======
                className="text-sm font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-3)' }}
              >
                Free Tier
              </div>
              <div className="flex items-baseline" style={{ color: 'var(--text-1)' }}>
                <span className="text-5xl font-black">₹0</span>
                <span className="text-sm font-medium ml-1" style={{ color: 'var(--text-3)' }}>/month</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Ideal for bootstrapping devs</p>
              <hr style={{ borderColor: 'var(--border)' }} />
              <ul className="space-y-3.5 text-sm" style={{ color: 'var(--text-2)' }}>
                {[
                  "2 workspaces · 4 members each",
                  "Kanban, Wiki, Whiteboard, Snippets",
                  "3 projects per workspace",
                  "Real-time chat & @mentions",
                  "10 AI requests / month",
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--accent-soft)' }}
>>>>>>> Stashed changes
                    >
                      {plan.checkIcon}
                    </span>
                    <span style={{ color: "var(--text-2)" }}>{f}</span>
                  </li>
                ))}
              </ul>
<<<<<<< Updated upstream

              {/* CTA */}
              {plan.ctaStyle === "gradient" ? (
                <motion.a
                  href="/register"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl font-bold text-sm text-center block transition-all"
                  style={{
                    backgroundImage: "linear-gradient(to right, var(--indigo), var(--cyan))",
                    color: "var(--bg)",
                    boxShadow: "var(--glow-indigo)",
                  }}
                >
                  {plan.cta}
                </motion.a>
              ) : (
                <a
                  href="/register"
                  className="w-full py-3 rounded-xl font-bold text-sm text-center block transition-all"
                  style={{
                    background: "var(--bg-hover)",
                    color: "var(--text-1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--accent-soft)";
                    e.currentTarget.style.color = "var(--cyan)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--bg-hover)";
                    e.currentTarget.style.color = "var(--text-1)";
                  }}
                >
                  {plan.cta}
                </a>
              )}
            </motion.div>
          ))}
=======
            </div>
            <Link
              to="/register"
              className="w-full py-3.5 rounded-xl font-bold transition-all duration-300 mt-8 block text-center"
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
              Get Started Free
            </Link>
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
                PRO
              </div>
              <div className="flex items-baseline" style={{ color: 'var(--text-1)' }}>
                <span className="text-5xl font-black">₹499</span>
                <span className="text-sm font-medium ml-1" style={{ color: 'var(--text-3)' }}>/year</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Everything your team needs to ship</p>
              <hr style={{ borderColor: 'var(--border)' }} />
              <ul className="space-y-3.5 text-sm" style={{ color: 'var(--text-2)' }}>
                {[
                  "Unlimited workspaces & projects",
                  "Up to 50 members per workspace",
                  "200 AI requests / month",
                  "Unlimited tasks, wikis, snippets",
                  "Priority email support",
                  "Everything in FREE",
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

            <Link to="/subscribe">
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl font-bold transition-all duration-300 mt-8 block text-center"
                style={{
                  backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))',
                  color: 'var(--bg)',
                  boxShadow: 'var(--glow-indigo)',
                }}
              >
                Upgrade to PRO →
              </motion.span>
            </Link>
          </motion.div>
>>>>>>> Stashed changes
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35 }}
          className="text-center text-xs mt-6"
          style={{ color: "var(--text-3)" }}
        >
          All plans include real-time WebSocket presence, notifications &amp; task comments. · No credit card required for FREE.
        </motion.p>
      </div>
    </section>
  );
}
