'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  DollarSign, 
  Bell, 
  LogOut, 
  User as UserIcon,
  Menu,
  X
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, apiFetch } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch notifications
  useEffect(() => {
    if (user) {
      const fetchNotifications = async () => {
        try {
          const data = await apiFetch('/emails/notifications');
          setNotifications(data);
        } catch (e) {
          console.error('Failed to fetch notifications:', e);
        }
      };
      fetchNotifications();
      // Poll every 30s
      const timer = setInterval(fetchNotifications, 30000);
      return () => clearInterval(timer);
    }
  }, [user]);

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/emails/notifications/${id}`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'READ' } : n));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin"></div>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Contracts', href: '/contracts', icon: FileText },
    { name: 'Milestones', href: '/milestones', icon: CheckSquare },
    { name: 'Invoices', href: '/invoices', icon: DollarSign },
  ];

  return (
    <div className="flex h-screen bg-gradient-mesh overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col glass-panel border-r border-zinc-800">
        <div className="flex h-16 items-center px-6 border-b border-zinc-800/50">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-violet-500/20">
              I
            </span>
            <span className="font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">
              InvoiceIntel
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-violet-600/10 text-violet-400 border-l-2 border-violet-500'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-violet-400' : 'text-zinc-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-zinc-800/50">
          <div className="flex items-center justify-between rounded-xl bg-zinc-900/40 p-3 border border-zinc-800/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-violet-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-200 truncate">{user.name}</p>
                <p className="text-[10px] text-zinc-500 capitalize">{user.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-zinc-950/80 backdrop-blur-sm">
          <aside className="w-64 flex flex-col bg-zinc-900 border-r border-zinc-800 h-full">
            <div className="flex h-16 items-center justify-between px-6 border-b border-zinc-800">
              <span className="font-bold text-white">InvoiceIntel</span>
              <button onClick={() => setSidebarOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1.5 px-4 py-6">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-violet-600/10 text-violet-400' : 'text-zinc-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-200">{user.name}</p>
                <p className="text-[10px] text-zinc-500 capitalize">{user.role}</p>
              </div>
              <button onClick={logout} className="p-1.5 text-zinc-400 hover:text-red-400">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </aside>
          <div className="flex-1" onClick={() => setSidebarOpen(false)}></div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-zinc-800/40 bg-zinc-950/40 backdrop-blur-md z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-zinc-200"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="font-medium text-sm text-zinc-400 hidden sm:block">
            Workspace / <span className="text-zinc-200 capitalize">{pathname.replace('/', '') || 'Dashboard'}</span>
          </div>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 transition-colors"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-zinc-950 animate-pulse"></span>
              )}
            </button>

            {/* Notifications Menu */}
            {showNotifications && (
              <div className="absolute right-0 mt-2.5 w-80 rounded-xl bg-zinc-900/95 border border-zinc-800 shadow-xl py-2 z-50 backdrop-blur-lg">
                <div className="px-4 py-2 border-b border-zinc-800/50 flex justify-between items-center">
                  <span className="text-xs font-semibold text-zinc-300">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-600/20 text-violet-400 font-medium">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-6">No notifications yet</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => n.status === 'UNREAD' && markRead(n.id)}
                        className={`px-4 py-3 border-b border-zinc-800/30 hover:bg-zinc-800/30 cursor-pointer transition-colors ${
                          n.status === 'UNREAD' ? 'bg-violet-500/[0.02]' : ''
                        }`}
                      >
                        <p className={`text-xs ${n.status === 'UNREAD' ? 'text-zinc-200 font-medium' : 'text-zinc-400'}`}>
                          {n.message}
                        </p>
                        <span className="text-[10px] text-zinc-600 mt-1 block">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic View Scroll Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
