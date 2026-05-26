import React from "react";

export default function Footer() {
  return (
    <footer
      className="py-16 px-6 relative overflow-hidden"
      style={{
        background: 'var(--bg-glass)',
        color: 'var(--text-3)',
        borderTop: '1px solid var(--border)',
      }}
    >
      {/* Background soft lighting */}
      <div
        className="absolute w-72 h-72 blur-[100px] rounded-full -bottom-20 -left-20 pointer-events-none"
        style={{ background: 'var(--accent-soft)' }}
      />
      <div
        className="absolute w-56 h-56 blur-[80px] rounded-full top-10 right-10 pointer-events-none"
        style={{ background: 'var(--accent-soft)' }}
      />

      <div
        className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 relative z-10 pb-12 text-left"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Branding & Mission */}
        <div className="md:col-span-5 space-y-4">
          <div
            className="text-xl font-sans font-black tracking-tight flex items-center gap-2.5"
            style={{ color: 'var(--text-1)' }}
          >
            <span>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))' }}
              >
                Real
              </span>
              Collab
            </span>
          </div>
          <p
            className="text-sm max-w-sm leading-relaxed"
            style={{ color: 'var(--text-2)' }}
          >
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
            <div
              className="font-bold text-xs uppercase tracking-widest"
              style={{ color: 'var(--text-1)' }}
            >
              {col.t}
            </div>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="hover:underline transition-colors duration-200"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
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
        <div className="flex items-center gap-1.5" style={{ color: 'var(--text-2)' }}>
          Made for developers
        </div>
      </div>
    </footer>
  );
}
