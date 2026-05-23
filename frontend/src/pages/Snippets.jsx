import React from "react";
import { Code2, ArrowLeft, Terminal, Cpu } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Snippets() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(167,139,250,0.3)] animate-pulse">
        <Code2 size={32} className="text-white" />
      </div>

      <h1 className="text-3xl font-extrabold text-white tracking-tight">Code Snippets</h1>
      <p className="text-white/40 text-sm max-w-md leading-relaxed">
        AI-Powered Code Review & Snippet Repository. Compare snippets, auto-generate logs, and run reviews with the FastAPI Python microservice.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full text-left">
        <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-4">
          <Terminal size={20} className="text-violet-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-white">Snippet Manager</h3>
            <p className="text-xs text-white/35 mt-1 leading-relaxed">Save reuseable fragments, query them easily, and search by tag.</p>
          </div>
        </div>
        <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-4">
          <Cpu size={20} className="text-cyan-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-white">AI Assistant Review</h3>
            <p className="text-xs text-white/35 mt-1 leading-relaxed">Runs code inspection, scores reliability, and outputs styling recommendations.</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate("/dashboard")}
        className="mt-8 px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.03] text-sm text-white/70 hover:text-white transition-all cursor-pointer flex items-center gap-2"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </button>
    </div>
  );
}