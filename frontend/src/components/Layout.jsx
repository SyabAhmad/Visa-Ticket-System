import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState, createContext, useContext, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Ticket,
  Stamp,
  Banknote,
  Users,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Sun,
  Moon,
  Search,
  Receipt,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tickets', icon: Ticket, label: 'Tickets' },
  { to: '/visas', icon: Stamp, label: 'Visa Processing' },
  { to: '/payments', icon: Banknote, label: 'Payments' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/agents', icon: Users, label: 'Agents' },
  { to: '/activity', icon: Clock, label: 'Activity' },
];

export const HeaderActionsContext = createContext(null);

export function useHeaderActions() {
  return useContext(HeaderActionsContext);
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerAction, setHeaderAction] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };
  const requestLogout = () => {
    setProfileOpen(false);
    setSignOutOpen(true);
  };
  const confirmLogout = () => {
    setSignOutOpen(false);
    handleLogout();
  };

  const SidebarContent = ({ collapsed }) => (
    <>
      {/* Edge collapse toggle (desktop, middle of sidebar) */}
      <button
        type="button"
        onClick={() => setSidebarCollapsed((p) => !p)}
        className="hidden lg:flex absolute left-full top-1/2 z-20 h-6 w-6 -translate-y-1/2 -translate-x-1/2 items-center justify-center rounded-full border border-sidebar-border bg-card text-foreground shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Brand */}
      <div className={`flex items-center ${collapsed ? 'justify-center px-2 py-2' : 'px-3 py-3'} flex-shrink-0`}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Mr. Ijaz Khan"
              className="w-9 h-9 rounded-lg object-cover"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
            />
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-foreground leading-tight truncate">Mr. Ijaz Khan</div>
              <div className="text-[10px] text-muted-foreground truncate">Ticket &amp; Visa System</div>
            </div>
          </div>
        ) : (
          <img src="/logo.png" alt="Mr. Ijaz Khan" className="w-9 h-9 rounded-lg object-cover" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-1 px-1 space-y-0 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item ${collapsed ? 'justify-center mx-1 px-0' : ''} ${isActive ? 'active' : ''}`
            }
            title={collapsed ? label : undefined}
            onClick={() => setMobileSidebarOpen(false)}
          >
            <span className="icon-wrap">
              <Icon size={14} className="flex-shrink-0" />
            </span>
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Profile footer */}
      <div className={`border-t border-sidebar-border ${collapsed ? 'px-1 py-2' : 'px-2 py-2.5'} flex-shrink-0`}>
        {collapsed ? (
          <button onClick={requestLogout} className="w-full flex justify-center p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground hover:text-danger transition-colors" title="Logout">
            <LogOut size={14} />
          </button>
        ) : (
          <button
            onClick={requestLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[11.5px] font-medium text-white transition-all"
            style={{ background: 'linear-gradient(180deg, #d93025, #b8261c)', boxShadow: '0 2px 6px rgba(217, 48, 37, 0.3)' }}
          >
            <LogOut size={13} />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </>
  );

  return (
    <HeaderActionsContext.Provider value={{ triggerAdd: setHeaderAction }}>
      <div className="flex h-screen overflow-hidden bg-page">
        {/* Desktop Sidebar */}
        <aside className={`relative ${sidebarCollapsed ? 'w-[68px]' : 'w-[220px]'} hidden lg:flex flex-shrink-0 flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200`}>
          <SidebarContent collapsed={sidebarCollapsed} />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-foreground/50" onClick={() => setMobileSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-[220px] bg-sidebar flex flex-col">
              <SidebarContent collapsed={false} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top bar */}
          <header className="h-[44px] bg-card border-b border-border flex items-center px-3 md:px-4 gap-2 flex-shrink-0">
            <button
              onClick={() => setMobileSidebarOpen((p) => !p)}
              className="p-2 rounded-md hover:bg-hover transition-colors flex-shrink-0 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu size={18} className="text-foreground" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center bg-muted rounded-md px-3 py-1.5 hover:shadow-sm transition-all focus-within:bg-card focus-within:shadow-md">
                <Search size={16} className="text-tertiary mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search tickets, visas, agents..."
                  className="w-full bg-transparent outline-none text-[12px] text-primary placeholder:text-tertiary"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-hover transition-colors"
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? <Moon size={16} className="text-foreground" /> : <Sun size={16} className="text-warning" />}
              </button>

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white font-medium text-xs cursor-pointer hover:shadow-md transition-shadow"
                >
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'A'}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-md shadow-xl border border-border z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-[12px] font-medium text-primary">{user?.full_name || user?.username}</p>
                      <p className="text-[10px] text-tertiary capitalize">{user?.role}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-hover transition-colors"
                      >
                        <Settings size={14} className="text-foreground" />
                        <span className="text-foreground">Settings</span>
                      </button>
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/activity'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-hover transition-colors"
                      >
                        <Clock size={14} className="text-foreground" />
                        <span className="text-foreground">Activity Log</span>
                      </button>
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={requestLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-danger hover:bg-danger-light transition-colors"
                      >
                        <LogOut size={14} />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto p-3 md:p-4">
            <Outlet />
          </main>
        </div>
      </div>
      {signOutOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/60" onClick={() => setSignOutOpen(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-[14px] font-semibold text-foreground mb-1 text-center">Sign out</h3>
            <p className="text-[13px] text-muted-foreground mb-2 text-center">Are you sure you want to sign out?</p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setSignOutOpen(false)}
                className="px-4 py-2 rounded-md text-[12px] font-medium bg-secondary text-secondary-foreground border border-border hover:bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 rounded-md text-[12px] font-medium text-white transition-colors"
                style={{ background: 'linear-gradient(180deg, #d93025, #b8261c)' }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </HeaderActionsContext.Provider>
  );
}
