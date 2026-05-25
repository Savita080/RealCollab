// components/layout/AppShell.jsx
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ToastStack from '../ui/Toast';
import NotificationPopupStack from '../ui/NotificationPopup';
import { useWorkspace } from '../../store/workspace';
import { useUI } from '../../store/ui';
import { notifications as notifApi } from '../../lib/api';
import s from '../../styles/modules/AppShell.module.css';

export default function AppShell() {
  const { fetchWorkspaces, refreshProjects } = useWorkspace();
  const { bindNotifications, unbindNotifications, setNotifications, toast } = useUI();

  useEffect(() => {
    fetchWorkspaces();
    bindNotifications();
    // Load existing unread so the bell badge is correct on page reload
    notifApi.unread()
      .then(({ data }) => setNotifications(data.notifications ?? data ?? []))
      .catch(() => {});
    return () => unbindNotifications();
  }, []);

  useEffect(() => {
    const handler = () => {
      toast("You don't have access to this project.", 'error');
      refreshProjects();
    };
    window.addEventListener('project-access-denied', handler);
    return () => window.removeEventListener('project-access-denied', handler);
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
      <NotificationPopupStack />
    </div>
  );
}
