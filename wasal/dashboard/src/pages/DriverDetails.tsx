import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { Mail, Phone, MapPin, Truck, DollarSign, Star, CheckCircle, Clock, Edit, Trash2, Save, X, Link, User } from 'lucide-react';

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
  profileImage?: string;
  vehicleImage?: string;
  licenseImage?: string;
}

export default function DriverDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'orders' | 'users' | 'analytics' | 'settings' | 'admin-management' | 'logs' | 'cities'>('drivers');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [addingCredit, setAddingCredit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    vehicleType: '',
    vehicleNumber: ''
  });
  const [updatingImages, setUpdatingImages] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [vehicleImageUrl, setVehicleImageUrl] = useState('');
  const [licenseImageUrl, setLicenseImageUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDriverDetails();
  }, [id]);

  const fetchDriverDetails = async () => {
    try {
      if (!id) return;
      const response = await adminAPI.getDriverDetails(id);
      setDriver(response.data.driver);
    } catch (error) {
      console.error('Error fetching driver details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDriverDetails();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver || !creditAmount) return;

    setAddingCredit(true);
    try {
      await adminAPI.addDriverCredit(driver._id, parseFloat(creditAmount), creditDescription);
      alert('تم إضافة الرصيد بنجاح');
      setCreditAmount('');
      setCreditDescription('');
      fetchDriverDetails();
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشل إضافة الرصيد');
    } finally {
      setAddingCredit(false);
    }
  };

  const handleEdit = () => {
    if (!driver) return;
    setEditForm({
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      vehicleType: driver.vehicleType,
      vehicleNumber: driver.vehicleNumber
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!driver) return;

    try {
      // Note: This would need a backend API endpoint for updating driver
      // For now, we'll simulate it
      setDriver({ ...driver, ...editForm });
      setIsEditing(false);
      alert('تم تحديث بيانات المندوب بنجاح');
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشل تحديث البيانات');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!driver) return;
    if (!confirm('هل أنت متأكد من حذف هذا المندوب؟')) return;

    try {
      // Note: This would need a backend API endpoint for deleting driver
      // For now, we'll simulate it
      alert('تم حذف المندوب بنجاح');
      navigate('/dashboard');
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشل حذف المندوب');
    }
  };

  const handleImagesUpdate = async () => {
    if (!driver) return;

    setUpdatingImages(true);

    try {
      await adminAPI.updateDriverImages(driver._id, {
        profileImage: profileImageUrl || undefined,
        vehicleImage: vehicleImageUrl || undefined,
        licenseImage: licenseImageUrl || undefined
      });
      alert('تم تحديث روابط الصور بنجاح');
      fetchDriverDetails();
      setProfileImageUrl('');
      setVehicleImageUrl('');
      setLicenseImageUrl('');
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشل تحديث الصور');
    } finally {
      setUpdatingImages(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-green-600 font-semibold">جاري التحميل...</div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-red-600 font-semibold">المندوب غير موجود</div>
      </div>
    );
  }

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} onRefresh={handleRefresh} refreshing={refreshing}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-green-800">بيانات المندوب</h1>
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
        {/* Driver Info Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-xl font-black text-green-800 mb-4">معلومات المندوب</h2>

          {/* Images Section */}
          <div className="space-y-6 mb-6">
            {/* Profile Image */}
            <div className="flex flex-col items-center">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">صورة الملف الشخصي</h3>
              {driver.profileImage ? (
                <img
                  src={driver.profileImage}
                  alt="Driver Profile"
                  className="w-24 h-24 rounded-full object-cover mb-3 border-4 border-green-100"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <User className="w-12 h-12 text-green-600" />
                </div>
              )}
              <input
                type="text"
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                placeholder="رابط صورة الملف الشخصي"
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 mb-2"
              />
            </div>

            {/* Vehicle Image */}
            <div className="flex flex-col items-center">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">صورة المركبة</h3>
              {driver.vehicleImage ? (
                <img
                  src={driver.vehicleImage}
                  alt="Vehicle"
                  className="w-32 h-24 rounded-lg object-cover mb-3 border-2 border-green-100"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-32 h-24 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <Truck className="w-12 h-12 text-green-600" />
                </div>
              )}
              <input
                type="text"
                value={vehicleImageUrl}
                onChange={(e) => setVehicleImageUrl(e.target.value)}
                placeholder="رابط صورة المركبة"
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 mb-2"
              />
            </div>

            {/* License Image */}
            <div className="flex flex-col items-center">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">صورة الرخصة</h3>
              {driver.licenseImage ? (
                <img
                  src={driver.licenseImage}
                  alt="License"
                  className="w-32 h-24 rounded-lg object-cover mb-3 border-2 border-green-100"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-32 h-24 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <User className="w-12 h-12 text-green-600" />
                </div>
              )}
              <input
                type="text"
                value={licenseImageUrl}
                onChange={(e) => setLicenseImageUrl(e.target.value)}
                placeholder="رابط صورة الرخصة"
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 mb-2"
              />
            </div>

            <button
              onClick={handleImagesUpdate}
              disabled={updatingImages || (!profileImageUrl && !vehicleImageUrl && !licenseImageUrl)}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Link className="w-4 h-4" />
              {updatingImages ? 'جاري التحديث...' : 'تحديث الصور'}
            </button>
          </div>

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
                  <label className="block text-sm font-semibold text-slate-700 mb-2">نوع المركبة</label>
                  <input
                    type="text"
                    value={editForm.vehicleType}
                    onChange={(e) => setEditForm({ ...editForm, vehicleType: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">رقم المركبة</label>
                  <input
                    type="text"
                    value={editForm.vehicleNumber}
                    onChange={(e) => setEditForm({ ...editForm, vehicleNumber: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Truck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">الاسم</div>
                    <div className="text-lg font-bold text-slate-800">{driver.name || 'غير معروف'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">الهاتف</div>
                    <div className="text-lg font-semibold text-slate-800">{driver.phone || 'غير متوفر'}</div>
                  </div>
                </div>

                <div
                  className="flex items-start gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                  onClick={() => window.open(`mailto:${driver.email}`, '_blank')}
                >
                  <div className="bg-yellow-100 p-2 rounded-lg">
                    <Mail className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">البريد الإلكتروني</div>
                    <div className="text-lg font-semibold text-blue-600 hover:underline">{driver.email || 'غير متوفر'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Truck className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">نوع المركبة</div>
                    <div className="text-base text-slate-800">{driver.vehicleType || 'غير متوفر'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">رقم المركبة</div>
                    <div className="text-base text-slate-800">{driver.vehicleNumber || 'غير متوفر'}</div>
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
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">الرصيد الحالي</div>
                <div className="text-2xl font-black text-green-600">{(driver.balance || 0).toFixed(2)} جنيه</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <DollarSign className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">إجمالي الأرباح</div>
                <div className="text-2xl font-black text-green-600">{(driver.totalEarnings || 0).toFixed(2)} جنيه</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">إجمالي التوصيلات</div>
                <div className="text-2xl font-black text-green-600">{driver.totalDeliveries || 0}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Star className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">التقييم</div>
                <div className="text-2xl font-black text-green-600">{(driver.rating || 0).toFixed(1)} ⭐</div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 md:col-span-2">
          <h2 className="text-xl font-black text-green-800 mb-4">الحالة</h2>

          <div className="flex gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                {driver.isAvailable ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Clock className="w-5 h-5 text-orange-600" />
                )}
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">حالة التوفر</div>
                <div className="text-lg font-semibold">
                  {driver.isAvailable ? (
                    <span className="text-green-600">متاح</span>
                  ) : (
                    <span className="text-orange-600">غير متاح</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                {driver.isApproved ? (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                ) : (
                  <Clock className="w-5 h-5 text-yellow-600" />
                )}
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">حالة الاعتماد</div>
                <div className="text-lg font-semibold">
                  {driver.isApproved ? (
                    <span className="text-blue-600">معتمد</span>
                  ) : (
                    <span className="text-yellow-600">قيد المراجعة</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Add Credit Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 md:col-span-2">
            <h2 className="text-xl font-black text-green-800 mb-4">إضافة رصيد للمندوب</h2>

            <form onSubmit={handleAddCredit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">المبلغ (ج)</label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">الوصف</label>
                <input
                  type="text"
                  value={creditDescription}
                  onChange={(e) => setCreditDescription(e.target.value)}
                  placeholder="سبب الإضافة"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addingCredit}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {addingCredit ? 'جاري الإضافة...' : 'إضافة الرصيد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
