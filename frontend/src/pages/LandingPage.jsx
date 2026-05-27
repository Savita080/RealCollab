import React from "react";
import CustomCursor from "../components/ui/CustomCursor";
import Background3D from "../components/landing/Background3D";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Features from "../components/landing/Features";
import MascotShowcase from "../components/landing/MascotShowcase";
import Pricing from "../components/landing/Pricing";
import Footer from "../components/landing/Footer";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen relative select-text overflow-x-hidden"
      style={{ color: 'var(--text-1)' }}
    >
      {/* Dynamic Font Import & Scrollbar Setup */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        body {
          font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
          background-color: var(--bg);
        }

        h1, h2, h3, h4, h5, h6 {
          font-family: 'Syne', sans-serif;
        }

        html {
          scroll-behavior: smooth;
        }

        ::selection { background: var(--accent-soft); }
      `}</style>

      <CustomCursor />

      <Background3D />

      <Navbar />

      <main className="relative z-10 w-full flex flex-col">
        <Hero />
        <Features />
        <MascotShowcase />
        <Pricing />
      </main>

      <Footer />
    </div>
  );
}