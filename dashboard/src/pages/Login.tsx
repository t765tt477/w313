import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="login-container bg-white rounded-xl w-full max-w-sm gap-4 overflow-hidden">
        <section className="login-header w-full bg-green-500/20 p-4 rounded-b-3xl">
          {/* Logo */}
          <div className="flex justify-center items-center gap-2 p-2 mb-4">
            <div className="logo">
              <img src="https://res.cloudinary.com/efc2cuqx/image/upload/f_auto/q_auto/wasal_jilzjp.png" alt="" />
            </div>
            <h1 className="text-2xl font-black text-green-600 text-center">
              لوحة تحكم
            </h1>
            <h1 className="text-2xl font-black text-yellow-600">وصل</h1>
          </div>


          <p className="text-sm text-yellow-600 text-center mb-2">
            هذا النافذة مخصصة للمشرفين فقط
          </p>
          <p className="text-sm text-slate-600 text-center">
            إذا لم تتمكن من تسجيل الدخول، يرجى التواصل مع الإدارة
          </p>
        </section>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 w-full p-4">
          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@wasal.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
