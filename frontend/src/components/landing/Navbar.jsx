import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-[#030014]/65 backdrop-blur-xl border-b border-[#6C63FF]/15"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 cursor-pointer group">
          <span className="font-sans font-black text-xl tracking-tight text-white transition-colors duration-300">
            <span className="bg-gradient-to-r from-[#6C63FF] to-[#00D4FF] bg-clip-text text-transparent">Real</span>Collab
          </span>
        </Link>

        {/* Mid Navigation Links */}
        <div className="hidden md:flex items-right gap-9 font-bold text-lg">
          {["Features", "Pricing", "About"].map((link) => (
            <a
              key={link}
              href={`/#${link.toLowerCase()}`}
              className="relative text-gray-400 hover:text-white transition-colors duration-300 group"
            >
              {link}
              <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-gradient-to-r from-[#6C63FF] to-[#00D4FF] transition-all duration-300 group-hover:w-full shadow-[0_0_8px_rgba(108,99,255,0.8)]" />
            </a>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-5 py-2 text-lg text-gray-300 font-semibold hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all duration-300"
          >
            Login
          </Link>
          <Link to="/login">
            <motion.span
              whileHover={{ scale: 1.03, boxShadow: "0 0 25px rgba(108,99,255,0.6)" }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-2.5 text-lg text-white font-bold rounded-full bg-gradient-to-r from-[#6C63FF] to-[#00D4FF] shadow-[0_8px_20px_rgba(108,99,255,0.3)] transition-all duration-300 inline-block"
            >
              Get Started
            </motion.span>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
