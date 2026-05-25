// components/layout/AppShell.jsx
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ToastStack from '../ui/Toast';
import { useWorkspace } from '../../store/workspace';
import { useUI } from '../../store/ui';
import { useAuth } from '../../store/auth';
import s from './AppShell.module.css';

export default function AppShell() {
  const { fetchWorkspaces, current: ws } = useWorkspace();
  const { bindNotifications, unbindNotifications, toast } = useUI();

  useEffect(() => {
    fetchWorkspaces();
    bindNotifications();
    return () => unbindNotifications();
  }, []);

  useEffect(() => {
    const handler = () => {
      toast("You don't have access to this project.", 'error');
      if (ws?._id) fetchWorkspaces();
    };
    window.addEventListener('project-access-denied', handler);
    return () => window.removeEventListener('project-access-denied', handler);
  }, [ws?._id]);

  return (
    <div className={s.shell}>
      <Sidebar />
      <div className={s.right}>
        <TopBar />
        <main className={s.main}>
          <div className={s.content}>
            <Outlet />
          </div>
        </main>
      </div>
      <ToastStack />
    </div>
  );
}
