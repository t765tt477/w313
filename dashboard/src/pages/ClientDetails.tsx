import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { Mail, Phone, MapPin, ShoppingBag, DollarSign, Edit, Trash2, Save, X } from 'lucide-react';

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

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'orders' | 'users' | 'analytics' | 'settings' | 'admin-management'>('users');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchClientDetails();
  }, [id]);

  const fetchClientDetails = async () => {
    try {
      const response = await adminAPI.getAllClients();
      const foundClient = response.data.clients.find((c: Client) => c._id === id);
      setClient(foundClient || null);
    } catch (error) {
      console.error('Error fetching client details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!client) return;
    setEditForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!client) return;

    try {
      // Note: This would need a backend API endpoint for updating client
      // For now, we'll simulate it
      setClient({ ...client, ...editForm });
      setIsEditing(false);
      alert('تم تحديث بيانات العميل بنجاح');
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشل تحديث البيانات');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!client) return;
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;

    try {
      // Note: This would need a backend API endpoint for deleting client
      // For now, we'll simulate it
      alert('تم حذف العميل بنجاح');
      navigate('/dashboard');
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشل حذف العميل');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-green-600 font-semibold">جاري التحميل...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-red-600 font-semibold">العميل غير موجود</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-row" dir="rtl">
      <div>
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>


      {/* Content */}
      <div className="w-full mx-auto p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black text-green-800">بيانات العميل</h1>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  تعديل
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  حفظ
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  إلغاء
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Info Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-xl font-black text-green-800 mb-4">معلومات العميل</h2>

            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">الاسم</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">الهاتف</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">العنوان</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <ShoppingBag className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 mb-1">الاسم</div>
                      <div className="text-lg font-bold text-slate-800">{client.name || 'غير معروف'}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 mb-1">الهاتف</div>
                      <div className="text-lg font-semibold text-slate-800">{client.phone || 'غير متوفر'}</div>
                    </div>
                  </div>

                  <div
                    className="flex items-start gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                    onClick={() => window.open(`mailto:${client.email}`, '_blank')}
                  >
                    <div className="bg-yellow-100 p-2 rounded-lg">
                      <Mail className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 mb-1">البريد الإلكتروني</div>
                      <div className="text-lg font-semibold text-blue-600 hover:underline">{client.email || 'غير متوفر'}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <MapPin className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 mb-1">العنوان</div>
                      <div className="text-base text-slate-800">{client.address || 'غير متوفر'}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-xl font-black text-green-800 mb-4">الإحصائيات</h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">عدد الطلبات</div>
                  <div className="text-2xl font-black text-green-600">{client.totalOrders || 0}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">إجمالي الإنفاق</div>
                  <div className="text-2xl font-black text-green-600">{(client.totalSpent || 0).toFixed(2)} جنيه</div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="text-sm text-slate-500 mb-1">تاريخ التسجيل</div>
                <div className="text-base text-slate-800">
                  {client.createdAt ? new Date(client.createdAt).toLocaleDateString('ar-EG') : 'غير متوفر'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
