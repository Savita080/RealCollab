import React from "react";
import CustomCursor from "../components/ui/CustomCursor";
// import Background3D from "../components/landing/Background3D";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Features from "../components/landing/Features";
import MascotShowcase from "../components/landing/MascotShowcase";
import Pricing from "../components/landing/Pricing";
import Footer from "../components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen text-[#e2e8f0] relative selection:bg-[#6C63FF]/30 select-text overflow-x-hidden">
      {/* Dynamic Font Import & Scrollbar Setup */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        
        body {
          font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
          background-color: #030014;
        }

        h1, h2, h3, h4, h5, h6 {
          font-family: 'Syne', sans-serif;
        }

        html {
          scroll-behavior: smooth;
        }

        /* Tech-styled Scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #030014;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #6C63FF 0%, #00D4FF 100%);
          border-radius: 99px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #a78bfa 0%, #38bdf8 100%);
        }
      `}</style>

      <CustomCursor />

      {/* <Background3D /> */}

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