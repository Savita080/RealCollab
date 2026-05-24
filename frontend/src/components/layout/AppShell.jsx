// components/layout/AppShell.jsx
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ToastStack from '../ui/Toast';
import { useWorkspace } from '../../store/workspace';
import { useUI } from '../../store/ui';
import s from './AppShell.module.css';

export default function AppShell() {
  const { fetchWorkspaces } = useWorkspace();
  const { bindNotifications, unbindNotifications } = useUI();

  useEffect(() => {
    fetchWorkspaces();
    bindNotifications();
    return () => unbindNotifications();
  }, []);

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
