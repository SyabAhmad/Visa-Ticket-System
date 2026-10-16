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
  Search,
  Plus,
  Clock,
  Sun,
  Moon,
  ChevronLeft,
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

  const quickAddItems = [
    { label: 'Add Ticket', icon: Ticket, action: () => navigate('/tickets') },
    { label: 'Add Visa', icon: Stamp, action: () => navigate('/visas') },
    { label: 'Add Agent', icon: Users, action: () => navigate('/agents') },
  ];

  const SidebarContent = ({ collapsed }) => (
    <>
      <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'px-5'} h-[64px] flex-shrink-0`}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">VT</span>
            </div>
            <div>
              <span className="font-semibold text-[15px] text-white">Visa & Ticket</span>
              <p className="text-[10px] text-sidebar-foreground -mt-0.5">Management System</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">VT</span>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item ${collapsed ? 'justify-center px-0 mx-1' : ''} ${isActive ? 'active' : ''}`
            }
            title={collapsed ? label : undefined}
            onClick={() => setMobileSidebarOpen(false)}
          >
            <Icon size={20} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-2 flex-shrink-0">
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm transition-colors"
        >
          <ChevronLeft size={18} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      <div className={`border-t border-sidebar-border ${collapsed ? 'px-2 py-3' : 'px-4 py-4'} flex-shrink-0`}>
        {collapsed ? (
          <button onClick={handleLogout} className="w-full flex justify-center p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground hover:text-danger transition-colors">
            <LogOut size={20} />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
              {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || user?.username}</p>
              <p className="text-xs text-sidebar-foreground truncate capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground hover:text-danger flex-shrink-0 transition-colors" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <HeaderActionsContext.Provider value={{ triggerAdd: setHeaderAction }}>
      <div className="flex h-screen overflow-hidden bg-page">
        {/* Desktop Sidebar */}
        <aside className={`${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'} hidden lg:flex flex-shrink-0 flex-col bg-sidebar transition-all duration-200`}>
          <SidebarContent collapsed={sidebarCollapsed} />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-foreground/50" onClick={() => setMobileSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-[260px] bg-sidebar flex flex-col">
              <SidebarContent collapsed={false} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top bar */}
          <header className="h-[64px] bg-card border-b border-border flex items-center px-4 md:px-6 gap-3 flex-shrink-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-hover transition-colors lg:hidden flex-shrink-0"
            >
              <Menu size={22} className="text-secondary" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center bg-muted rounded-full px-4 py-2.5 hover:shadow-sm transition-all focus-within:bg-card focus-within:shadow-md">
                <Search size={18} className="text-tertiary mr-3 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search tickets, visas, agents..."
                  className="w-full bg-transparent outline-none text-[13px] text-primary placeholder:text-tertiary"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {quickAddItems.map(({ label, icon: Icon, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium text-secondary bg-muted hover:bg-hover transition-colors border border-border"
                  title={label}
                >
                  <Plus size={14} className="text-primary" />
                  <span>{label}</span>
                </button>
              ))}

              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-full hover:bg-hover transition-colors"
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? <Moon size={18} className="text-secondary" /> : <Sun size={18} className="text-warning" />}
              </button>

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'A'}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-card rounded-xl shadow-xl border border-border z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-[13px] font-medium text-primary">{user?.full_name || user?.username}</p>
                      <p className="text-[11px] text-tertiary capitalize">{user?.role}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-secondary hover:bg-hover transition-colors"
                      >
                        <Settings size={16} />
                        Settings
                      </button>
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/activity'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-secondary hover:bg-hover transition-colors"
                      >
                        <Clock size={16} />
                        Activity Log
                      </button>
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-danger hover:bg-danger-light transition-colors"
                      >
                        <LogOut size={16} />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </HeaderActionsContext.Provider>
  );
}
