import { useState, useEffect } from "react"
import { Car, MapPin } from "lucide-react"
import About from "./pages/About"
import Profile from "./pages/Profile"
import LocationPicker from "./components/LocationPicker"
import ImageUpload from "./components/ImageUpload"
import { authAPI, orderAPI, driverAPI } from "./services/api"

type View = "landing" | "client" | "driver" | "about" | "profile"

export default function App() {
  const [activeView, setActiveView] = useState<View>("landing")
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")
  const [driverStep, setDriverStep] = useState(1)
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [profileImage, setProfileImage] = useState<string>("")
  const [vehicleImage, setVehicleImage] = useState<string>("")
  const [licenseImage, setLicenseImage] = useState<string>("")

  // Auth state
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))

  // Orders state
  const [orders, setOrders] = useState<any[]>([])
  const [currentOrder, setCurrentOrder] = useState<any>(null)

  // Driver state
  const [driverProfile, setDriverProfile] = useState<any>(null)
  const [driverEarnings, setDriverEarnings] = useState<any[]>([])
  const [isDriverAvailable, setIsDriverAvailable] = useState(true)

  // Stats state
  const [stats, setStats] = useState({
    activeDrivers: 2400,
    customerSatisfaction: 98
  })

  // Form state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ name: '', phone: '', email: '', password: '' })
  const [driverForm, setDriverForm] = useState({
    name: '', phone: '', email: '', nationalId: '', birthDate: '', city: '',
    vehicleType: 'motorcycle', plateNumber: '', vehicleModel: '', vehicleYear: '', vehicleColor: '', chassisNumber: ''
  })
  const [orderForm, setOrderForm] = useState({ weight: 3, size: '1' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Load data on mount
  useEffect(() => {
    if (token) {
      loadUserData()
    }
  }, [token])

  // Poll for order status updates
  useEffect(() => {
    if (!currentOrder || currentOrder.status === 'delivered' || currentOrder.status === 'cancelled') {
      return
    }

    const pollInterval = setInterval(async () => {
      try {
        const res = await orderAPI.getOrderById(currentOrder._id)
        const updatedOrder = res.data.order

        if (updatedOrder.status !== currentOrder.status) {
          setCurrentOrder(updatedOrder)
          // Update orders list as well
          setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o))
        }
      } catch (error) {
        console.error('Error polling order status:', error)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [currentOrder?._id, currentOrder?.status])

  const loadUserData = async () => {
    try {
      const userRes = await authAPI.getMe()
      setUser(userRes.data.user)

      const ordersRes = await orderAPI.getUserOrders()
      setOrders(ordersRes.data.orders)
      if (ordersRes.data.orders.length > 0) {
        setCurrentOrder(ordersRes.data.orders[0])
      }

      if (userRes.data.user.role === 'driver') {
        const driverRes = await driverAPI.getProfile()
        setDriverProfile(driverRes.data.driver)
        setIsDriverAvailable(driverRes.data.driver.isAvailable)

        // Load earnings data
        try {
          const earningsRes = await driverAPI.getEarnings()
          setDriverEarnings(earningsRes.data.earnings || [])
        } catch (error) {
          console.error('Error loading earnings:', error)
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  // Auth handlers
  const handleLogin = async () => {
    setLoading(true)
    try {
      const res = await authAPI.login(loginForm.email, loginForm.password)
      setToken(res.data.token)
      localStorage.setItem('token', res.data.token)
      setUser(res.data.user)
      setMessage('تم تسجيل الدخول بنجاح')

      // Redirect based on user role
      if (res.data.user.role === 'driver') {
        setActiveView('driver')
      } else {
        setActiveView('client')
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل تسجيل الدخول')
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true)
    try {
      const res = await authAPI.register({
        ...registerForm,
        profileImage,
        role: 'client'
      })
      setMessage('تم إنشاء الحساب بنجاح. يرجى التحقق من OTP.')
      setActiveTab('login')
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل إنشاء الحساب')
    }
    setLoading(false)
  }

  // Order handlers
  const handleCreateOrder = async () => {
    if (!token) {
      setMessage('يرجى تسجيل الدخول أولاً')
      return
    }
    if (!pickupLocation || !deliveryLocation) {
      setMessage('يرجى تحديد مواقع الاستلام والتسليم')
      return
    }
    setLoading(true)
    try {
      const distance = calculateDistance(pickupLocation, deliveryLocation)
      const res = await orderAPI.createOrder({
        pickupLocation: {
          ...pickupLocation,
          contactName: user?.name,
          contactPhone: user?.phone
        },
        deliveryLocation: {
          ...deliveryLocation,
          contactName: user?.name,
          contactPhone: user?.phone
        },
        packageDetails: {
          weight: orderForm.weight,
          size: orderForm.size === '1' ? 'small' : orderForm.size === '2' ? 'medium' : 'large'
        },
        distance,
        paymentMethod: 'cash'
      })
      setCurrentOrder(res.data.order)
      setOrders([res.data.order, ...orders])
      setMessage('تم إنشاء الطلب بنجاح')
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل إنشاء الطلب')
    }
    setLoading(false)
  }

  const calculateDistance = (loc1: any, loc2: any) => {
    const R = 6371
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const calculatePrice = () => {
    if (!pickupLocation || !deliveryLocation) return { price: 0, distance: 0, time: 0 }

    const distance = calculateDistance(pickupLocation, deliveryLocation)
    const basePrice = distance * 2.00
    const weightFee = orderForm.weight * 0.50
    const sizeFee = orderForm.size === '1' ? 0 : orderForm.size === '2' ? 1 : 2
    const totalPrice = basePrice + weightFee + sizeFee
    const estimatedTime = Math.round(distance * 3 + 5) // دقيقة لكل كم + 5 دقائق ثابتة

    return {
      price: totalPrice.toFixed(2),
      distance: distance.toFixed(1),
      time: estimatedTime
    }
  }

  const priceEstimate = calculatePrice()

  // Driver handlers
  const handleDriverRegister = async () => {
    setLoading(true)
    try {
      const res = await authAPI.register({
        ...driverForm,
        profileImage,
        vehicleImage,
        licenseImage,
        role: 'driver'
      })
      setMessage('تم إرسال طلب التسجيل بنجاح')
      setDriverStep(1)
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل إرسال الطلب')
    }
    setLoading(false)
  }

  const handleToggleAvailability = async () => {
    try {
      await driverAPI.toggleAvailability()
      setIsDriverAvailable(!isDriverAvailable)
      if (driverProfile) {
        setDriverProfile({ ...driverProfile, isAvailable: !isDriverAvailable })
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل تحديث الحالة')
    }
  }

  const handleWithdrawEarnings = () => {
    setMessage('سيتم معالجة طلب السحب قريبًا')
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    setActiveView('landing')
    setCurrentOrder(null)
    setOrders([])
    setDriverProfile(null)
    setDriverEarnings([])
    setMessage('تم تسجيل الخروج بنجاح')
  }

  return (
    <div className="min-h-screen bg-white font-sans" dir="rtl">
      {/* Top Navigation */}
      <header className="fixed w-full top-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <button
              onClick={() => setActiveView("landing")}
              className="flex items-center gap-2 group"
            >
              <div className="w-9 h-9 rounded-lg over-flow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                <img className="rounded-lg w-full h-full" src="https://res.cloudinary.com/dxuxjz0tx/image/upload/v1784730022/photo-output_zz7bpc.png" alt="" />
              </div>
              <span className="text-xl font-black text-yellow-500 tracking-wide">
                وصل
              </span>
            </button>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { id: "client" as View, label: "تطبيق العميل" },
                { id: "driver" as View, label: "تطبيق المندوب" },
                { id: "about" as View, label: "عن وصل" },
                ...(token ? [{ id: "profile" as View, label: "البروفايل" }] : []),
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === item.id
                    ? "bg-yellow-400 text-green-800 shadow-sm"
                    : "text-yellow-500 hover:bg-yellow-50 hover:text-yellow-700"
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* CTA */}
            <button
              onClick={() => setActiveView("client")}
              className="bg-yellow-400 hover:bg-yellow-300 text-green-900 font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              ابدأ الآن
            </button>
          </div>
        </div>
      </header>

      {/* ─── LANDING PAGE ─── */}
      {activeView === "landing" && (
        <main>
          {/* Hero */}
          <section className="relative bg-gradient-to-br from-green-700 via-green-600 to-green-800 overflow-hidden">
            {/* Background pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at center, rgba(255,255,255,0.4) 1.5px, transparent 1.5px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="absolute top-0 left-0 w-80 h-80 bg-yellow-400 opacity-10 rounded-full -translate-x-40 -translate-y-20 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-300 opacity-20 rounded-full translate-x-32 translate-y-20 blur-3xl" />

            <div className="first-page top-spacing relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-full mb-6 border border-white/20">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    خدمة التوصيل السريع داخل المدينة
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-black text-white leading-tight mb-6">
                    وصّل طلبك
                    <br />
                    <span className="text-yellow-500">بسرعة وأمان</span>
                  </h1>
                  <p className="text-green-100 text-lg leading-relaxed mb-8 max-w-lg">
                    منصة وصل تربطك بأقرب المندوبين لتوصيل طلباتك داخل المدينة
                    بأسرع وقت ممكن، مع تتبع مباشر لكل لحظة.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setActiveView("client")}
                      className="bg-yellow-400 hover:bg-yellow-300 text-green-800 font-bold px-8 py-3.5 rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 text-base"
                    >
                      أرسل طلبًا الآن
                    </button>
                    <button
                      onClick={() => setActiveView("driver")}
                      className="bg-white/15 backdrop-blur-sm hover:bg-white/25 text-white font-semibold px-8 py-3.5 rounded-2xl border border-white/30 transition-all text-base"
                    >
                      انضم كمندوب
                    </button>
                  </div>
                </div>

                {/* Hero card mockup */}
                <div className="relative flex justify-center lg:justify-end">
                  <div className="w-full relative bg-white rounded-3xl shadow-2xl overflow-hidden">
                    {/* Map area */}
                    <div className="relative h-30 bg-gradient-to-br from-green-100 to-emerald-200 overflow-hidden">
                      {/* Fake map roads */}
                      <svg
                        className="absolute inset-0 w-full h-full"
                        viewBox="0 0 288 176"
                      >
                        <line
                          x1="0"
                          y1="88"
                          x2="288"
                          y2="88"
                          stroke="#4ade80"
                          strokeWidth="6"
                          strokeOpacity="0.4"
                        />
                        <line
                          x1="144"
                          y1="0"
                          x2="144"
                          y2="176"
                          stroke="#4ade80"
                          strokeWidth="4"
                          strokeOpacity="0.3"
                        />
                        <line
                          x1="0"
                          y1="44"
                          x2="200"
                          y2="44"
                          stroke="#86efac"
                          strokeWidth="3"
                          strokeOpacity="0.4"
                        />
                        <line
                          x1="80"
                          y1="44"
                          x2="80"
                          y2="176"
                          stroke="#86efac"
                          strokeWidth="3"
                          strokeOpacity="0.3"
                        />
                        <line
                          x1="200"
                          y1="0"
                          x2="200"
                          y2="130"
                          stroke="#86efac"
                          strokeWidth="3"
                          strokeOpacity="0.3"
                        />
                        <line
                          x1="0"
                          y1="130"
                          x2="288"
                          y2="130"
                          stroke="#86efac"
                          strokeWidth="3"
                          strokeOpacity="0.3"
                        />
                      </svg>
                      {/* Delivery route */}
                      <svg
                        className="absolute inset-0 w-full h-full"
                        viewBox="0 0 288 176"
                      >
                        <polyline
                          points="60,140 60,88 144,88 144,44 220,44"
                          fill="none"
                          stroke="#16a34a"
                          strokeWidth="3"
                          strokeDasharray="6,3"
                        />
                      </svg>
                      {/* Driver pin */}
                      <div className="absolute" style={{ left: 48, top: 124 }}>
                        <div className="w-9 h-9 bg-green-600 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4 fill-white"
                          >
                            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                          </svg>
                        </div>
                        <div className="w-2 h-2 bg-green-600 rounded-full mx-auto -mt-1" />
                      </div>
                      {/* Destination pin */}
                      <div className="absolute" style={{ left: 208, top: 28 }}>
                        <div className="w-8 h-8 bg-yellow-400 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4 fill-slate-800"
                          >
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    {/* Order info */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-black text-green-700 text-lg">
                          طلب #4821
                        </span>
                        <span className="bg-yellow-100 text-yellow-700 font-bold text-xs px-3 py-1 rounded-full">
                          جارٍ التوصيل
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>شارع الملك فهد — حي النزهة</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                          <span>شارع التحلية — حي الروضة</span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-green-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full w-3/5" />
                        </div>
                        <span className="text-xs font-semibold text-green-600">
                          8 دقائق
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Floating stat */}
                  <div className="absolute -right-4 top-4 bg-white rounded-2xl shadow-xl px-2 md:px-3 md:py-2 py-2 border border-green-50">
                    <div className="text-lg font-black text-green-600">
                      +{stats.activeDrivers.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      مندوب نشط
                    </div>
                  </div>
                  <div className="absolute -left-4 bottom-10 bg-yellow-400 rounded-2xl shadow-xl px-2 md:px-3 md:py-2 py-2">
                    <div className="text-lg font-black text-slate-900">
                      {stats.customerSatisfaction}%
                    </div>
                    <div className="text-xs text-slate-700 font-medium">
                      رضا العملاء
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </main>
      )}

      {/* ─── ABOUT PAGE ─── */}
      {activeView === "about" && <About />}

      {/* ─── PROFILE PAGE ─── */}
      {activeView === "profile" && <Profile user={user} onLogout={handleLogout} />}

      {/* ─── CLIENT APP ─── */}
      {activeView === "client" && (
        <div className="top-spacing max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="mb-8">
            <h1 className="text-sm font-black text-slate-900">تطبيق العميل</h1>
            <p className="text-slate-500 mt-1">
              أنشئ وتابع طلبات التوصيل بسهولة
            </p>
          </div>

          {!token ? (
            <>
              {/* Tab toggle */}
              <div className="inline-flex bg-slate-100 rounded-xl p-1 mb-8 gap-1">
                {(["login", "register"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === t
                      ? "bg-white shadow text-green-700"
                      : "text-slate-500"
                      }`}
                  >
                    {t === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
                  </button>
                ))}
              </div>

              <div className="grid lg:grid-cols-5 gap-8">
                {/* Auth form */}
                <div className="lg:col-span-2">
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                    {activeTab === "login" ? (
                      <>
                        <h2 className="text-sm font-black text-slate-900 mb-6">
                          أهلًا بعودتك 👋
                        </h2>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              رقم الهاتف أو البريد الإلكتروني
                            </label>
                            <input
                              type="text"
                              placeholder="05XXXXXXXX أو name@email.com"
                              value={loginForm.email}
                              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              كلمة المرور
                            </label>
                            <input
                              type="password"
                              placeholder="••••••••"
                              value={loginForm.password}
                              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                            />
                          </div>
                          {message && (
                            <div className={`text-sm px-4 ${message.includes('فشل') ? 'text-red-600' : 'text-red-400'}`}>
                              {message}
                            </div>
                          )}
                          <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {loading ? 'جاري الدخول...' : 'دخول'}
                          </button>
                          <button
                            onClick={() => setActiveTab("register")}
                            className="w-full text-sm text-slate-500 hover:text-green-600 transition-colors"
                          >
                            ليس لديك حساب؟ سجّل الآن
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-base font-black text-slate-900 mb-6">
                          أنشئ حسابك مجانًا
                        </h2>
                        <div className="space-y-4">
                          <ImageUpload
                            label="صورة الملف الشخصي"
                            onImageUpload={(url) => setProfileImage(url)}
                          />
                          {[
                            {
                              label: "الاسم الكامل",
                              type: "text",
                              ph: "محمد عبدالله الأحمد",
                              key: "name"
                            },
                            { label: "رقم الهاتف", type: "tel", ph: "05XXXXXXXX", key: "phone" },
                            {
                              label: "البريد الإلكتروني",
                              type: "email",
                              ph: "name@email.com",
                              key: "email"
                            },
                            {
                              label: "كلمة المرور",
                              type: "password",
                              ph: "••••••••",
                              key: "password"
                            },
                          ].map((f) => (
                            <div key={f.key}>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">
                                {f.label}
                              </label>
                              <input
                                type={f.type}
                                placeholder={f.ph}
                                value={registerForm[f.key as keyof typeof registerForm]}
                                onChange={(e) => setRegisterForm({ ...registerForm, [f.key]: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right"
                              />
                            </div>
                          ))}
                          {message && (
                            <div className={`text-sm ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                              {message}
                            </div>
                          )}
                          <button
                            onClick={handleRegister}
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="grid lg:grid-cols-5 gap-8">
              {/* Order creation */}
              <div className="lg:col-span-5 space-y-6">
                {/* New order */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm py-6">
                  <h2 className="text-sm font-black text-slate-900 mb-6 px-4">
                    إنشاء طلب توصيل جديد
                  </h2>

                  {/* Location Pickers */}
                  <div className="space-y-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 px-4">
                        📍 موقع الاستلام
                      </label>
                      <LocationPicker
                        onLocationSelect={(lat, lng, address) => setPickupLocation({ lat, lng, address })}
                        initialLat={24.7136}
                        initialLng={46.6753}
                        height="300px"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        📍 موقع التسليم
                      </label>
                      <LocationPicker
                        onLocationSelect={(lat, lng, address) => setDeliveryLocation({ lat, lng, address })}
                        initialLat={24.7236}
                        initialLng={46.6853}
                        height="300px"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 px-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        الوزن (كجم)
                      </label>
                      <input
                        type="number"
                        value={orderForm.weight}
                        onChange={(e) => setOrderForm({ ...orderForm, weight: Number(e.target.value) })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        الحجم (وحدة)
                      </label>
                      <select
                        value={orderForm.size}
                        onChange={(e) => setOrderForm({ ...orderForm, size: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-right bg-white"
                      >
                        <option value="1">صغير (1)</option>
                        <option value="2">متوسط (2)</option>
                        <option value="3">كبير (3)</option>
                      </select>
                    </div>
                  </div>
                  {/* Price estimate */}
                  <div className="mt-5 bg-green-50 p-4 border border-green-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-slate-700">
                        تكلفة التوصيل المتوقعة
                      </span>
                      <span className="text-sm font-black text-green-700">
                        {priceEstimate.price} جنيه
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs text-slate-500">
                      <div className="bg-white rounded-lg p-2 text-center border border-green-100">
                        <div className="font-bold text-slate-700">{priceEstimate.distance} كم</div>
                        <div>المسافة</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center border border-green-100">
                        <div className="font-bold text-slate-700">{orderForm.weight} كجم</div>
                        <div>الوزن</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center border border-green-100">
                        <div className="font-bold text-slate-700">{priceEstimate.time} دقيقة</div>
                        <div>الوقت المتوقع</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3 px-4">
                    <button
                      onClick={handleCreateOrder}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {loading ? 'جاري إنشاء الطلب...' : 'إنشاء الطلب'}
                    </button>
                    <span className="text-sm text-slate-500">الدفع <span className="font-bold text-blue-600">كاش</span> او <span className="font-bold text-red-600">بنكك</span></span>
                  </div>
                  {message && (
                    <div className={`px-4 pt-3 text-sm ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                      {message}
                    </div>
                  )}
                </div>

                {/* Order tracking */}
                {currentOrder && (
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-base font-black text-slate-900">
                        تتبع الطلب #{currentOrder._id?.slice(-6) || '---'}
                      </h2>
                      <div className="flex items-center gap-2">
                        {currentOrder.status !== 'delivered' && currentOrder.status !== 'cancelled' && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span>مباشر</span>
                          </div>
                        )}
                        <span className={`font-bold text-sm px-3 py-1 rounded-full ${currentOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          currentOrder.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                            currentOrder.status === 'picked_up' ? 'bg-purple-100 text-purple-700' :
                              currentOrder.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                'bg-red-100 text-red-700'
                          }`}>
                          {currentOrder.status === 'pending' ? 'قيد الانتظار' :
                            currentOrder.status === 'accepted' ? 'تم القبول' :
                              currentOrder.status === 'picked_up' ? 'تم الاستلام' :
                                currentOrder.status === 'delivered' ? 'تم التسليم' :
                                  'ملغي'}
                        </span>
                      </div>
                    </div>
                    {/* Order info */}
                    <div className="flex items-center justify-between mb-4 text-sm text-slate-500">
                      <div>
                        <span className="font-semibold text-slate-700">تم الإنشاء:</span>
                        {currentOrder.createdAt ? new Date(currentOrder.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '---'}
                      </div>
                      {currentOrder.status !== 'pending' && currentOrder.status !== 'cancelled' && (
                        <div className="text-green-600 font-semibold">
                          {currentOrder.status === 'accepted' ? 'السائق في الطريق إليك' :
                            currentOrder.status === 'picked_up' ? 'السائق يحمل الطرد' :
                              currentOrder.status === 'delivered' ? 'تم التوصيل' : ''}
                        </div>
                      )}
                    </div>
                    {/* Status steps */}
                    <div className="flex items-center mb-6 gap-0">
                      {[
                        { label: "تم الاستلام", done: ['picked_up', 'delivered'].includes(currentOrder.status) },
                        { label: "في الطريق", done: ['accepted', 'picked_up', 'delivered'].includes(currentOrder.status) },
                        { label: "قريب منك", done: currentOrder.status === 'delivered' },
                        { label: "تم التسليم", done: currentOrder.status === 'delivered' },
                      ].map((s, i) => (
                        <div key={s.label} className="flex-1 flex items-center">
                          <div className="flex flex-col items-center gap-1.5 flex-1">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${s.done
                                ? "bg-green-500 text-white"
                                : "bg-slate-100 text-slate-400 border-2 border-slate-200"
                                }`}
                            >
                              {s.done ? "✓" : i + 1}
                            </div>
                            <span
                              className={`text-xs font-semibold ${s.done ? "text-green-600" : "text-slate-400"
                                }`}
                            >
                              {s.label}
                            </span>
                          </div>
                          {i < 3 && (
                            <div
                              className={`flex-1 h-0.5 mb-5 ${s.done ? "bg-green-400" : "bg-slate-200"
                                }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Driver info */}
                    {currentOrder.driver && (
                      <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4">
                        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-black text-lg">
                          {currentOrder.driver.name?.[0] || 'م'}
                        </div>
                        <div className="flex-1">
                          <div className="font-black text-slate-900">
                            {currentOrder.driver.name || 'غير معروف'}
                          </div>
                          <div className="text-sm text-slate-500">
                            {currentOrder.driver.vehicleType || 'دراجة نارية'} • {currentOrder.driver.vehicleNumber || '---'}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {"★★★★★".split("").map((s, i) => (
                              <span key={i} className="text-yellow-400 text-xs">
                                {s}
                              </span>
                            ))}
                            <span className="text-xs text-slate-500 mr-1">{currentOrder.driver.rating?.toFixed(1) || '0.0'}</span>
                          </div>
                        </div>
                        <button className="bg-green-100 text-green-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-green-200 transition-colors">
                          اتصال
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── DRIVER APP ─── */}
      {activeView === "driver" && (
        <div className="top-spacing max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="mb-8">
            <h1 className="text-sm font-black text-slate-900">
              تطبيق المندوب
            </h1>
            <p className="text-slate-500 mt-1">
              انضم إلى شبكة مندوبي وصل واكسب أرباحًا يومية
            </p>
          </div>

          {/* Registration steps */}
          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-1">
              {/* Steps sidebar */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 mb-5">
                <h3 className="font-black text-slate-900 mb-4">
                  خطوات التسجيل
                </h3>
                <div className="space-y-3">
                  {[
                    { n: 1, label: "البيانات الشخصية" },
                    { n: 2, label: "بيانات المركبة" },
                    { n: 3, label: "رفع المستندات" },
                    { n: 4, label: "الإقرار والتأكيد" },
                  ].map((s) => (
                    <button
                      key={s.n}
                      onClick={() => setDriverStep(s.n)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-right ${driverStep === s.n
                        ? "bg-green-600 text-white"
                        : driverStep > s.n
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-50 text-slate-500"
                        }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${driverStep === s.n
                          ? "bg-white text-green-700"
                          : driverStep > s.n
                            ? "bg-green-200 text-green-700"
                            : "bg-slate-200 text-slate-500"
                          }`}
                      >
                        {driverStep > s.n ? "✓" : s.n}
                      </div>
                      <span className="font-semibold text-sm">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Online toggle */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                <h3 className="font-black text-slate-900 mb-3">حالة الاتصال</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-700 text-sm">
                      استقبال الطلبات
                    </div>
                    <div className={`text-xs font-medium mt-0.5 ${isDriverAvailable ? 'text-green-600' : 'text-slate-500'}`}>
                      {isDriverAvailable ? 'متاح الآن ✓' : 'غير متاح'}
                    </div>
                  </div>
                  <div
                    onClick={handleToggleAvailability}
                    className={`w-14 h-7 rounded-full relative cursor-pointer transition-colors ${isDriverAvailable ? 'bg-green-500' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${isDriverAvailable ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm">
                  <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                    <div className="font-black text-green-700 text-lg">{driverProfile?.totalDeliveries || 0}</div>
                    <div className="text-slate-500 text-xs">طلبات اليوم</div>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100">
                    <div className="font-black text-yellow-700 text-lg">
                      {driverProfile?.balance || 0} جنيه
                    </div>
                    <div className="text-slate-500 text-xs">أرباح اليوم</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {/* Step 1 */}
              {driverStep === 1 && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                  <h2 className="text-base font-black text-slate-900 mb-6">
                    البيانات الشخصية
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      {
                        label: "الاسم الكامل",
                        ph: "عبدالرحمن محمد الغامدي",
                        type: "text",
                        key: "name"
                      },
                      { label: "رقم الهاتف", ph: "09XXXXXXXX", type: "tel", key: "phone" },
                      {
                        label: "البريد الإلكتروني",
                        ph: "@email.com",
                        type: "email",
                        key: "email"
                      },
                      {
                        label: "رقم الهوية الوطنية",
                        ph: "1XXXXXXXXX",
                        type: "text",
                        key: "nationalId"
                      },
                      {
                        label: "تاريخ الميلاد",
                        ph: "1990/01/01",
                        type: "date",
                        key: "birthDate"
                      },
                      { label: "مدينة الإقامة", ph: "الابيض", type: "text", key: "city" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          {f.label}
                        </label>
                        <input
                          type={f.type}
                          placeholder={f.ph}
                          value={driverForm[f.key as keyof typeof driverForm]}
                          onChange={(e) => setDriverForm({ ...driverForm, [f.key]: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-right"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setDriverStep(2)}
                    className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    التالي ←
                  </button>
                </div>
              )}

              {/* Step 2 */}
              {driverStep === 2 && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                  <h2 className="text-base font-black text-slate-900 mb-6">
                    بيانات المركبة
                  </h2>
                  <div className="space-y-4">
                    <ImageUpload
                      label="صورة المركبة"
                      onImageUpload={(url) => setVehicleImage(url)}
                    />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          نوع المركبة
                        </label>
                        <select
                          value={driverForm.vehicleType}
                          onChange={(e) => setDriverForm({ ...driverForm, vehicleType: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-right"
                        >
                          <option value="motorcycle">دراجة نارية</option>
                          <option value="car">سيارة صغيرة</option>
                          <option value="truck">شاحنة صغيرة</option>
                        </select>
                      </div>
                      {[
                        { label: "رقم اللوحة", ph: "HON-4821", key: "plateNumber" },
                        { label: "موديل المركبة", ph: "هوندا CB500", key: "vehicleModel" },
                        { label: "سنة الصنع", ph: "2022", key: "vehicleYear" },
                        { label: "لون المركبة", ph: "أحمر", key: "vehicleColor" },
                        { label: "رقم الشاسيه", ph: "XXXXXXXXXXXXXXXXX", key: "chassisNumber" },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            {f.label}
                          </label>
                          <input
                            type="text"
                            placeholder={f.ph}
                            value={driverForm[f.key as keyof typeof driverForm]}
                            onChange={(e) => setDriverForm({ ...driverForm, [f.key]: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-right"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setDriverStep(1)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
                    >
                      → السابق
                    </button>
                    <button
                      onClick={() => setDriverStep(3)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                      التالي ←
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {driverStep === 3 && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                  <h2 className="text-base font-black text-slate-900 mb-6">
                    رفع المستندات
                  </h2>
                  <div className="space-y-4">
                    <ImageUpload
                      label="رخصة القيادة"
                      onImageUpload={(url) => setLicenseImage(url)}
                    />
                    {[
                      { label: "صورة الهوية الوطنية (وجهين)" },
                      { label: "استمارة تسجيل المركبة" },
                      { label: "صورة شخصية واضحة" },
                      { label: "شهادة فحص المركبة" },
                    ].map((doc) => (
                      <div
                        key={doc.label}
                        className="flex items-center gap-4 border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-green-400 transition-colors cursor-pointer group"
                      >

                        <div className="flex-1">
                          <div className="font-semibold text-slate-700 text-sm">
                            {doc.label}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            اضغط للرفع — JPG, PNG, PDF
                          </div>
                        </div>
                        <div className="text-xs bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg font-medium">
                          رفع
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setDriverStep(2)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
                    >
                      → السابق
                    </button>
                    <button
                      onClick={() => setDriverStep(4)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                      التالي ←
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4 */}
              {driverStep === 4 && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                  <h2 className="text-base font-black text-slate-900 mb-2">
                    الإقرار والتأكيد
                  </h2>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
                    <div className="flex items-start gap-3">
                      <span className="text-amber-500 text-xl mt-0.5">⚠️</span>
                      <div>
                        <p className="font-bold text-amber-800 mb-2 text-sm">
                          شرط استكمال التسجيل
                        </p>
                        <p className="text-amber-700 text-sm leading-relaxed">
                          يُقرّ المندوب بأن التسجيل الإلكتروني هو تسجيل مبدئي فقط،
                          ولا يتم تفعيل الحساب أو السماح له بتقديم خدمات التوصيل
                          إلا بعد استكمال جميع الإجراءات التالية:
                        </p>
                        <ol className="mt-3 space-y-2 text-amber-700 text-sm">
                          <li className="flex gap-2">
                            <span className="font-bold">١.</span>
                            الحضور شخصيًا إلى مقر الشركة أو أحد مراكزها المعتمدة
                            لاستكمال إجراءات التحقق من الهوية ومطابقة المستندات
                            وفحص المركبة واعتمادها.
                          </li>
                          <li className="flex gap-2">
                            <span className="font-bold">٢.</span>
                            تحتفظ الشركة بحق قبول أو رفض طلب التسجيل دون إبداء
                            الأسباب إذا لم تستوفِ المستندات أو إجراءات التحقق
                            الشروط المطلوبة.
                          </li>
                          <li className="flex gap-2">
                            <span className="font-bold">٣.</span>
                            لا يعتبر المندوب معتمدًا أو مخوّلًا بتقديم خدمات
                            التوصيل إلا بعد إشعاره رسميًا عبر التطبيق بتفعيل
                            حسابه.
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer mb-6">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 accent-green-600 cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 leading-relaxed">
                      أقرّ بأنني قرأت وفهمت شروط استكمال التسجيل وأوافق عليها
                      كاملةً
                    </span>
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDriverStep(3)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
                    >
                      → السابق
                    </button>
                    <button
                      onClick={handleDriverRegister}
                      disabled={loading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {loading ? 'جاري الإرسال...' : 'إرسال الطلب ✓'}
                    </button>
                  </div>
                  {message && (
                    <div className={`text-sm ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                      {message}
                    </div>
                  )}

                  {/* Earnings preview */}
                  <div className="mt-6 bg-green-50 rounded-2xl p-4 border border-green-100">
                    <h3 className="font-black text-green-800 mb-3 text-sm">
                      سجل الأرباح — هذا الشهر
                    </h3>
                    <div className="space-y-2">
                      {driverEarnings.length > 0 ? (
                        driverEarnings.map((r: any) => (
                          <div
                            key={r.date}
                            className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-green-100"
                          >
                            <span className="text-sm text-slate-600 font-medium">
                              {r.date}
                            </span>
                            <span className="text-xs text-slate-400">
                              {r.orders} طلبات
                            </span>
                            <span className="font-black text-green-700 text-sm">
                              {r.earned} جنيه
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-sm text-slate-500">
                          لا توجد أرباح مسجلة لهذا الشهر
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <div
                        onClick={handleWithdrawEarnings}
                        className="flex-1 bg-green-600 text-white text-center font-bold text-sm py-3 rounded-xl cursor-pointer hover:bg-green-700 transition-colors"
                      >
                        سحب الأرباح
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MOBILE BOTTOM NAV ─── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-green-500/40 border-t border-green-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] h-12">
        <div className={`grid h-12 ${token ? 'grid-cols-5' : 'grid-cols-4'}`}>
          {[
            {
              id: "landing" as View,
              label: "الرئيسية",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="currentColor"
                >
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
              ),
            },
            {
              id: "client" as View,
              label: "العميل",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="currentColor"
                >
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                </svg>
              ),
            },
            {
              id: "driver" as View,
              label: "المندوب",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="currentColor"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              ),
            },
            {
              id: "about" as View,
              label: "عن وصل",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
              ),
            },
            ...(token ? [{
              id: "profile" as View,
              label: "البروفايل",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="currentColor"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              ),
            }] : []),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center justify-center gap-1 relative transition-colors ${activeView === item.id ? "text-green-600" : "text-yellow-600"
                }`}
            >
              {activeView === item.id && (
                <span className="absolute top-0 inset-x-4 h-0.5 bg-green-500 rounded-full" />
              )}
              {item.icon}
              <span className="text-[10px] font-semibold leading-none">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Spacer so content clears the bottom nav on mobile */}
      <div className="md:hidden h-12" />
    </div>
  )
}
