import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Settings, LogOut, BarChart3, Users as Clients, Shield, FileText } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: string;
  onTabChange: (tab: 'overview' | 'drivers' | 'orders' | 'users' | 'analytics' | 'settings' | 'admin-management' | 'logs') => void;
}

export default function Sidebar({ onToggle, activeTab, onTabChange }: SidebarProps) {
  const navigate = useNavigate();

  const getUserRole = () => {
    const userStr = localStorage.getItem('adminUser');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user.role;
  };

  const isSuperAdmin = getUserRole() === 'super_admin' || getUserRole() === 'superadmin';

  const menuItems = [
    { id: 'overview' as const, label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'drivers' as const, label: 'المندوبين', icon: Users },
    { id: 'orders' as const, label: 'الطلبات', icon: Package },
    { id: 'users' as const, label: 'المستخدمين', icon: Clients },
    { id: 'analytics' as const, label: 'التحليلات', icon: BarChart3 },
    { id: 'logs' as const, label: 'السجلات', icon: FileText },
    ...(isSuperAdmin ? [{ id: 'admin-management' as const, label: 'إدارة الأدمنين', icon: Shield }] : []),
    { id: 'settings' as const, label: 'الإعدادات', icon: Settings },
  ];

  const handleMenuClick = (itemId: string) => {
    onTabChange(itemId as any);
    navigate('/dashboard');
    if (window.innerWidth < 1024) {
      onToggle();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  return (
    <>

      {/* Sidebar */}
      <aside
        className="static top-0 right-0 h-full bg-white border-l border-slate-200 z-50"
        style={{ width: '150px' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 bg-yellow-500 border-b border-slate-100">
            <div className="flex items-center gap-1 p-2">
              <div className="logo">
                <img src="https://res.cloudinary.com/efc2cuqx/image/upload/f_auto/q_auto/wasal_jilzjp.png" alt="" />
              </div>
              <span className="text-3xl font-black text-white">وصل</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`w-full flex items-center gap-1.5 px-3 py-2 rounded-sm text-sm font-bold transition-all ${activeTab === item.id
                    ? 'bg-green-400 text-white shadow-sm'
                    : 'text-yellow-600 hover:bg-green-50 hover:text-green-700'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
