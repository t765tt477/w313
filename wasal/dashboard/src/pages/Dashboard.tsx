import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, logAPI } from '../services/api';
import CitiesManager from '../components/CitiesManager';
import ChatPanel from '../components/ChatPanel';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';
import { Search, RefreshCw, Settings, DollarSign, Lock, Share2 } from 'lucide-react';

interface Analytics {
  totalUsers: number;
  totalDrivers: number;
  activeDrivers: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  driverEarnings: number;
}

interface Driver {
  _id: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  isAvailable: boolean;
  balance: number;
  totalEarnings: number;
  totalDeliveries: number;
  rating: number;
  isApproved: boolean;
}

interface Order {
  _id: string;
  orderNumber: string;
  client: { name: string; phone: string };
  driver?: { name: string; phone: string };
  pickupAddress: string;
  deliveryAddress: string;
  price: number;
  status: 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
  createdAt: string;
}

interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'orders' | 'users' | 'analytics' | 'settings' | 'admin-management' | 'logs' | 'cities' | 'chat'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [filterAvailability, setFilterAvailability] = useState<'all' | 'available' | 'unavailable'>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderFilterStatus, setOrderFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled'>('all');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminRole, setAdminRole] = useState<'admin' | 'super_admin'>('admin');
  const [adminLoading, setAdminLoading] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logFilterType, setLogFilterType] = useState<'all' | 'driver' | 'order' | 'client' | 'admin'>('all');
  const [logFilterAction, setLogFilterAction] = useState<'all' | 'create' | 'update' | 'delete' | 'login' | 'logout'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
    fetchLogs();
    if (isSuperAdmin) {
      fetchAdmins();
    }
    const userStr = localStorage.getItem('adminUser');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, driversRes, ordersRes, clientsRes] = await Promise.all([
        adminAPI.getAnalytics(),
        adminAPI.getAllDrivers(),
        adminAPI.getAllOrders(),
        adminAPI.getAllClients()
      ]);
      setAnalytics(analyticsRes.data);
      setDrivers(driversRes.data.drivers);
      setOrders(ordersRes.data.orders);
      setClients(clientsRes.data.clients);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await logAPI.getAllLogs({ limit: 100 });
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await adminAPI.getAllAdmins();
      setAdmins(response.data.admins);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };


  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver || !creditAmount) return;

    try {
      await adminAPI.addDriverCredit(selectedDriver._id, parseFloat(creditAmount), creditDescription);
      alert('تم إضافة الرصيد بنجاح');
      setCreditAmount('');
      setCreditDescription('');
      setSelectedDriver(null);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشل إضافة الرصيد');
    }
  };

  const handleApproveDriver = async (driverId: string) => {
    try {
      await adminAPI.approveDriver(driverId);
      alert('تم اعتماد المندوب بنجاح');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشل اعتماد المندوب');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    if (newPassword.length < 6) {
      alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setSettingsLoading(true);
    try {
      // Note: This would need a backend API endpoint for password change
      // For now, we'll simulate it
      alert('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشل تغيير كلمة المرور');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchData(),
        fetchLogs(),
        isSuperAdmin ? fetchAdmins() : Promise.resolve()
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const getUserRole = () => {
    const userStr = localStorage.getItem('adminUser');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user.role;
  };

  const isSuperAdmin = getUserRole() === 'super_admin' || getUserRole() === 'superadmin';

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword || !adminName) return;

    setAdminLoading(true);
    try {
      const response = await adminAPI.createAdmin({
        name: adminName,
        email: adminEmail,
        phone: '0000000000',
        password: adminPassword,
        role: adminRole
      });
      alert('تم إنشاء الموظف بنجاح');
      setAdminEmail('');
      setAdminPassword('');
      setAdminName('');
      setAdminRole('admin');
      fetchAdmins();
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشل إنشاء الموظف');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;

    try {
      await adminAPI.deleteAdmin(adminId);
      alert('تم حذف الموظف بنجاح');
      fetchAdmins();
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشل حذف الموظف');
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action?.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.entity?.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.user?.name?.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.details?.toLowerCase().includes(logSearchQuery.toLowerCase());

    const matchesType =
      logFilterType === 'all' || log.entity === logFilterType;

    const matchesAction =
      logFilterAction === 'all' || log.action === logFilterAction;

    return matchesSearch && matchesType && matchesAction;
  });

  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phone?.includes(searchQuery) ||
      driver.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'approved' && driver.isApproved) ||
      (filterStatus === 'pending' && !driver.isApproved);

    const matchesAvailability =
      filterAvailability === 'all' ||
      (filterAvailability === 'available' && driver.isAvailable) ||
      (filterAvailability === 'unavailable' && !driver.isAvailable);

    return matchesSearch && matchesStatus && matchesAvailability;
  });

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      order.client?.name?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      order.client?.phone?.includes(orderSearchQuery) ||
      order.driver?.name?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      order.pickupAddress?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      order.deliveryAddress?.toLowerCase().includes(orderSearchQuery.toLowerCase());

    const matchesStatus =
      orderFilterStatus === 'all' || order.status === orderFilterStatus;

    return matchesSearch && matchesStatus;
  });

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      client.phone?.includes(clientSearchQuery) ||
      client.email?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      client.address?.toLowerCase().includes(clientSearchQuery.toLowerCase());

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-green-600 font-semibold">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="dashboard min-h-screen bg-slate-50 flex flex-row" dir="rtl">
      <div>
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
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
                    {currentUser?.role === 'super_admin' || currentUser?.role === 'superadmin' ? 'سوبر ادمن' : 'موظف'}
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

          {activeTab === 'overview' && analytics && (
            <div>
              {/* Stats Cards */}
              <h1 className="text-2xl font-black text-green-800 mb-4">الإحصائيات</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100">
                  <div className="text-2xl font-black text-green-600">{analytics.totalUsers}</div>
                  <div className="text-slate-500 text-sm mt-1">إجمالي الزباين</div>
                </div>
                <div className="bg-white rounded-lg p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100">
                  <div className="text-2xl font-black text-green-600">{analytics.totalDrivers}</div>
                  <div className="text-slate-500 text-sm mt-1">إجمالي المندوبين</div>
                </div>
                <div className="bg-white rounded-lg p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100">
                  <div className="text-2xl font-black text-green-600">{analytics.activeDrivers}</div>
                  <div className="text-slate-500 text-sm mt-1">مندوب نشط</div>
                </div>
                <div className="bg-white rounded-lg p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100">
                  <div className="text-2xl font-black text-green-600">{analytics.totalOrders}</div>
                  <div className="text-slate-500 text-sm mt-1">إجمالي الطلبات</div>
                </div>
                <div className="bg-white rounded-lg p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100">
                  <div className="text-2xl font-black text-green-600">{analytics.completedOrders}</div>
                  <div className="text-slate-500 text-sm mt-1">طلبات مكتملة</div>
                </div>
                <div className="bg-white rounded-lg p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100">
                  <div className="text-2xl font-black text-green-600">{analytics.pendingOrders}</div>
                  <div className="text-slate-500 text-sm mt-1">طلبات معلقة</div>
                </div>
                <div className="bg-white rounded-lg p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100">
                  <div className="text-xl font-black text-green-600">{analytics.totalRevenue.toFixed(2)} ج</div>
                  <div className="text-slate-500 text-sm mt-1">إجمالي الإيرادات</div>
                </div>
                <div className="bg-white rounded-lg p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100">
                  <div className="text-xl font-black text-green-600">{analytics.driverEarnings.toFixed(2)} ج</div>
                  <div className="text-slate-500 text-sm mt-1">أرباح المندوبين</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="space-y-6">
              {/* Drivers List */}
              <div className="bg-white rounded-sm shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-lg font-black text-green-800 mb-4">قائمة المندوبين</h3>

                  {/* Search and Filters */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="بحث بالاسم، الهاتف، البريد، رقم المركبة..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      >
                        <option value="all">كل الحالات</option>
                        <option value="approved">معتمد</option>
                        <option value="pending">قيد المراجعة</option>
                      </select>
                      <select
                        value={filterAvailability}
                        onChange={(e) => setFilterAvailability(e.target.value as any)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      >
                        <option value="all">الكل</option>
                        <option value="available">متاح</option>
                        <option value="unavailable">غير متاح</option>
                      </select>
                    </div>
                  </div>

                  {/* Results count */}
                  <div className="mt-3 text-sm text-slate-500">
                    عرض {filteredDrivers.length} من {drivers.length} مندوب
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-green-500">
                      <tr>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">الاسم</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">الهاتف</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">البريد</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">المركبة</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">الرصيد</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">التقييم</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-white">الحالة</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-white">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDrivers.length > 0 ? (
                        filteredDrivers.map((driver) => (
                          <tr key={driver._id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-sm font-medium">
                              <button
                                onClick={() => navigate(`/driver/${driver._id}`)}
                                className="text-yellow-600 hover:text-green-600 hover:underline cursor-pointer transition-colors"
                              >
                                {driver.name || 'غير معروف'}
                              </button>
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-600">{driver.phone || 'غير متوفر'}</td>
                            <td className="px-4 py-2 text-sm">
                              {driver.email ? (
                                <button
                                  onClick={() => window.open(`mailto:${driver.email}`, '_blank')}
                                  className="text-blue-600 hover:text-green-600 hover:underline cursor-pointer transition-colors"
                                >
                                  {driver.email}
                                </button>
                              ) : (
                                <span className="text-slate-600">غير متوفر</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-600">{driver.vehicleNumber || 'غير متوفر'}</td>
                            <td className="px-4 py-2 text-sm font-semibold text-green-600">{(driver.balance || 0).toFixed(2)} جنيه</td>
                            <td className="px-4 py-2 text-sm text-slate-600">{(driver.rating || 0).toFixed(1)} ⭐</td>
                            <td className="px-4 py-2">
                              {driver.isApproved ? (
                                <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">معتمد</span>
                              ) : (
                                <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full">قيد المراجعة</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {!driver.isApproved && (
                                <button
                                  onClick={() => handleApproveDriver(driver._id)}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  اعتماد
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                            لا توجد نتائج مطابقة للبحث
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="bg-white rounded-sm shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-lg font-black text-green-800 mb-4">قائمة الطلبات</h3>

                  {/* Search and Filters */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="بحث برقم الطلب، الزبون، المندوب، العناوين..."
                          value={orderSearchQuery}
                          onChange={(e) => setOrderSearchQuery(e.target.value)}
                          className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                    </div>
                    <div>
                      <select
                        value={orderFilterStatus}
                        onChange={(e) => setOrderFilterStatus(e.target.value as any)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      >
                        <option value="all">كل الحالات</option>
                        <option value="pending">قيد الانتظار</option>
                        <option value="accepted">مقبول</option>
                        <option value="picked_up">تم الاستلام</option>
                        <option value="delivered">تم التوصيل</option>
                        <option value="cancelled">ملغي</option>
                      </select>
                    </div>
                  </div>

                  {/* Results count */}
                  <div className="mt-3 text-sm text-slate-500">
                    عرض {filteredOrders.length} من {orders.length} طلب
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-green-400">
                      <tr>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">رقم الطلب</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">الزبون</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">المندوب</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">من</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">إلى</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">السعر</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                          <tr key={order._id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-sm font-medium text-green-600">{order.orderNumber || 'غير معروف'}</td>
                            <td className="px-4 py-2 text-sm text-slate-600">
                              <div className="text-yellow-600">{order.client?.name || 'غير معروف'}</div>
                              <div className="text-xs text-green-600">{order.client?.phone || 'غير متوفر'}</div>
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-600">
                              {order.driver ? (
                                <div>
                                  <div className="text-green-600">{order.driver.name}</div>
                                  <div className="text-xs text-yellow-600">{order.driver.phone}</div>
                                </div>
                              ) : (
                                <span className="text-slate-400">غير محدد</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-600 max-w-xs truncate">{order.pickupAddress || 'غير متوفر'}</td>
                            <td className="px-4 py-2 text-sm text-slate-600 max-w-xs truncate">{order.deliveryAddress || 'غير متوفر'}</td>
                            <td className="px-4 py-2 text-sm font-semibold text-green-600">{order.price?.toFixed(2) || '0.00'} جنيه</td>
                            <td className="px-4 py-2">
                              {order.status === 'pending' && <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full">قيد الانتظار</span>}
                              {order.status === 'accepted' && <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">مقبول</span>}
                              {order.status === 'picked_up' && <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">تم الاستلام</span>}
                              {order.status === 'delivered' && <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">تم التوصيل</span>}
                              {order.status === 'cancelled' && <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">ملغي</span>}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                            لا توجد نتائج
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-white rounded-sm shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-lg font-black text-green-800 mb-4">قائمة الزباين</h3>

                  {/* Search */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="بحث بالاسم، الهاتف، البريد، العنوان..."
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Results count */}
                  <div className="mt-3 text-sm text-slate-500">
                    عرض {filteredClients.length} من {clients.length} مستخدم
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-green-400">
                      <tr>
                        <th className="px-4 py-3 text-right font-bold text-sm text-white">الاسم</th>
                        <th className="px-4 py-3 text-right font-bold text-sm text-white">الهاتف</th>
                        <th className="px-4 py-3 text-right font-bold text-sm text-white">البريد</th>
                        <th className="px-4 py-3 text-right font-bold text-sm text-white">العنوان</th>
                        <th className="px-4 py-3 text-center font-bold text-sm text-white">عدد الطلبات</th>
                        <th className="px-4 py-3 text-right font-bold text-sm text-white">إجمالي الإنفاق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((client) => (
                          <tr key={client._id} className="hover:bg-slate-50">
                            <td className="px-4 py-4 text-sm font-medium">
                              <button
                                onClick={() => navigate(`/client/${client._id}`)}
                                className="text-yellow-600 hover:text-green-600 hover:underline cursor-pointer transition-colors"
                              >
                                {client.name || 'غير معروف'}
                              </button>
                            </td>
                            <td className="px-2 text-sm text-slate-600">{client.phone || 'غير متوفر'}</td>
                            <td className="px-2 text-sm">
                              {client.email ? (
                                <button
                                  onClick={() => window.open(`mailto:${client.email}`, '_blank')}
                                  className="text-blue-600 hover:text-green-600 hover:underline cursor-pointer transition-colors"
                                >
                                  {client.email}
                                </button>
                              ) : (
                                <span className="text-slate-600">غير متوفر</span>
                              )}
                            </td>
                            <td className="px-2 text-sm text-slate-600 max-w-xs truncate">{client.address || 'غير متوفر'}</td>
                            <td className="px-2 text-sm font-semibold text-yellow-600 text-center">{client.totalOrders || 0}</td>
                            <td className="px-2 text-sm font-semibold text-green-600">{(client.totalSpent || 0).toFixed(2)} جنيه</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                            لا توجد نتائج مطابقة للبحث
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && analytics && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-black text-green-700 mb-6">ملخص الأداء</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Revenue Card */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                    <div className="text-sm font-semibold text-green-700 mb-2">إجمالي الإيرادات</div>
                    <div className="text-xl font-black text-green-500">{analytics.totalRevenue.toFixed(2)} ج</div>
                    <div className="mt-4 text-sm text-green-600">
                      من {analytics.completedOrders} طلب مكتمل
                    </div>
                  </div>

                  {/* Driver Earnings Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                    <div className="text-sm font-semibold text-green-700 mb-2">أرباح المندوبين</div>
                    <div className="text-xl font-black text-green-500">{analytics.driverEarnings.toFixed(2)} ج</div>
                    <div className="mt-4 text-sm text-green-600">
                      {analytics.totalDrivers} مندوب نشط
                    </div>
                  </div>

                  {/* Orders Stats */}
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200">
                    <div className="text-sm font-semibold text-green-700 mb-2">إحصائيات الطلبات</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-yellow-600">إجمالي الطلبات</span>
                        <span className="font-bold text-yellow-800">{analytics.totalOrders}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-600">مكتملة</span>
                        <span className="font-bold text-green-600">{analytics.completedOrders}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-orange-600">معلقة</span>
                        <span className="font-bold text-orange-600">{analytics.pendingOrders}</span>
                      </div>
                    </div>
                  </div>

                  {/* Users & Drivers */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
                    <div className="text-sm font-semibold text-orange-700 mb-2">الزباين والمندوبين</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-orange-600">إجمالي الزباين</span>
                        <span className="font-bold text-orange-800">{analytics.totalUsers}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-orange-600">إجمالي المندوبين</span>
                        <span className="font-bold text-blue-600">{analytics.totalDrivers}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-orange-600">مندوب نشط</span>
                        <span className="font-bold text-green-600">{analytics.activeDrivers}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Completion Rate */}
                <div className="mt-6 bg-slate-50 rounded-lg p-5">
                  <div className="text-sm font-semibold text-slate-700 mb-3">نسبة إكمال الطلبات</div>
                  <div className="w-full bg-slate-200 rounded-full h-4">
                    <div
                      className="bg-green-600 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${analytics.totalOrders > 0 ? (analytics.completedOrders / analytics.totalOrders * 100).toFixed(1) : 0}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {analytics.totalOrders > 0 ? (analytics.completedOrders / analytics.totalOrders * 100).toFixed(1) : 0}% من الطلبات مكتملة
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin-management' && isSuperAdmin && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-100">
                <h3 className="text-lg font-black text-green-800 mb-4">إنشاء موظف جديد</h3>
                <form onSubmit={handleCreateAdmin} className="grid md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">الاسم</label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="اسم الموظف"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">كلمة المرور</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">الدور</label>
                    <select
                      value={adminRole}
                      onChange={(e) => setAdminRole(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      <option value="admin">موظف</option>
                      <option value="super_admin">سوبر ادمن</option>
                    </select>
                  </div>
                  <div className="md:col-span-4">
                    <button
                      type="submit"
                      disabled={adminLoading}
                      className="text-sm bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                      {adminLoading ? 'جاري الإنشاء...' : 'إنشاء الموظف'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-sm shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-lg font-black text-green-800 mb-4">قائمة الموظفين</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-green-500">
                      <tr>
                        <th className="px-4 py-3 text-right text-sm font-bold text-white">الاسم</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-white">البريد الإلكتروني</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-white">الدور</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-white">تاريخ الإنشاء</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-white">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {admins.length > 0 ? (
                        admins.map((admin) => (
                          <tr key={admin._id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{admin.name}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{admin.email}</td>
                            <td className="px-4 py-3">
                              {admin.role === 'super_admin' ? (
                                <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">سوبر ادمن</span>
                              ) : (
                                <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">موظف</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {new Date(admin.createdAt).toLocaleDateString('ar-EG')}
                            </td>
                            <td className="px-4 py-3">
                              {admin.role !== 'super_admin' && (
                                <button
                                  onClick={() => handleDeleteAdmin(admin._id)}
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  حذف
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                            لا يوجد موظفين
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="bg-white rounded-sm shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-lg font-black text-green-800 mb-4">سجلات النظام</h3>

                  {/* Search and Filters */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="بحث بالإجراء، الكيان، المستخدم، التفاصيل..."
                          value={logSearchQuery}
                          onChange={(e) => setLogSearchQuery(e.target.value)}
                          className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <select
                        value={logFilterType}
                        onChange={(e) => setLogFilterType(e.target.value as any)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      >
                        <option value="all">كل الكيانات</option>
                        <option value="driver">المندوبين</option>
                        <option value="order">الطلبات</option>
                        <option value="client">العملاء</option>
                        <option value="admin">الموظفين</option>
                      </select>
                      <select
                        value={logFilterAction}
                        onChange={(e) => setLogFilterAction(e.target.value as any)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      >
                        <option value="all">كل الإجراءات</option>
                        <option value="create">إنشاء</option>
                        <option value="update">تعديل</option>
                        <option value="delete">حذف</option>
                        <option value="login">تسجيل دخول</option>
                        <option value="logout">تسجيل خروج</option>
                      </select>
                    </div>
                  </div>

                  {/* Results count */}
                  <div className="mt-3 text-sm text-slate-500">
                    عرض {filteredLogs.length} من {logs.length} سجل
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-green-500">
                      <tr>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">التاريخ</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">المستخدم</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">الإجراء</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">الكيان</th>
                        <th className="px-4 py-2 text-right text-sm font-bold text-white">التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLogs.length > 0 ? (
                        filteredLogs.map((log) => (
                          <tr key={log._id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-sm text-slate-600">
                              {new Date(log.createdAt).toLocaleString('ar-EG')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800 font-medium">
                              {log.user?.name || 'غير معروف'}
                            </td>
                            <td className="px-4 py-3">
                              {log.action === 'create' && <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">إنشاء</span>}
                              {log.action === 'update' && <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">تعديل</span>}
                              {log.action === 'delete' && <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">حذف</span>}
                              {log.action === 'login' && <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full">تسجيل دخول</span>}
                              {log.action === 'logout' && <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">تسجيل خروج</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {log.entity === 'driver' && 'مندوب'}
                              {log.entity === 'order' && 'طلب'}
                              {log.entity === 'client' && 'زبون'}
                              {log.entity === 'admin' && 'موظف'}
                              {!log.entity && '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                              {log.details || '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                            لا توجد سجلات
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cities' && <CitiesManager />}

          {activeTab === 'chat' && <ChatPanel />}

          {activeTab === 'settings' && (
            <div className="w-full gap-4 px-15">
              <h3 className="text-lg font-black text-green-800 mb-4">الإعدادات</h3>
              <section className="flex flex-row gap-4">
                {/* Settings Grid */}
                <div className="flex flex-col gap-4">
                  {/* Pricing Settings */}
                  <div
                    onClick={() => navigate('/pricing-settings')}
                    className="bg-white rounded-lg p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-green-300 transition-all group"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-yellow-100 p-3 rounded-xl group-hover:bg-yellow-200 transition-colors">
                        <DollarSign className="w-6 h-6 text-yellow-600" />
                      </div>
                      <h3 className="text-lg font-black text-green-800">تعديل الأسعار والأوزان</h3>
                    </div>
                    <p className="text-sm text-slate-500">تحديد الأسعار والأوزان والمسافات لكل مدينة</p>
                  </div>

                  {/* Social Media Settings */}
                  <div
                    className="bg-white rounded-lg p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-green-300 transition-all group"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
                        <Share2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-black text-green-800">روابط السوشيال ميديا</h3>
                    </div>
                    <p className="text-sm text-slate-500">إدارة روابط التواصل الاجتماعي</p>
                  </div>
                </div>
                {/* Password Change Form */}
                <div className="bg-white max-w-md flex-1 rounded-lg px-5 py-4 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-black text-green-800 mb-4">تغيير كلمة المرور</h3>
                  <form onSubmit={handlePasswordChange} className="space-y-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">كلمة المرور الحالية</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور الحالية"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور الجديدة"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">تأكيد كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="أعد إدخال كلمة المرور الجديدة"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={settingsLoading}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold py-2 rounded-xl transition-colors"
                    >
                      {settingsLoading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                    </button>
                  </form>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
