'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CalendarDays, FileText, LayoutDashboard, LoaderCircle, LogOut, ReceiptText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Brand from './Brand';

const navigation = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/contracts', label: 'Contracts', icon: FileText },
  { href: '/milestones', label: 'Milestones', icon: CalendarDays },
  { href: '/invoices', label: 'Invoices', icon: ReceiptText },
];

type Notification = { id: string; message: string; status: 'READ' | 'UNREAD'; createdAt: string };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout, apiFetch } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [notificationState, setNotificationState] = useState<{ userId: string; items: Notification[] }>();
  const notifications = notificationState && notificationState.userId === user?.id ? notificationState.items : [];
  const [open, setOpen] = useState(false);
  const [notificationError, setNotificationError] = useState(false);
  const selected = navigation.find(item => pathname === item.href || pathname.startsWith(item.href + '/')) ?? navigation[0];

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let active = true;
    const load = async () => {
      try {
        const records = await apiFetch<Notification[]>('/emails/notifications');
        if (active) {
          setNotificationState({ userId, items: records });
          setNotificationError(false);
        }
      } catch {
        if (active) setNotificationError(true);
      }
    };
    void load();
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user, apiFetch]);

  async function markRead(id: string) {
    try {
      await apiFetch('/emails/notifications/' + id, { method: 'PATCH' });
      setNotificationState(current => current && ({
        ...current,
        items: current.items.map(item => item.id === id ? { ...item, status: 'READ' } : item),
      }));
    } catch {
      setNotificationError(true);
    }
  }

  if (loading || !user) {
    return <main className="grid min-h-screen place-items-center" aria-label="Loading workspace">
      <LoaderCircle className="animate-spin text-brand" size={28} aria-hidden="true" />
    </main>;
  }

  const unread = notifications.filter(item => item.status === 'UNREAD').length;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[231px_minmax(0,1fr)]">
      <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:p-3">Skip to content</a>
      <aside className="flex flex-col border-b border-line bg-surface lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex min-h-[68px] items-center px-4 lg:min-h-[72px] lg:px-5"><Brand href="/dashboard" /></div>
        <nav aria-label="Workspace" className="grid grid-cols-4 gap-1 px-3 pb-2 sm:px-4 lg:flex lg:flex-col lg:pt-6">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link href={href} key={href} aria-current={selected.href === href ? 'page' : undefined}
              className={'flex flex-col items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-1 py-2 text-xs font-semibold transition-colors sm:flex-row sm:gap-2.5 sm:text-sm lg:justify-start lg:px-3 lg:py-2.5 ' +
                (selected.href === href ? 'bg-brand-light text-brand-dark' : 'text-copy hover:bg-canvas hover:text-ink')}>
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-line px-4 py-4 lg:block">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-light text-xs font-bold text-brand-dark" aria-hidden="true">
              {user.name.trim().slice(0, 1).toUpperCase() || 'U'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-copy">{user.email}</p>
            </div>
            <button type="button" onClick={logout} aria-label="Sign out" title="Sign out"
              className="rounded-md p-2 text-copy hover:bg-canvas hover:text-ink"><LogOut size={16} aria-hidden="true" /></button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="relative z-20 flex min-h-14 items-center border-b border-line bg-surface px-4 sm:px-7 lg:min-h-[72px] lg:px-8">
          <div className="mx-auto flex w-full max-w-[1190px] items-center justify-between gap-4">
            <p className="flex items-center gap-2 text-sm text-copy">
              <span className="hidden sm:inline">Workspace</span><span className="hidden text-subtle sm:inline" aria-hidden="true">/</span>
              <span className="font-semibold text-ink">{selected.label}</span>
            </p>
            <div className="relative flex items-center gap-1" onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
              <button type="button" aria-expanded={open} aria-controls="workspace-notifications" aria-label={'Notifications' + (unread ? ', ' + unread + ' unread' : '')}
                onClick={() => setOpen(value => !value)} className="relative rounded-md border border-line bg-surface p-2.5 text-copy hover:bg-canvas">
                <Bell size={17} aria-hidden="true" />
                {!!unread && <span className="absolute top-1.5 right-1.5 size-2 rounded-full border border-white bg-brand" />}
              </button>
              <button type="button" onClick={logout} aria-label="Sign out" className="rounded-md p-2.5 text-copy hover:bg-canvas lg:hidden">
                <LogOut size={17} aria-hidden="true" />
              </button>
              {open && <section id="workspace-notifications" className="surface-card absolute top-full right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] shadow-lg" aria-label="Notifications">
                <h2 className="border-b border-line px-4 py-3 text-sm font-bold">Notifications</h2>
                {notificationError && <p className="px-4 pt-3 text-sm text-red-700" role="status">Notifications could not be refreshed.</p>}
                {notifications.length === 0 && <p className="px-4 py-6 text-sm text-copy">You’re all caught up.</p>}
                <ul className="max-h-72 divide-y divide-line overflow-y-auto">
                  {notifications.map(item => <li key={item.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                    <p className="flex-1 text-copy">{item.message}</p>
                    {item.status === 'UNREAD' && <button type="button" onClick={() => void markRead(item.id)}
                      className="shrink-0 text-xs font-semibold text-brand hover:underline">Mark read</button>}
                  </li>)}
                </ul>
              </section>}
            </div>
          </div>
        </header>
        <main id="workspace-content" className="mx-auto w-full max-w-[1254px] px-4 py-6 sm:px-7 sm:py-8 lg:px-8 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
