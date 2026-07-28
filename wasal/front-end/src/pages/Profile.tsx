import { useState } from "react"
import { Eye, EyeOff, X, Lock } from "lucide-react"
import { userAPI } from "../services/api"

interface ProfileProps {
  user: any
  onLogout: () => void
}

export default function Profile({ user, onLogout }: ProfileProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")

  const closePasswordModal = () => {
    setShowPasswordModal(false)
    setPasswordForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" })
    setPasswordMessage("")
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      setPasswordMessage("فشل: يرجى تعبئة جميع الحقول")
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage("فشل: كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل")
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordMessage("فشل: كلمة المرور الجديدة غير متطابقة")
      return
    }

    setPasswordLoading(true)
    setPasswordMessage("")
    try {
      // Only sends the current/new password - no other account data is touched.
      await userAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordMessage("تم تغيير كلمة المرور بنجاح")
      setPasswordForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" })
      setTimeout(() => closePasswordModal(), 1200)
    } catch (error: any) {
      setPasswordMessage(`فشل: ${error?.response?.data?.message || "تعذر تغيير كلمة المرور"}`)
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="top-spacing max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
      <div className="mb-8">
        <h1 className="text-sm font-black text-slate-900">البيانات الشخصية</h1>
        <p className="text-slate-500 mt-1">
          إدارة حسابك ومعلوماتك الشخصية
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-100 rounded-lg shadow-sm p-4 mb-4">
            <div className="flex flex-row gap-4">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt="Profile"
                  className="w-32 h-32 rounded-lg object-cover mb-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-32 h-32 bg-green-600 rounded-lg flex items-center justify-center text-white font-black text-3xl mb-4">
                  {user?.name?.[0] || 'م'}
                </div>
              )}
              <section className="flex flex-col">
                <h3 className="font-black text-slate-900 text-lg">{user?.name || 'غير معروف'}</h3>
                <p className="text-sm text-slate-500 mt-1">{user?.email || ''}</p>
                <p className="text-sm text-slate-500">{user?.phone || ''}</p>
                <p className="text-sm text-slate-500">{user?.city?.name || ''}</p>
                <span className="mt-3 bg-green-100 text-green-700 font-semibold text-xs px-3 py-1 rounded-full">
                  {user?.role === 'driver' ? 'مندوب' : 'زبون'}
                </span>
              </section>
            </div>

            <button
              onClick={onLogout}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-xl transition-colors text-sm"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>

        {/* Account Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
            <h2 className="text-sm font-black text-slate-900 mb-6">الإعدادات</h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>


                  <div className="text-right">
                    <div className="font-semibold text-slate-900 text-sm">تغيير كلمة المرور</div>
                    <div className="text-xs text-slate-500">تحديث كلمة المرور الخاصة بك</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CHANGE PASSWORD MODAL ─── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Lock size={18} className="text-blue-600" />
                تغيير كلمة المرور
              </h2>
              <button
                onClick={closePasswordModal}
                className="text-slate-400 hover:text-slate-600"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-sm font-semibold text-slate-700 mb-2">
                  كلمة المرور الحالية
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    name="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="new-password" className="block text-sm font-semibold text-slate-700 mb-2">
                  كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    name="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-new-password" className="block text-sm font-semibold text-slate-700 mb-2">
                  تأكيد كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <input
                    id="confirm-new-password"
                    name="confirm-new-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={passwordForm.confirmNewPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {passwordMessage && (
                <div className={`text-sm px-1 ${passwordMessage.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                  {passwordMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {passwordLoading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
