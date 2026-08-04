import { useState, ReactNode } from 'react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import { RefreshCw } from 'lucide-react';

type Tab = 'overview' | 'drivers' | 'orders' | 'users' | 'analytics' | 'settings' | 'admin-management' | 'logs' | 'cities' | 'chat' | 'recharge-requests';

interface DashboardLayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}

// Same header + sidebar markup used on the main Dashboard page, so any page
// that wraps its content with this component looks identical to the rest of
// the admin panel.
export default function DashboardLayout({ activeTab, onTabChange, children, onRefresh, refreshing }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getCurrentUser = () => {
    const userStr = localStorage.getItem('adminUser');
    return userStr ? JSON.parse(userStr) : null;
  };
  const currentUser = getCurrentUser();

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="dashboard min-h-screen bg-background flex flex-row" dir="rtl">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {/* Main Content */}
      <div className="w-full overflow-auto">
        {/* Header */}
        <header className="wasal-gradient border-b border-brand-700/20 sticky top-0 z-40 shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 emp-name">
                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shrink-0">
                  <span className="text-brand-700 font-black text-sm">
                    {currentUser?.name?.charAt(0) || 'A'}
                  </span>
                </div>
                <div className="leading-tight">
                  <div className="text-white text-sm font-bold">
                    {currentUser?.name || 'موظف'}
                  </div>
                  <div className="text-white/80 text-xs">
                    {currentUser?.role === 'super_admin' || currentUser?.role === 'superadmin' ? 'سوبر مسؤول' : 'مسؤول'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-colors"
                  title="تحديث الصفحة"
                  disabled={refreshing}
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <NotificationBell />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
