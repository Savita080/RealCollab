import React from "react";
import { Users, ArrowLeft, MessageSquare, Paintbrush } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Collab() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse">
        <Users size={32} className="text-white" />
      </div>

      <h1 className="text-3xl font-extrabold text-white tracking-tight">Live Collab</h1>
      <p className="text-white/40 text-sm max-w-md leading-relaxed">
        Real-time interaction room. Sketch ideas on a shared zero-latency canvas, and chat instantly with team members in this project space.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full text-left">
        <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-4">
          <Paintbrush size={20} className="text-emerald-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-white">Whiteboard</h3>
            <p className="text-xs text-white/35 mt-1 leading-relaxed">Zero-latency collaborative drawing using Socket.IO and Upstash Redis cache.</p>
          </div>
        </div>
        <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-4">
          <MessageSquare size={20} className="text-cyan-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-white">Group Message Bus</h3>
            <p className="text-xs text-white/35 mt-1 leading-relaxed">Instant real-time room chat with online/offline indicators for all team members.</p>
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
