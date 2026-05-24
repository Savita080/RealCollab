import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function Background3D() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { scrollY } = useScroll();

  // Parallax translation for background grids based on scroll
  const gridY = useTransform(scrollY, [0, 1000], [0, -100]);
  const particleY1 = useTransform(scrollY, [0, 1000], [0, -150]);
  const particleY2 = useTransform(scrollY, [0, 1000], [0, -250]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Cyber orbs in the background
  const orbs = [
    { w: 400, h: 400, bg: "rgba(108, 99, 255, 0.15)", top: "10%", left: "5%", animate: { x: [0, 30, 0], y: [0, 50, 0] } },
    { w: 500, h: 500, bg: "rgba(6, 182, 212, 0.12)", bottom: "15%", right: "10%", animate: { x: [0, -40, 0], y: [0, -30, 0] } },
    { w: 300, h: 300, bg: "rgba(236, 72, 153, 0.08)", top: "60%", left: "50%", animate: { x: [0, 20, 0], y: [0, -50, 0] } }
  ];

  // Floating code snippets/glyphs
  const particles = [
    { text: "</>", size: 24, top: "12%", left: "15%", dur: 8 },
    { text: "{}", size: 20, top: "25%", left: "80%", dur: 10 },
    { text: "git", size: 16, top: "65%", left: "8%", dur: 7 },
    { text: "npm", size: 14, top: "45%", left: "75%", dur: 12 },
    { text: "⌘", size: 28, top: "82%", left: "22%", dur: 9 },
    { text: "const", size: 15, top: "52%", left: "18%", dur: 11 },
    { text: "[]", size: 18, top: "72%", left: "85%", dur: 8 },
  ];

  return (
    <div className="fixed inset-0 w-full h-full -z-50 overflow-hidden bg-[#030014] select-none pointer-events-none">
      {/* Mesh gradients & Ambient background glow */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full filter blur-[100px]"
          style={{
            width: orb.w,
            height: orb.h,
            backgroundColor: orb.bg,
            top: orb.top,
            left: orb.left,
            bottom: orb.bottom,
            right: orb.right,
          }}
          animate={orb.animate}
          transition={{ duration: 15 + i * 3, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Futuristic 3D Grid floor */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          y: gridY,
          backgroundImage: `
            linear-gradient(to right, rgba(108, 99, 255, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(108, 99, 255, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          transform: "perspective(800px) rotateX(65deg) translateY(-20%) translateZ(0)",
          transformOrigin: "top center",
        }}
      />

      {/* Cyberpunk Dots/Stars Overlay */}
      <div 
        className="absolute inset-0 opacity-40 bg-[radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)]"
        style={{ backgroundSize: "40px 40px" }}
      />

      {/* Glowing Spot that follows cursor */}
      <div
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none opacity-80"
        style={{
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(108, 99, 255, 0.08) 0%, rgba(6, 182, 212, 0.04) 50%, transparent 100%)`,
        }}
      />

      {/* Interactive 3D Perspective Lines / Horizon Glow */}
      <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#6C63FF]/30 to-transparent blur-[1px]" />
      <div className="absolute top-1/2 left-0 right-0 h-[30px] bg-gradient-to-r from-transparent via-[#00D4FF]/5 to-transparent blur-[15px]" />

      {/* Floating 3D Code Glyphs */}
      {particles.map((p, idx) => (
        <motion.div
          key={idx}
          className="absolute font-mono text-[#6C63FF]/20 dark:text-[#a78bfa]/15 font-semibold"
          style={{
            top: p.top,
            left: p.left,
            fontSize: p.size,
            y: idx % 2 === 0 ? particleY1 : particleY2,
            willChange: "transform",
          }}
          animate={{
            y: [0, -30, 0],
            rotate: [0, 15, -15, 0],
            opacity: [0.15, 0.4, 0.15]
          }}
          transition={{
            duration: p.dur,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {p.text}
        </motion.div>
      ))}
    </div>
  );
}
