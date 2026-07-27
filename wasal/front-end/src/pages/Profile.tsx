interface ProfileProps {
  user: any
  onLogout: () => void
}

export default function Profile({ user, onLogout }: ProfileProps) {
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
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <div className="flex flex-col items-center text-center mb-6">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover mb-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center text-white font-black text-3xl mb-4">
                  {user?.name?.[0] || 'م'}
                </div>
              )}
              <h3 className="font-black text-slate-900 text-lg">{user?.name || 'غير معروف'}</h3>
              <p className="text-sm text-slate-500 mt-1">{user?.email || ''}</p>
              <p className="text-sm text-slate-500">{user?.phone || ''}</p>
              <span className="mt-3 bg-green-100 text-green-700 font-semibold text-xs px-3 py-1 rounded-full">
                {user?.role === 'driver' ? 'مندوب' : 'زبون'}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors text-sm"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>

        {/* Account Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <h2 className="text-sm font-black text-slate-900 mb-6">الإعدادات</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
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
    </div>
  )
}
