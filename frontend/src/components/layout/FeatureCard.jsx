import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function FeatureCard({ feature, index }) {
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Pure 3D transformations matching the isometric image layout
  const rotateX = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [40, 30, 25, 15]);
  const rotateZ = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [-25, -20, -15, -10]);
  const scale = useTransform(scrollYProgress, [0, 0.4, 0.8, 1], [0.8, 0.95, 0.98, 0.95]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  
  // Creates a stacked card depth offset as you scroll
  const translateY = useTransform(scrollYProgress, [0, 1], [100, index * -20]);

  const Icon = feature.icon;

  return (
    <div 
      ref={containerRef} 
      className="sticky top-12 h-[80vh] w-full flex items-center justify-center pointer-events-none"
    >
      <motion.div 
        style={{ 
          rotateX, 
          rotateZ,
          scale, 
          opacity, 
          y: translateY,
          transformStyle: "preserve-3d",
          perspective: 1200
        }}
        className="pointer-events-auto w-full max-w-3xl bg-gradient-to-br from-white/[0.07] to-white/[0.01] backdrop-blur-2xl border border-white/15 rounded-2xl p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center shadow-[0_50px_100px_rgba(0,0,0,0.7),_inset_0_1px_0_rgba(255,255,255,0.2)] hover:border-purple-500/40 transition-colors duration-300"
      >
        {/* Left Side: Dynamic Glowing 3D Glass Layer */}
        <div className="md:col-span-5 relative bg-gradient-to-tr from-[#6C63FF]/20 via-[#00D4FF]/5 to-transparent border border-white/10 rounded-xl p-6 aspect-video flex flex-col justify-between shadow-[inset_0_4px_24px_rgba(255,255,255,0.05)] overflow-hidden group">
          {/* Internal Neon Glow Effect */}
          <div className="absolute -right-10 -top-10 w-24 h-24 bg-[#00D4FF]/30 blur-2xl rounded-full" />
          <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-[#6C63FF]/40 blur-2xl rounded-full" />
          
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#00D4FF] shadow-lg">
            <Icon size={24} />
          </div>
          <div className="text-5xl font-mono font-black tracking-tighter bg-gradient-to-b from-white/20 to-transparent bg-clip-text text-transparent select-none self-end">
            0{index + 1}
          </div>
        </div>

        {/* Right Side: High Contrast Content Typography */}
        <div className="md:col-span-7 space-y-3 pl-0 md:pl-4">
          <h3 className="text-2xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
            {feature.title}
          </h3>
          <p className="text-gray-400 text-base leading-relaxed font-normal">
            {feature.desc}
          </p>
        </div>
      </motion.div>
    </div>
  );
}