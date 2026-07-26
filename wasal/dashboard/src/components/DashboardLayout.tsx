import { useState, ReactNode } from 'react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import { RefreshCw } from 'lucide-react';

type Tab = 'overview' | 'drivers' | 'orders' | 'users' | 'analytics' | 'settings' | 'admin-management' | 'logs' | 'cities';

interface DashboardLayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}

// Same header + sidebar markup used on the main Dashboard page, so any page
// that wraps its content with this component looks identical to the rest of
// the admin panel (no more pages losing the navbar or getting a stale sidebar).
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
    <div className="dashboard min-h-screen bg-slate-50 flex flex-row" dir="rtl">
      <div>
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      </div>

      {/* Main Content */}
      <div className="w-full overflow-auto">
        {/* Header */}
        <header className="text-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl bg-yellow-500 mx-auto px-4 py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 emp-name">
                <div className="bg-green-500/20 rounded-full p-1">
                  <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">
                      {currentUser?.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-white text-sm">
                    {currentUser?.name || 'موظف'}
                  </div>
                  <div className="text-white text-xs">
                    {currentUser?.role === 'super_admin' || currentUser?.role === 'superadmin' ? 'سوبر مسؤول' : 'مسؤول'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors"
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
        <div className="max-w-7xl mx-auto p-2.5">
          {children}
        </div>
      </div>
    </div>
  );
}
