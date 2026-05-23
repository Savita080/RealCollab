import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import useAuthStore from "@/store/authStore";

export default function AppLayout() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  // redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#050818] flex">
      <Sidebar />
      <main className="flex-1 ml-[260px] p-8 text-white overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}