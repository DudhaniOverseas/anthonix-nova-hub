import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  FileText,
  Image as ImageIcon,
  GraduationCap,
  BookOpen,
  CreditCard,
  Settings,
  LogOut,
  ShieldAlert,
  FileStack,
  FolderTree,
  ListTree,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { toast } from 'sonner';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/pages', label: 'Pages', icon: FileStack },
  { to: '/admin/posts', label: 'Posts', icon: FileText },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/menus', label: 'Menus', icon: ListTree, adminOnly: true },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/students', label: 'Students', icon: GraduationCap },
  { to: '/admin/media', label: 'Media', icon: ImageIcon },
  { to: '/admin/users', label: 'Users', icon: Users, adminOnly: true },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/settings', label: 'Settings', icon: Settings, adminOnly: true },
];

const AdminLayout = () => {
  const { user, loading, isStaff, isAdmin, phoneVerified, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/auth', { replace: true });
    else if (!loading && user && !phoneVerified) navigate('/verify-phone', { replace: true });
  }, [user, loading, phoneVerified, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  // Hard block: non-staff must never reach /admin even by typing the URL
  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="glass-card p-8 text-center max-w-md">
          <ShieldAlert className="mx-auto mb-4 text-destructive" size={48} />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            The admin panel is restricted to staff accounts. Your account doesn't have the required
            role.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate('/account')}>My Account</Button>
            <Button variant="glow" onClick={async () => { await signOut(); navigate('/auth'); }}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border">
        <div className="h-20 flex items-center gap-2 px-6 border-b border-border">
          <img src={logo} alt="logo" className="h-9 w-auto" />
          <span className="font-display font-bold">CMS</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems
            .filter((i) => !i.adminOnly || isAdmin)
            .map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2 truncate">{user.email}</div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={async () => {
              await signOut();
              toast.success('Signed out');
              navigate('/auth');
            }}
          >
            <LogOut size={14} /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-16 border-b border-border flex items-center justify-between px-4 bg-card">
          <img src={logo} alt="logo" className="h-8" />
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate('/auth'); }}>
            <LogOut size={16} />
          </Button>
        </header>
        {/* Mobile bottom nav */}
        <nav className="md:hidden order-last fixed bottom-0 inset-x-0 bg-card border-t border-border z-40 flex overflow-x-auto">
          {navItems
            .filter((i) => !i.adminOnly || isAdmin)
            .map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex-1 min-w-[72px] flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
