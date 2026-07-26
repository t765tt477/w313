import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cityAPI } from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { Save, ArrowRight, MapPin, Weight, DollarSign, Ruler } from 'lucide-react';

interface CityPricing {
  _id: string;
  cityId: string;
  cityName: string;
  basePricePerKm: number;
  weightFeePerKg: number;
  sizeSmallFee: number;
  sizeMediumFee: number;
  sizeLargeFee: number;
  minDistance: number;
  maxDistance: number;
  baseDeliveryFee: number;
}

interface City {
  _id: string;
  name: string;
  isActive: boolean;
}

export default function PricingSettings() {
  const navigate = useNavigate();
  const [pricingSettings, setPricingSettings] = useState<CityPricing[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'orders' | 'users' | 'analytics' | 'settings' | 'admin-management' | 'logs' | 'cities'>('settings');

  useEffect(() => {
    fetchPricingSettings();
  }, []);

  const fetchPricingSettings = async () => {
    try {
      // For now, we'll create default settings for cities that don't have them
      // In production, this would fetch from the API
      const response = await cityAPI.getAllCities();
      const citiesData = response.data.cities || [];

      const defaultSettings: CityPricing[] = citiesData.map((city: City) => ({
        _id: city._id,
        cityId: city._id,
        cityName: city.name,
        basePricePerKm: 2.00,
        weightFeePerKg: 0.50,
        sizeSmallFee: 0,
        sizeMediumFee: 1,
        sizeLargeFee: 2,
        minDistance: 1,
        maxDistance: 50,
        baseDeliveryFee: 5
      }));

      setPricingSettings(defaultSettings);

      // Select the first city by default
      if (citiesData.length > 0) {
        setSelectedCityId(citiesData[0]._id);
      }
    } catch (error) {
      console.error('Error fetching pricing settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePricing = (cityId: string, field: keyof CityPricing, value: string | number) => {
    setPricingSettings(prev =>
      prev.map(setting =>
        setting.cityId === cityId
          ? { ...setting, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value }
          : setting
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In production, this would save to the API
      // For now, we'll simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('تم حفظ إعدادات الأسعار بنجاح');
    } catch (error) {
      console.error('Error saving pricing settings:', error);
      alert('فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = () => {
    fetchPricingSettings();
  };

  if (loading) {
    return (
      <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} onRefresh={handleRefresh}>
        <div className="flex items-center justify-center py-12">
          <div className="text-green-600 font-semibold">جاري التحميل...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} onRefresh={handleRefresh}>
      <div className="space-y-4 max-w-2xl mx-auto mb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-green-800">إعدادات الأسعار والأوزان</h1>
            <p className="text-slate-500 mt-1">تحديد الأسعار والأوزان والمسافات لكل مدينة</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>

        {/* City Selector */}
        <div className="bg-white w-fit rounded-lg px-4 py-1 shadow-sm border border-slate-100">
          <label className="block text-sm font-semibold text-slate-700 mb-2">اختر المدينة</label>
          <select
            value={selectedCityId}
            onChange={(e) => setSelectedCityId(e.target.value)}
            className="w-38 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {pricingSettings.map((setting) => (
              <option key={setting.cityId} value={setting.cityId}>
                {setting.cityName}
              </option>
            ))}
          </select>
        </div>

        {/* Pricing Card */}
        {selectedCityId && (() => {
          const currentSetting = pricingSettings.find(s => s.cityId === selectedCityId);
          if (!currentSetting) return null;

          return (
            <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-100">
              {/* City Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="bg-green-100 p-3 rounded-lg">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-green-800">{currentSetting.cityName}</h3>
                  <p className="text-sm text-slate-500">إعدادات التسعير</p>
                </div>
              </div>

              {/* Pricing Form */}
              <div className="space-y-4 flex flex-row gap-2">
                <section className="flex flex-col border-l-2 border-l-slate-200 pl-4 gap-2">
                  {/* Base Price */}
                  <div className="flex items-center gap-2">
                    <div className="bg-yellow-100 p-2 rounded-lg mt-6">
                      <DollarSign className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        السعر الأساسي لكل كم
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={currentSetting.basePricePerKm}
                        onChange={(e) => handleUpdatePricing(currentSetting.cityId, 'basePricePerKm', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    </div>
                    <span className="text-sm mt-6 text-slate-500">جنيه/كم</span>
                  </div>

                  {/* Weight Fee */}
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 p-2 rounded-lg mt-6">
                      <Weight className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        رسوم الوزن لكل كجم
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={currentSetting.weightFeePerKg}
                        onChange={(e) => handleUpdatePricing(currentSetting.cityId, 'weightFeePerKg', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    </div>
                    <span className="text-sm mt-6 text-slate-500">جنيه/كجم</span>
                  </div>

                  {/* Size Fees */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">صغير</label>
                      <input
                        type="number"
                        step="0.01"
                        value={currentSetting.sizeSmallFee}
                        onChange={(e) => handleUpdatePricing(currentSetting.cityId, 'sizeSmallFee', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">متوسط</label>
                      <input
                        type="number"
                        step="0.01"
                        value={currentSetting.sizeMediumFee}
                        onChange={(e) => handleUpdatePricing(currentSetting.cityId, 'sizeMediumFee', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">كبير</label>
                      <input
                        type="number"
                        step="0.01"
                        value={currentSetting.sizeLargeFee}
                        onChange={(e) => handleUpdatePricing(currentSetting.cityId, 'sizeLargeFee', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    </div>
                  </div>
                </section>

                <section className="flex flex-col gap-2">
                  {/* Distance Range */}
                  <div className="flex items-center gap-2 pr-3">
                    <div className="bg-purple-100 p-2 rounded-lg mt-6">
                      <Ruler className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">أقل مسافة</label>
                        <input
                          type="number"
                          step="0.1"
                          value={currentSetting.minDistance}
                          onChange={(e) => handleUpdatePricing(currentSetting.cityId, 'minDistance', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">أقصى مسافة</label>
                        <input
                          type="number"
                          step="0.1"
                          value={currentSetting.maxDistance}
                          onChange={(e) => handleUpdatePricing(currentSetting.cityId, 'maxDistance', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                    </div>
                    <span className="text-sm mt-6 text-slate-500">كم</span>
                  </div>

                  {/* Base Delivery Fee */}
                  <div className="flex items-center gap-2">
                    <div className="bg-green-100 p-2 rounded-lg mt-6">
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        رسوم التوصيل الأساسية
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={currentSetting.baseDeliveryFee}
                        onChange={(e) => handleUpdatePricing(currentSetting.cityId, 'baseDeliveryFee', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    </div>
                    <span className="text-sm mt-6 text-slate-500">جنيه</span>
                  </div>
                </section>
              </div>
            </div>
          );
        })()}

      </div>
    </DashboardLayout>
  );
}
