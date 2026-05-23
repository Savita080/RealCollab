import React from "react";
import { BookOpen, ArrowLeft, History, Edit3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Wiki() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(99,102,241,0.3)] animate-pulse">
        <BookOpen size={32} className="text-white" />
      </div>

      <h1 className="text-3xl font-extrabold text-white tracking-tight">Team Wiki</h1>
      <p className="text-white/40 text-sm max-w-md leading-relaxed">
        Notion-style Collaborative Wiki with full version snapshots. Draft documents, review historical updates, and rollback changes easily.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full text-left">
        <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-4">
          <Edit3 size={20} className="text-indigo-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-white">Live Editing</h3>
            <p className="text-xs text-white/35 mt-1 leading-relaxed">Create wiki records using TipTap/Markdown format with automatic updates.</p>
          </div>
        </div>
        <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-4">
          <History size={20} className="text-violet-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-white">Version Control</h3>
            <p className="text-xs text-white/35 mt-1 leading-relaxed">Saves full-content snapshots so you can view history and revert safely.</p>
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
