import { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { cityAPI } from '../services/api';

interface City {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export default function CitiesManager() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCityName, setNewCityName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    setLoading(true);
    try {
      const res = await cityAPI.getAllCities();
      setCities(res.data.cities || []);
    } catch (err) {
      console.error('Error fetching cities:', err);
    }
    setLoading(false);
  };

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    setAdding(true);
    setError('');
    try {
      await cityAPI.createCity(newCityName.trim());
      setNewCityName('');
      await fetchCities();
    } catch (err: any) {
      setError(err.response?.data?.message || 'تعذر إضافة المدينة');
    }
    setAdding(false);
  };

  const handleToggleActive = async (city: City) => {
    try {
      await cityAPI.updateCity(city._id, { isActive: !city.isActive });
      setCities((prev) => prev.map((c) => c._id === city._id ? { ...c, isActive: !c.isActive } : c));
    } catch (err: any) {
      setError(err.response?.data?.message || 'تعذر تحديث المدينة');
    }
  };

  const startEditing = (city: City) => {
    setEditingId(city._id);
    setEditingName(city.name);
  };

  const handleSaveEdit = async (cityId: string) => {
    if (!editingName.trim()) return;
    try {
      await cityAPI.updateCity(cityId, { name: editingName.trim() });
      setCities((prev) => prev.map((c) => c._id === cityId ? { ...c, name: editingName.trim() } : c));
      setEditingId(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'تعذر تعديل اسم المدينة');
    }
  };

  const handleDelete = async (cityId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المدينة؟ لن يعود بإمكان الزباين الجدد اختيارها.')) return;
    try {
      await cityAPI.deleteCity(cityId);
      setCities((prev) => prev.filter((c) => c._id !== cityId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'تعذر حذف المدينة');
    }
  };

  return (
    <div className="w-full px-4 lg:px-15">
      <h3 className="text-lg font-black text-green-800 mb-2">المدن المتاحة للخدمة</h3>
      <p className="text-sm text-slate-500 mb-6">
        هذه المدن هي التي تظهر للزبائن والمندوبين عند إنشاء حساب جديد. عطّل مدينة لإيقاف الخدمة فيها مؤقتاً دون حذف بياناتها.
      </p>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-2xl">
        <form onSubmit={handleAddCity} className="flex gap-3 mb-6">
          <input
            type="text"
            value={newCityName}
            onChange={(e) => setNewCityName(e.target.value)}
            placeholder="اسم مدينة جديدة، مثال: القاهرة"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            type="submit"
            disabled={adding || !newCityName.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة
          </button>
        </form>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>
        )}

        {loading ? (
          <div className="text-center text-slate-400 py-10">جارٍ التحميل...</div>
        ) : cities.length === 0 ? (
          <div className="text-center text-slate-400 py-10">لا توجد مدن مضافة بعد</div>
        ) : (
          <div className="space-y-2">
            {cities.map((city) => (
              <div
                key={city._id}
                className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <MapPin className={`w-4 h-4 shrink-0 ${city.isActive ? 'text-green-600' : 'text-slate-400'}`} />
                  {editingId === city._id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      autoFocus
                    />
                  ) : (
                    <span className={`font-semibold text-sm truncate ${city.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                      {city.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {editingId === city._id ? (
                    <>
                      <button onClick={() => handleSaveEdit(city._id)} className="p-1.5 hover:bg-green-100 rounded-lg text-green-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggleActive(city)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${city.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                          }`}
                      >
                        {city.isActive ? 'مفعّلة' : 'موقوفة'}
                      </button>
                      <button onClick={() => startEditing(city)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(city._id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
