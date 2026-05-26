import React from "react";

export default function Footer() {
  return (
    <footer className="bg-black/45 text-gray-500 py-16 px-6 relative overflow-hidden border-t border-white/5">
      {/* Background soft lighting */}
      <div className="absolute w-72 h-72 bg-[#6C63FF]/5 blur-[100px] rounded-full -bottom-20 -left-20 pointer-events-none" />
      <div className="absolute w-56 h-56 bg-[#00D4FF]/5 blur-[80px] rounded-full top-10 right-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 relative z-10 border-b border-white/5 pb-12 text-left">
        {/* Branding & Mission */}
        <div className="md:col-span-5 space-y-4">
          <div className="text-xl font-sans font-black tracking-tight text-white flex items-center gap-2.5">
            <span><span className="bg-gradient-to-r from-[#6C63FF] to-[#00D4FF] bg-clip-text text-transparent">Real</span>Collab</span>
          </div>
          <p className="text-sm max-w-sm text-gray-400 leading-relaxed">
            Eliminating coordination lag to establish high-throughput development pipelines for modern engineering squads globally.
          </p>
        </div>

        {/* Link Categories */}
        {[
          { t: "Product", links: ["Features", "Integrations", "Pricing", "Changelog"] },
          { t: "Company", links: ["About Us", "Careers", "Blog", "Press Kit"] },
          { t: "Legal", links: ["Terms of Service", "Privacy Policy", "Security Protocols", "SLA Framework"] }
        ].map((col, idx) => (
          <div key={idx} className="md:col-span-2 space-y-3.5 text-sm">
            <div className="text-white font-bold text-xs uppercase tracking-widest">{col.t}</div>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="hover:text-white hover:underline transition-colors duration-200"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Under Footer copyright & details */}
      <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between text-xs gap-4 relative z-10">
        <div>&copy; {new Date().getFullYear()} RealCollab Inc. All structural rights reserved.</div>
        <div className="flex items-center gap-1.5 text-gray-400">
          Made for developers
        </div>
      </div>
    </footer>
  );
}
