import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, CreditCard, MessageSquare,
  BookOpen, BarChart2, Settings, LogOut, Menu, X, GraduationCap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore.js';
import { useSchoolStore } from '../store/schoolStore.js';
import { authApi } from '../api/auth.js';

// ── Nav item definitions ──────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Dashboard',      icon: LayoutDashboard, path: '/',              roles: ['system_admin','head_teacher','dos','bursar','class_teacher'] },
  { label: 'Pupils',         icon: Users,           path: '/pupils',        roles: ['system_admin','head_teacher','dos','bursar','class_teacher'] },
  { label: 'Fees & Billing', icon: CreditCard,      path: '/fees',          roles: ['system_admin','head_teacher','bursar'] },
  { label: 'Communication',  icon: MessageSquare,   path: '/communication', roles: ['system_admin','bursar'] },
  { label: 'Academics',      icon: BookOpen,        path: '/academics',     roles: ['system_admin','head_teacher','dos','class_teacher'] },
  { label: 'Reports',        icon: BarChart2,       path: '/reports',       roles: ['system_admin','head_teacher','dos','bursar','class_teacher'] },
  { label: 'Administration', icon: Settings,        path: '/admin',         roles: ['system_admin'] },
];

// ── Breadcrumb helper ─────────────────────────────────────────
function useBreadcrumb() {
  const { pathname } = useLocation();
  const crumbs = [{ label: 'Home', path: '/' }];
  if (pathname.startsWith('/pupils/new'))          crumbs.push({ label: 'Pupils', path: '/pupils' }, { label: 'Register New Pupil' });
  else if (/^\/pupils\/[^/]+\/edit$/.test(pathname)) crumbs.push({ label: 'Pupils', path: '/pupils' }, { label: 'Edit Pupil' });
  else if (/^\/pupils\/[^/]+$/.test(pathname))       crumbs.push({ label: 'Pupils', path: '/pupils' }, { label: 'Pupil Profile' });
  else if (pathname.startsWith('/pupils'))           crumbs.push({ label: 'Pupils' });
  else if (pathname.startsWith('/fees'))             crumbs.push({ label: 'Fees & Billing' });
  else if (pathname.startsWith('/admin'))            crumbs.push({ label: 'Administration' });
  return crumbs;
}

// ── Avatar initials ───────────────────────────────────────────
function Initials({ name }) {
  const parts   = (name ?? '').trim().split(' ');
  const letters = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : (parts[0] ?? 'U').slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    text-white select-none" style={{ backgroundColor: '#2471A3' }}>
      {letters.toUpperCase()}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ roleName, fullName, username, onClose }) {
  const navigate    = useNavigate();
  const clearAuth   = useAuthStore((s) => s.clearAuth);
  const schoolName  = useSchoolStore((s) => s.schoolName);
  const logoUrl     = useSchoolStore((s) => s.logoUrl);

  const { mutate: logout } = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => { clearAuth(); navigate('/login', { replace: true }); },
    onError:   () => toast.error('Logout failed'),
  });

  const visible = NAV_ITEMS.filter(item => item.roles.includes(roleName));

  return (
    <nav className="flex flex-col h-full" style={{ backgroundColor: '#1A3C5E' }}>
      {/* School identity */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0 overflow-hidden">
          {logoUrl
            ? <img src={logoUrl} alt="School logo" className="w-full h-full object-cover" />
            : <GraduationCap size={20} className="text-white" />
          }
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">{schoolName}</p>
          <p className="text-white/50 text-xs">Management System</p>
        </div>
        {/* Mobile close */}
        {onClose && (
          <button onClick={onClose} className="ml-auto text-white/60 hover:text-white lg:hidden">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav links */}
      <ul className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {visible.map(({ label, icon: Icon, path }) => (
          <li key={path}>
            <NavLink
              to={path}
              end={path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* User + Logout */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Initials name={fullName} />
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">{fullName}</p>
            <p className="text-white/50 text-xs truncate">{username}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm
                     text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </nav>
  );
}

// ── App Shell ─────────────────────────────────────────────────
export default function AppShell() {
  const user         = useAuthStore((s) => s.user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const crumbs = useBreadcrumb();

  const roleName = user?.roleName ?? '';
  const fullName = user?.fullName ?? 'User';
  const username = user?.username ?? '';

  return (
    <div className="flex h-screen overflow-hidden bg-surface">

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-full">
        <Sidebar roleName={roleName} fullName={fullName} username={username} />
      </aside>

      {/* ── Mobile sidebar overlay ──────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 z-50">
            <Sidebar
              roleName={roleName}
              fullName={fullName}
              username={username}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* ── Main content column ──────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center
                           px-4 lg:px-6 gap-4">
          {/* Hamburger (mobile) */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
            {crumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-400">/</span>}
                {crumb.path && i < crumbs.length - 1
                  ? <NavLink to={crumb.path} className="text-gray-500 hover:text-gray-700 truncate">{crumb.label}</NavLink>
                  : <span className="font-medium text-gray-800 truncate">{crumb.label}</span>
                }
              </span>
            ))}
          </nav>

          {/* Right side: avatar */}
          <div className="ml-auto flex items-center gap-3">
            <Initials name={fullName} />
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
