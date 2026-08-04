import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock } from 'lucide-react';
import { authAPI } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);

      if (response.data.user.role !== 'admin' && response.data.user.role !== 'superadmin' && response.data.user.role !== 'super_admin') {
        setError('غير مصرح لك بالدخول إلى لوحة التحكم');
        setLoading(false);
        return;
      }

      localStorage.setItem('adminToken', response.data.token);
      localStorage.setItem('adminUser', JSON.stringify(response.data.user));
      window.dispatchEvent(new Event('auth-change'));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen wasal-gradient-soft flex items-center justify-center p-4" dir="rtl">
      <div className="login-container bg-card rounded-3xl w-full max-w-sm overflow-hidden">
        <section className="login-header wasal-gradient w-full p-6 rounded-b-[2rem]">
          {/* Logo */}
          <div className="flex justify-center items-center gap-2 mb-3">
            <div className="logo">
              <img
                src="https://res.cloudinary.com/efc2cuqx/image/upload/f_auto/q_auto/wasal_jilzjp.png"
                alt="شعار وصل"
              />
            </div>
            <h1 className="text-2xl font-black text-white">لوحة تحكم</h1>
            <h1 className="text-3xl font-black text-gold-200">وصل</h1>
          </div>

          <p className="text-sm text-white/90 text-center font-semibold mb-1">
            هذه النافذة مخصصة للمشرفين فقط
          </p>
          <p className="text-xs text-white/75 text-center">
            إذا لم تتمكن من تسجيل الدخول، يرجى التواصل مع الإدارة
          </p>
        </section>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-brand-700 mb-1.5">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@wasal.com"
                className="w-full border border-border rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-brand-700 mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-border rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full wasal-gradient hover:brightness-105 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
