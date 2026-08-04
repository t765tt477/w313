import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Settings, LogOut, BarChart3, Users as Clients, Shield, FileText, MapPin, MessageCircle, Wallet } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: string;
  onTabChange: (tab: any) => void;
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
    { id: 'recharge-requests' as const, label: 'طلبات الشحن', icon: Wallet },
    { id: 'chat' as const, label: 'الدردشة', icon: MessageCircle },
    { id: 'users' as const, label: 'الزباين', icon: Clients },
    { id: 'analytics' as const, label: 'التحليلات', icon: BarChart3 },
    { id: 'logs' as const, label: 'السجلات', icon: FileText },
    { id: 'cities' as const, label: 'المدن', icon: MapPin },
    ...(isSuperAdmin ? [{ id: 'admin-management' as const, label: 'إدارة الموظفين', icon: Shield }] : []),
    { id: 'settings' as const, label: 'الإعدادات', icon: Settings },
  ];

  const handleMenuClick = (itemId: string) => {
    if (itemId === 'recharge-requests') {
      navigate('/recharge-requests');
      if (window.innerWidth < 1024) onToggle();
      return;
    }
    onTabChange(itemId as any);
    navigate('/dashboard');
    if (window.innerWidth < 1024) onToggle();
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  return (
    <aside
      className="static top-0 right-0 h-full bg-card border-l border-border z-50 shadow-sm"
      style={{ width: '178px' }}
    >
      <div className="flex flex-col h-full">
        {/* Header / brand */}
        <div className="flex items-center justify-center wasal-gradient border-b border-brand-700/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="logo">
              <img
                src="https://res.cloudinary.com/efc2cuqx/image/upload/f_auto/q_auto/wasal_jilzjp.png"
                alt="شعار وصل"
              />
            </div>
            <span className="text-3xl font-black text-white">وصل</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-4 flex flex-col gap-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${active
                  ? 'wasal-gradient text-white shadow-md shadow-brand-500/25'
                  : 'text-brand-800 hover:bg-brand-50'
                  }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-gold-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </aside>
  );
}
