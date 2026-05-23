import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Code2, BookOpen, Users, Activity, Zap, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import useAuthStore from "@/store/authStore";

const navItems = [
  { label: "Dashboard",     icon: LayoutDashboard, path: "/dashboard" },
  { label: "Kanban Board",  icon: LayoutDashboard, path: "/kanban" },
  { label: "Code Snippets", icon: Code2,           path: "/snippets" },
  { label: "Team Wiki",     icon: BookOpen,        path: "/wiki" },
  { label: "Live Collab",   icon: Users,           path: "/collab" },
  { label: "Activity Feed", icon: Activity,        path: "/activity" },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const user = useAuthStore(s => s.user);

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] flex flex-col bg-[#070d1f] border-r border-white/[0.06] z-40">

      {/* logo */}
      <div className="px-6 py-5 bg-gradient-to-r from-violet-500 to-cyan-500 border-b border-white/[0.06]">
        <Link to="/dashboard" className="flex items-center gap-2.5 text-white font-bold text-lg">
          RealCollab
        </Link>
      </div>

      {/* nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">Workspace</p>
        {navItems.map(({ label, icon: Icon, path }) => {
          const active = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                active
                  ? "bg-violet-500/15 text-violet-300 font-medium"
                  : "text-white/45 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <Icon size={16} className={active ? "text-violet-400" : ""} />
              {label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
            </Link>
          );
        })}
      </nav>

      {/* upgrade button */}
      <div className="px-3 pb-3">
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-violet-400" />
            <p className="text-xs font-semibold text-white">Upgrade to Pro</p>
          </div>
          <p className="text-[11px] text-white/40 leading-relaxed">Unlock unlimited members, AI logs & priority support.</p>
          <button className="w-full rounded-lg py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-500 to-cyan-500 hover:brightness-110 transition-all duration-200">
            Start with Pro
          </button>
        </div>
      </div>

      {/* user avatar */}
      <div className="px-4 py-4 border-t border-white/[0.06] flex items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400 flex items-center justify-center text-xs font-bold text-white">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#070d1f]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{user?.name || "User"}</p>
          <p className="text-[11px] text-white/35 truncate">{user?.email || ""}</p>
        </div>
      </div>

    </aside>
  );
}