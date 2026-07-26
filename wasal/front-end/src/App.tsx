import { useState, useEffect } from "react"
import { Car, MapPin } from "lucide-react"
import About from "./pages/About"
import Profile from "./pages/Profile"
import LocationPicker from "./components/LocationPicker"
import RouteMap from "./components/RouteMap"
import { authAPI, orderAPI, driverAPI, cityAPI } from "./services/api"
import { getSocket, disconnectSocket } from "./services/socket"
import { playNotificationSound, playIncomingOrderSound } from "./utils/sound"

type View = "landing" | "client" | "driver" | "about" | "profile" | "otp"

export default function App() {
  const [activeView, setActiveView] = useState<View>("landing")
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")
  const [driverStep, setDriverStep] = useState(1)
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)

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

  // Real-time dispatch state
  const [incomingOffer, setIncomingOffer] = useState<any>(null) // order offered to this driver, awaiting accept/reject
  const [offerSecondsLeft, setOfferSecondsLeft] = useState(0)
  const [driverLivePosition, setDriverLivePosition] = useState<{ lat: number; lng: number } | null>(null) // driver's own GPS (driver view)
  const [trackedDriverPosition, setTrackedDriverPosition] = useState<{ lat: number; lng: number } | null>(null) // driver's GPS as seen by the client
  const [offerLoading, setOfferLoading] = useState(false)

  // Stats state
  const [stats, setStats] = useState({
    activeDrivers: 2400,
    customerSatisfaction: 98
  })

  // Form state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '', city: '' })
  const [otpForm, setOtpForm] = useState({ otp: '' })
  const [forgotPasswordForm, setForgotPasswordForm] = useState({ email: '', otp: '', newPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showDriverPassword, setShowDriverPassword] = useState(false)
  const [showDriverConfirmPassword, setShowDriverConfirmPassword] = useState(false)
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'otp' | 'reset'>('email')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [pendingRole, setPendingRole] = useState<string | null>(null)
  const [driverForm, setDriverForm] = useState({
    name: '', phone: '', email: '', password: '', confirmPassword: '', nationalId: '', birthDate: '', city: '',
    vehicleType: 'motorcycle', plateNumber: '', vehicleModel: '', vehicleYear: '', vehicleColor: '', chassisNumber: ''
  })
  const [cities, setCities] = useState<{ _id: string; name: string }[]>([])
  const [orderForm, setOrderForm] = useState({ weight: 3, size: '1' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Load data on mount
  useEffect(() => {
    if (token) {
      loadUserData()
    }
  }, [token])

  // Load available service cities for the registration forms
  useEffect(() => {
    cityAPI.getActiveCities()
      .then((res) => setCities(res.data.cities || []))
      .catch(() => { /* if this fails, the city select just stays empty */ })
  }, [])

  // Real-time connection: notifications, order dispatch offers (driver), and
  // live order status/driver location updates (client).
  useEffect(() => {
    if (!token) {
      disconnectSocket()
      return
    }

    const socket = getSocket(token)

    const onNotification = (notification: any) => {
      if (notification?.sound) playNotificationSound()
      setMessage(notification?.message || '')
    }

    // Driver receives a new order offer - show it, start the countdown, play an alert.
    const onNewOffer = (offer: any) => {
      setIncomingOffer(offer)
      const secondsLeft = Math.max(0, Math.round((new Date(offer.expiresAt).getTime() - Date.now()) / 1000))
      setOfferSecondsLeft(secondsLeft)
      playIncomingOrderSound()
    }

    // Client's order got accepted by a driver.
    const onOrderAccepted = (payload: any) => {
      if (payload?.sound) playNotificationSound()
      setCurrentOrder((prev: any) => prev && prev._id === payload.orderId ? payload.order : prev)
      setOrders((prev) => prev.map((o) => o._id === payload.orderId ? payload.order : o))
      setMessage('تم قبول طلبك من قبل مندوب')
    }

    // Any order status change (picked_up / delivered) pushed live.
    const onStatusChanged = async (payload: any) => {
      if (payload?.sound) playNotificationSound()
      try {
        const res = await orderAPI.getOrderById(payload.orderId)
        setCurrentOrder((prev: any) => prev && prev._id === payload.orderId ? res.data.order : prev)
        setOrders((prev) => prev.map((o) => o._id === payload.orderId ? res.data.order : o))
      } catch { /* ignore */ }
    }

    // Live driver GPS position, relayed to whichever client is tracking that order.
    const onDriverLocation = (payload: any) => {
      setTrackedDriverPosition({ lat: payload.lat, lng: payload.lng })
    }

    socket.on('notification:new', onNotification)
    socket.on('order:new_offer', onNewOffer)
    socket.on('order:accepted', onOrderAccepted)
    socket.on('order:status_changed', onStatusChanged)
    socket.on('driver:location', onDriverLocation)

    return () => {
      socket.off('notification:new', onNotification)
      socket.off('order:new_offer', onNewOffer)
      socket.off('order:accepted', onOrderAccepted)
      socket.off('order:status_changed', onStatusChanged)
      socket.off('driver:location', onDriverLocation)
    }
  }, [token])

  // Countdown for the current incoming offer; clears itself once it hits zero
  // (the backend will have already moved on to the next driver by then).
  useEffect(() => {
    if (!incomingOffer) return
    if (offerSecondsLeft <= 0) {
      setIncomingOffer(null)
      return
    }
    const t = setTimeout(() => setOfferSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [incomingOffer, offerSecondsLeft])

  // While the driver has an order in progress, stream their live GPS position
  // to the backend (which relays it to the client tracking that order) and
  // keep it locally for the driver's own navigation map.
  useEffect(() => {
    const hasActiveDelivery = user?.role === 'driver' && currentOrder &&
      ['accepted', 'picked_up'].includes(currentOrder.status)
    if (!hasActiveDelivery || !navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setDriverLivePosition(point)
        const socket = getSocket(token as string)
        socket.emit('driver:location', point)
      },
      () => { /* location permission denied or unavailable - map just won't live-update */ },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [user?.role, currentOrder?._id, currentOrder?.status])

  const handleAcceptOffer = async () => {
    if (!incomingOffer) return
    setOfferLoading(true)
    try {
      const res = await driverAPI.acceptOrder(incomingOffer.orderId)
      setCurrentOrder(res.data.order)
      setOrders((prev) => [res.data.order, ...prev])
      setIncomingOffer(null)
      setMessage('تم قبول الطلب، توجه لنقطة الاستلام')
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'تعذر قبول الطلب، ربما تم تحويله لمندوب آخر')
      setIncomingOffer(null)
    }
    setOfferLoading(false)
  }

  const handleRejectOffer = async () => {
    if (!incomingOffer) return
    setOfferLoading(true)
    try {
      await driverAPI.rejectOrder(incomingOffer.orderId)
    } catch { /* ignore - offer likely already expired */ }
    setIncomingOffer(null)
    setOfferLoading(false)
  }

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
    if (!registerForm.name.trim() || !registerForm.phone.trim() || !registerForm.email.trim()) {
      setMessage('يرجى تعبئة جميع الحقول')
      return
    }
    if (!registerForm.city) {
      setMessage('يرجى اختيار المدينة')
      return
    }
    if (registerForm.password.length < 6) {
      setMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setMessage('كلمتي المرور غير متطابقين')
      return
    }
    setLoading(true)
    try {
      const { confirmPassword, ...payload } = registerForm
      console.log('Attempting registration with:', payload)
      const res = await authAPI.register({
        ...payload,
        role: 'client'
      })
      console.log('Registration response:', res.data)
      setPendingUserId(res.data.userId)
      setPendingRole('client')
      setMessage('تم إنشاء الحساب بنجاح. يرجى التحقق من OTP.')
      setActiveView('otp')
    } catch (error: any) {
      console.error('Registration error:', error)
      console.error('Error response:', error.response?.data)
      setMessage(error.response?.data?.message || 'فشل إنشاء الحساب')
    }
    setLoading(false)
  }

  const handleVerifyOTP = async () => {
    setLoading(true)
    try {
      const res = await authAPI.verifyOTP({
        userId: pendingUserId,
        otp: otpForm.otp,
        role: pendingRole
      })
      setToken(res.data.token)
      localStorage.setItem('token', res.data.token)
      setUser(res.data.user)
      setMessage('تم التحقق من الحساب بنجاح')

      // Redirect based on user role
      if (res.data.user.role === 'driver') {
        setActiveView('driver')
      } else {
        setActiveView('client')
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل التحقق من OTP')
    }
    setLoading(false)
  }

  const handleResendOTP = async () => {
    setLoading(true)
    try {
      const res = await authAPI.resendOTP({
        userId: pendingUserId,
        role: pendingRole
      })
      setMessage('تم إعادة إرسال رمز التحقق بنجاح')
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل إعادة إرسال الرمز')
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
    if (!driverForm.city) {
      setMessage('يرجى اختيار مدينة الإقامة')
      return
    }
    if (driverForm.password.length < 6) {
      setMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    if (driverForm.password !== driverForm.confirmPassword) {
      setMessage('كلمة المرور وتأكيدها غير متطابقين')
      return
    }
    setLoading(true)
    try {
      const { confirmPassword, ...payload } = driverForm
      const res = await authAPI.register({
        ...payload,
        role: 'driver'
      })
      setPendingUserId(res.data.userId)
      setPendingRole('driver')
      setMessage('تم إرسال طلب التسجيل بنجاح. يرجى التحقق من OTP.')
      setActiveView('otp')
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

  const handleUpdateDriverOrderStatus = async (status: 'picked_up' | 'delivered') => {
    if (!currentOrder) return
    setLoading(true)
    try {
      const res = await driverAPI.updateOrderStatus(currentOrder._id, status)
      setCurrentOrder(res.data.order)
      setOrders((prev) => prev.map((o) => o._id === res.data.order._id ? res.data.order : o))
      setMessage(status === 'picked_up' ? 'تم تسجيل استلام الطرد' : 'تم تسجيل تسليم الطلب بنجاح')
      if (status === 'delivered') {
        // Refresh earnings after a completed delivery
        try {
          const earningsRes = await driverAPI.getEarnings()
          setDriverEarnings(earningsRes.data.earnings || [])
        } catch { /* ignore */ }
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'تعذر تحديث حالة الطلب')
    }
    setLoading(false)
  }



  const handleLogout = () => {
    disconnectSocket()
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    setActiveView('landing')
    setCurrentOrder(null)
    setOrders([])
    setDriverProfile(null)
    setDriverEarnings([])
  }

  // Forgot Password handlers
  const handleForgotPassword = async () => {
    setLoading(true)
    try {
      await authAPI.forgotPassword(forgotPasswordForm.email)
      setForgotPasswordStep('otp')
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل إرسال رمز التحقق')
    }
    setLoading(false)
  }

  const handleResendForgotPasswordOTP = async () => {
    setLoading(true)
    try {
      await authAPI.forgotPassword(forgotPasswordForm.email)
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل إعادة إرسال الرمز')
    }
    setLoading(false)
  }

  const handleResetPassword = async () => {
    setLoading(true)
    try {
      const res = await authAPI.resetPassword({
        email: forgotPasswordForm.email,
        otp: forgotPasswordForm.otp,
        newPassword: forgotPasswordForm.newPassword
      })
      setForgotPasswordStep('email')
      setForgotPasswordForm({ email: '', otp: '', newPassword: '' })
      setActiveTab('login')
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل تغيير كلمة المرور')
    }
    setLoading(false)
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
                <img className="rounded-lg w-full h-full" src="https://res.cloudinary.com/efc2cuqx/image/upload/v1784902051/wasal_jilzjp.png" alt="" />
              </div>
              <span className="text-xl font-black text-yellow-500 tracking-wide">
                وصل
              </span>
            </button>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                ...(!token ? [
                  { id: "client" as View, label: "تطبيق الزبون" },
                  { id: "driver" as View, label: "تطبيق المندوب" },
                ] : []),
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

      {/* ─── INCOMING ORDER OFFER (driver) ─── */}
      {incomingOffer && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-pulse-once">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-green-700">طلب توصيل جديد 🚨</h2>
              <span className="bg-red-100 text-red-700 font-black px-3 py-1 rounded-full text-sm">
                {offerSecondsLeft}s
              </span>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2 text-slate-700">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="font-semibold">استلام:</span>
                <span>{incomingOffer.pickupLocation?.address || 'موقع محدد على الخريطة'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="font-semibold">تسليم:</span>
                <span>{incomingOffer.deliveryLocation?.address || 'موقع محدد على الخريطة'}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs mb-5">
              <div className="bg-green-50 rounded-xl p-2 border border-green-100">
                <div className="font-black text-green-700">{incomingOffer.distanceToPickupKm} كم</div>
                <div className="text-slate-500">للاستلام</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                <div className="font-black text-slate-700">{incomingOffer.distance?.toFixed?.(1) || incomingOffer.distance} كم</div>
                <div className="text-slate-500">مسافة التوصيل</div>
              </div>
              <div className="bg-yellow-50 rounded-xl p-2 border border-yellow-100">
                <div className="font-black text-yellow-700">{incomingOffer.driverEarnings?.toFixed?.(2) || incomingOffer.driverEarnings} جنيه</div>
                <div className="text-slate-500">أرباحك</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleRejectOffer}
                disabled={offerLoading}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                رفض
              </button>
              <button
                onClick={handleAcceptOffer}
                disabled={offerLoading}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {offerLoading ? '...' : 'قبول الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <h1 className="text-sm font-black text-slate-900">تطبيق الزبون</h1>
            <p className="text-slate-500 mt-1">
              أنشئ وتابع طلبات التوصيل بسهولة
            </p>
          </div>

          {token && user?.role === 'driver' ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <h2 className="text-lg font-black text-red-800 mb-2">عفواً، هذه الصفحة للزبائن فقط</h2>
              <p className="text-red-600 mb-4">أنت مسجل دخول كمندوب. يرجى استخدام تطبيق المندوب.</p>
              <button
                onClick={() => setActiveView('driver')}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
              >
                الانتقال لتطبيق المندوب
              </button>
            </div>
          ) : !token ? (
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
                            <label htmlFor="login-email-2" className="block text-sm font-semibold text-slate-700 mb-2">
                              رقم الهاتف أو البريد الإلكتروني
                            </label>
                            <input
                              id="login-email-2"
                              name="login-email-2"
                              type="text"
                              placeholder="05XXXXXXXX أو name@email.com"
                              value={loginForm.email}
                              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right"
                            />
                          </div>
                          <div>
                            <label htmlFor="login-password-2" className="block text-sm font-semibold text-slate-700 mb-2">
                              كلمة المرور
                            </label>
                            <div className="relative">
                              <input
                                id="login-password-2"
                                name="login-password-2"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                              </button>
                            </div>
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
                          <button
                            onClick={() => { setForgotPasswordStep('email'); setActiveTab('forgot-password') }}
                            className="w-full text-sm text-slate-500 hover:text-green-600 transition-colors"
                          >
                            نسيت كلمة المرور؟
                          </button>
                        </div>
                      </>
                    ) : activeTab === "forgot-password" ? (
                      <>
                        <h2 className="text-sm font-black text-slate-900 mb-6">
                          استرجاع كلمة المرور
                        </h2>
                        <div className="space-y-4">
                          {forgotPasswordStep === 'email' && (
                            <>
                              <div>
                                <label htmlFor="forgot-email-2" className="block text-sm font-semibold text-slate-700 mb-2">
                                  البريد الإلكتروني
                                </label>
                                <input
                                  id="forgot-email-2"
                                  name="forgot-email-2"
                                  type="email"
                                  placeholder="name@email.com"
                                  value={forgotPasswordForm.email}
                                  onChange={(e) => setForgotPasswordForm({ ...forgotPasswordForm, email: e.target.value })}
                                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right"
                                />
                              </div>
                              {message && (
                                <div className={`text-sm px-4 ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                                  {message}
                                </div>
                              )}
                              <button
                                onClick={handleForgotPassword}
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                              >
                                {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
                              </button>
                              <button
                                onClick={() => setActiveTab('login')}
                                className="w-full text-sm text-slate-500 hover:text-green-600 transition-colors"
                              >
                                العودة لتسجيل الدخول
                              </button>
                            </>
                          )}
                          {forgotPasswordStep === 'otp' && (
                            <>
                              <div>
                                <label htmlFor="forgot-otp-2" className="block text-sm font-semibold text-slate-700 mb-2">
                                  رمز التحقق (6 أرقام)
                                </label>
                                <input
                                  id="forgot-otp-2"
                                  name="forgot-otp-2"
                                  type="text"
                                  placeholder="123456"
                                  value={forgotPasswordForm.otp}
                                  onChange={(e) => setForgotPasswordForm({ ...forgotPasswordForm, otp: e.target.value })}
                                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-center text-2xl tracking-widest"
                                  maxLength={6}
                                />
                              </div>
                              <div>
                                <label htmlFor="forgot-new-password-2" className="block text-sm font-semibold text-slate-700 mb-2">
                                  كلمة المرور الجديدة
                                </label>
                                <div className="relative">
                                  <input
                                    id="forgot-new-password-2"
                                    name="forgot-new-password-2"
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={forgotPasswordForm.newPassword}
                                    onChange={(e) => setForgotPasswordForm({ ...forgotPasswordForm, newPassword: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                  >
                                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                                  </button>
                                </div>
                              </div>
                              {message && (
                                <div className={`text-sm px-4 ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                                  {message}
                                </div>
                              )}
                              <button
                                onClick={handleResetPassword}
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                              >
                                {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                              </button>
                              <button
                                onClick={handleResendForgotPasswordOTP}
                                disabled={loading}
                                className="w-full bg-yellow-400 hover:bg-yellow-300 text-green-800 font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                              >
                                {loading ? 'جاري الإرسال...' : 'إعادة إرسال الرمز'}
                              </button>
                              <button
                                onClick={() => setForgotPasswordStep('email')}
                                className="w-full text-sm text-slate-500 hover:text-green-600 transition-colors"
                              >
                                العودة
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-base font-black text-slate-900 mb-6">
                          أنشئ حسابك مجانًا
                        </h2>
                        <div className="space-y-4">
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
                              key: "password",
                              visible: showPassword,
                              toggleVisible: () => setShowPassword(!showPassword)
                            },
                            {
                              label: "تأكيد كلمة المرور",
                              type: "password",
                              ph: "••••••••",
                              key: "confirmPassword",
                              visible: showConfirmPassword,
                              toggleVisible: () => setShowConfirmPassword(!showConfirmPassword)
                            },
                          ].map((f) => (
                            <div key={f.key}>
                              <label htmlFor={`register-${f.key}`} className="block text-sm font-semibold text-slate-700 mb-2">
                                {f.label}
                              </label>
                              {f.type === "password" ? (
                                <div className="relative">
                                  <input
                                    id={`register-${f.key}`}
                                    name={`register-${f.key}`}
                                    type={f.visible ? "text" : "password"}
                                    placeholder={f.ph}
                                    value={registerForm[f.key as keyof typeof registerForm]}
                                    onChange={(e) => setRegisterForm({ ...registerForm, [f.key]: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={f.toggleVisible}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                  >
                                    {f.visible ? '👁️' : '👁️‍🗨️'}
                                  </button>
                                </div>
                              ) : (
                                <input
                                  id={`register-${f.key}`}
                                  name={`register-${f.key}`}
                                  type={f.type}
                                  placeholder={f.ph}
                                  value={registerForm[f.key as keyof typeof registerForm]}
                                  onChange={(e) => setRegisterForm({ ...registerForm, [f.key]: e.target.value })}
                                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right"
                                />
                              )}
                            </div>
                          ))}
                          <div>
                            <label htmlFor="register-city" className="block text-sm font-semibold text-slate-700 mb-2">
                              المدينة
                            </label>
                            <select
                              id="register-city"
                              name="register-city"
                              value={registerForm.city}
                              onChange={(e) => setRegisterForm({ ...registerForm, city: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-right"
                            >
                              <option value="">اختر مدينتك</option>
                              {cities.map((c) => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                              ))}
                            </select>
                            {cities.length === 0 && (
                              <p className="text-xs text-slate-400 mt-1">لا توجد مدن متاحة حالياً، يرجى المحاولة لاحقاً</p>
                            )}
                          </div>
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
                      <label htmlFor="pickup-location" className="block text-sm font-semibold text-slate-700 mb-2 px-4">
                        📍 موقع الاستلام
                      </label>
                      <LocationPicker
                        id="pickup-location"
                        onLocationSelect={(lat, lng, address) => setPickupLocation({ lat, lng, address })}
                        initialLat={24.7136}
                        initialLng={46.6753}
                        height="300px"
                      />
                    </div>

                    <div>
                      <label htmlFor="delivery-location" className="block text-sm font-semibold text-slate-700 mb-2">
                        📍 موقع التسليم
                      </label>
                      <LocationPicker
                        id="delivery-location"
                        onLocationSelect={(lat, lng, address) => setDeliveryLocation({ lat, lng, address })}
                        initialLat={24.7236}
                        initialLng={46.6853}
                        height="300px"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 px-4">
                    <div>
                      <label htmlFor="order-weight" className="block text-sm font-semibold text-slate-700 mb-2">
                        الوزن (كجم)
                      </label>
                      <input
                        id="order-weight"
                        name="order-weight"
                        type="number"
                        value={orderForm.weight}
                        onChange={(e) => setOrderForm({ ...orderForm, weight: Number(e.target.value) })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-right"
                      />
                    </div>
                    <div>
                      <label htmlFor="order-size" className="block text-sm font-semibold text-slate-700 mb-2">
                        الحجم (وحدة)
                      </label>
                      <select
                        id="order-size"
                        name="order-size"
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
                    {/* Live tracking map - visible once a driver is on the way */}
                    {['accepted', 'picked_up'].includes(currentOrder.status) && currentOrder.pickupLocation?.lat && currentOrder.deliveryLocation?.lat && (
                      <div className="mb-4">
                        <RouteMap
                          pickup={currentOrder.pickupLocation}
                          delivery={currentOrder.deliveryLocation}
                          driverPosition={trackedDriverPosition || currentOrder.driver?.currentLocation || null}
                          height="260px"
                        />
                      </div>
                    )}
                    {/* Driver info */}
                    {currentOrder.driver && (
                      <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4">
                        {currentOrder.driver.profileImage ? (
                          <img
                            src={currentOrder.driver.profileImage}
                            alt="Driver"
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-black text-lg">
                            {currentOrder.driver.name?.[0] || 'م'}
                          </div>
                        )}
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

          {token && user?.role === 'client' ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <h2 className="text-lg font-black text-red-800 mb-2">عفواً، هذه الصفحة للمندوبين فقط</h2>
              <p className="text-red-600 mb-4">أنت مسجل دخول كعميل. يرجى استخدام تطبيق الزبون.</p>
              <button
                onClick={() => setActiveView('client')}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
              >
                الانتقال لتطبيق الزبون
              </button>
            </div>
          ) : !token ? (
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
                            <label htmlFor="login-email-2" className="block text-sm font-semibold text-slate-700 mb-2">
                              رقم الهاتف أو البريد الإلكتروني
                            </label>
                            <input
                              id="login-email-2"
                              name="login-email-2"
                              type="text"
                              placeholder="05XXXXXXXX أو name@email.com"
                              value={loginForm.email}
                              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right"
                            />
                          </div>
                          <div>
                            <label htmlFor="login-password-2" className="block text-sm font-semibold text-slate-700 mb-2">
                              كلمة المرور
                            </label>
                            <div className="relative">
                              <input
                                id="login-password-2"
                                name="login-password-2"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                              </button>
                            </div>
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
                          <button
                            onClick={() => { setForgotPasswordStep('email'); setActiveTab('forgot-password') }}
                            className="w-full text-sm text-slate-500 hover:text-green-600 transition-colors"
                          >
                            نسيت كلمة المرور؟
                          </button>
                        </div>
                      </>
                    ) : activeTab === "forgot-password" ? (
                      <>
                        <h2 className="text-sm font-black text-slate-900 mb-6">
                          استرجاع كلمة المرور
                        </h2>
                        <div className="space-y-4">
                          {forgotPasswordStep === 'email' && (
                            <>
                              <div>
                                <label htmlFor="forgot-email-2" className="block text-sm font-semibold text-slate-700 mb-2">
                                  البريد الإلكتروني
                                </label>
                                <input
                                  id="forgot-email-2"
                                  name="forgot-email-2"
                                  type="email"
                                  placeholder="name@email.com"
                                  value={forgotPasswordForm.email}
                                  onChange={(e) => setForgotPasswordForm({ ...forgotPasswordForm, email: e.target.value })}
                                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right"
                                />
                              </div>
                              {message && (
                                <div className={`text-sm px-4 ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                                  {message}
                                </div>
                              )}
                              <button
                                onClick={handleForgotPassword}
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                              >
                                {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
                              </button>
                              <button
                                onClick={() => setActiveTab('login')}
                                className="w-full text-sm text-slate-500 hover:text-green-600 transition-colors"
                              >
                                العودة لتسجيل الدخول
                              </button>
                            </>
                          )}
                          {forgotPasswordStep === 'otp' && (
                            <>
                              <div>
                                <label htmlFor="forgot-otp-2" className="block text-sm font-semibold text-slate-700 mb-2">
                                  رمز التحقق (6 أرقام)
                                </label>
                                <input
                                  id="forgot-otp-2"
                                  name="forgot-otp-2"
                                  type="text"
                                  placeholder="123456"
                                  value={forgotPasswordForm.otp}
                                  onChange={(e) => setForgotPasswordForm({ ...forgotPasswordForm, otp: e.target.value })}
                                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-center text-2xl tracking-widest"
                                  maxLength={6}
                                />
                              </div>
                              <div>
                                <label htmlFor="forgot-new-password-2" className="block text-sm font-semibold text-slate-700 mb-2">
                                  كلمة المرور الجديدة
                                </label>
                                <div className="relative">
                                  <input
                                    id="forgot-new-password-2"
                                    name="forgot-new-password-2"
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={forgotPasswordForm.newPassword}
                                    onChange={(e) => setForgotPasswordForm({ ...forgotPasswordForm, newPassword: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                  >
                                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                                  </button>
                                </div>
                              </div>
                              {message && (
                                <div className={`text-sm px-4 ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                                  {message}
                                </div>
                              )}
                              <button
                                onClick={handleResetPassword}
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                              >
                                {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                              </button>
                              <button
                                onClick={handleResendForgotPasswordOTP}
                                disabled={loading}
                                className="w-full bg-yellow-400 hover:bg-yellow-300 text-green-800 font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                              >
                                {loading ? 'جاري الإرسال...' : 'إعادة إرسال الرمز'}
                              </button>
                              <button
                                onClick={() => setForgotPasswordStep('email')}
                                className="w-full text-sm text-slate-500 hover:text-green-600 transition-colors"
                              >
                                العودة
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-base font-black text-slate-900 mb-6">
                          انضم كمندوب جديد
                        </h2>
                        <div className="space-y-4">
                          {[
                            {
                              label: "الاسم الكامل",
                              type: "text",
                              ph: "عبدالرحمن محمد الغامدي",
                              key: "name"
                            },
                            { label: "رقم الهاتف", type: "tel", ph: "09XXXXXXXX", key: "phone" },
                            {
                              label: "البريد الإلكتروني",
                              type: "email",
                              ph: "@email.com",
                              key: "email"
                            },
                            {
                              label: "كلمة المرور",
                              type: "password",
                              ph: "••••••••",
                              key: "password",
                              visible: showDriverPassword,
                              toggleVisible: () => setShowDriverPassword(!showDriverPassword)
                            },
                            {
                              label: "تأكيد كلمة المرور",
                              type: "password",
                              ph: "••••••••",
                              key: "confirmPassword",
                              visible: showDriverConfirmPassword,
                              toggleVisible: () => setShowDriverConfirmPassword(!showDriverConfirmPassword)
                            },
                          ].map((f) => (
                            <div key={f.key}>
                              <label htmlFor={`driver-${f.key}`} className="block text-sm font-semibold text-slate-700 mb-2">
                                {f.label}
                              </label>
                              {f.type === "password" ? (
                                <div className="relative">
                                  <input
                                    id={`driver-${f.key}`}
                                    name={`driver-${f.key}`}
                                    type={f.visible ? "text" : "password"}
                                    placeholder={f.ph}
                                    value={driverForm[f.key as keyof typeof driverForm]}
                                    onChange={(e) => setDriverForm({ ...driverForm, [f.key]: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={f.toggleVisible}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                  >
                                    {f.visible ? '👁️' : '👁️‍🗨️'}
                                  </button>
                                </div>
                              ) : (
                                <input
                                  id={`driver-${f.key}`}
                                  name={`driver-${f.key}`}
                                  type={f.type}
                                  placeholder={f.ph}
                                  value={driverForm[f.key as keyof typeof driverForm]}
                                  onChange={(e) => setDriverForm({ ...driverForm, [f.key]: e.target.value })}
                                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right"
                                />
                              )}
                            </div>
                          ))}
                          {message && (
                            <div className={`text-sm ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                              {message}
                            </div>
                          )}
                          <button
                            onClick={() => setDriverStep(1)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors"
                          >
                            التالي ←
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Active order in progress - map + status controls */}
              {currentOrder && ['accepted', 'picked_up'].includes(currentOrder.status) && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-black text-slate-900">
                      طلب جارٍ #{currentOrder._id?.slice(-6)}
                    </h2>
                    <span className={`font-bold text-sm px-3 py-1 rounded-full ${currentOrder.status === 'accepted' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                      {currentOrder.status === 'accepted' ? 'في الطريق للاستلام' : 'تم الاستلام - جارٍ التوصيل'}
                    </span>
                  </div>

                  {currentOrder.pickupLocation?.lat && currentOrder.deliveryLocation?.lat && (
                    <div className="mb-4">
                      <RouteMap
                        pickup={currentOrder.pickupLocation}
                        delivery={currentOrder.deliveryLocation}
                        driverPosition={driverLivePosition}
                        height="280px"
                      />
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
                    <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                      <div className="font-semibold text-green-800 mb-0.5">📍 الاستلام</div>
                      <div className="text-slate-600">{currentOrder.pickupLocation?.address}</div>
                      <div className="text-slate-500 mt-1">{currentOrder.pickupLocation?.contactName} — {currentOrder.pickupLocation?.contactPhone}</div>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100">
                      <div className="font-semibold text-yellow-800 mb-0.5">📍 التسليم</div>
                      <div className="text-slate-600">{currentOrder.deliveryLocation?.address}</div>
                      <div className="text-slate-500 mt-1">{currentOrder.deliveryLocation?.contactName} — {currentOrder.deliveryLocation?.contactPhone}</div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {currentOrder.status === 'accepted' && (
                      <button
                        onClick={() => handleUpdateDriverOrderStatus('picked_up')}
                        disabled={loading}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 sm:col-span-2"
                      >
                        {loading ? '...' : 'تم استلام الطرد'}
                      </button>
                    )}
                    {currentOrder.status === 'picked_up' && (
                      <button
                        onClick={() => handleUpdateDriverOrderStatus('delivered')}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 sm:col-span-2"
                      >
                        {loading ? '...' : 'تم تسليم الطلب'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {driverProfile ? (
                <div className="max-w-4xl mx-auto">
                  {/* Approval status banner */}
                  {!driverProfile.isApproved ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                      <span className="text-2xl">⏳</span>
                      <div>
                        <div className="font-black text-yellow-800">حسابك قيد المراجعة</div>
                        <div className="text-sm text-yellow-700">
                          سيتم تفعيل حسابك بعد مراجعة الإدارة لبياناتك، سنعلمك فور الموافقة.
                        </div>
                      </div>
                    </div>
                  ) : driverProfile.isSuspended ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                      <span className="text-2xl">🚫</span>
                      <div>
                        <div className="font-black text-red-800">حسابك موقوف</div>
                        <div className="text-sm text-red-700">تواصل مع الإدارة لمعرفة السبب.</div>
                      </div>
                    </div>
                  ) : null}

                  {/* Greeting + availability toggle */}
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <h2 className="text-lg font-black text-slate-900">
                          أهلًا {driverProfile.name} 👋
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                          {isDriverAvailable
                            ? (currentOrder && ['accepted', 'picked_up'].includes(currentOrder.status)
                              ? 'لديك طلب جارٍ حالياً'
                              : 'أنت متاح الآن، بانتظار وصول طلب جديد...')
                            : 'أنت غير متاح، فعّل حالتك لبدء استقبال الطلبات'}
                        </p>
                      </div>
                      <button
                        onClick={handleToggleAvailability}
                        disabled={!driverProfile.isApproved || driverProfile.isSuspended}
                        className={`px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-40 ${isDriverAvailable
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          }`}
                      >
                        {isDriverAvailable ? '🟢 متاح لاستقبال الطلبات' : '⚪ غير متاح'}
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
                      <div className="text-2xl font-black text-green-700">{driverProfile.totalDeliveries || 0}</div>
                      <div className="text-xs text-slate-500 mt-1">توصيلات مكتملة</div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
                      <div className="text-2xl font-black text-green-700">{(driverProfile.balance || 0).toFixed(0)}</div>
                      <div className="text-xs text-slate-500 mt-1">رصيدك (جنيه)</div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
                      <div className="text-2xl font-black text-green-700">{(driverProfile.totalEarnings || 0).toFixed(0)}</div>
                      <div className="text-xs text-slate-500 mt-1">إجمالي الأرباح</div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
                      <div className="text-2xl font-black text-green-700">{(driverProfile.rating || 0).toFixed(1)} ⭐</div>
                      <div className="text-xs text-slate-500 mt-1">التقييم</div>
                    </div>
                  </div>

                  {/* Waiting state (no active order) */}
                  {!(currentOrder && ['accepted', 'picked_up'].includes(currentOrder.status)) && driverProfile.isApproved && (
                    <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                      <div className="text-4xl mb-3">{isDriverAvailable ? '📡' : '💤'}</div>
                      <div className="font-black text-slate-700 mb-1">
                        {isDriverAvailable ? 'بانتظار طلب جديد' : 'قم بتفعيل حالتك لاستقبال الطلبات'}
                      </div>
                      <p className="text-sm text-slate-400">
                        عند وصول طلب مناسب سيظهر لك إشعار فوري بصوت تنبيه ولديك دقيقتان للرد عليه.
                      </p>
                    </div>
                  )}

                  {/* Earnings history */}
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
                            <span className="text-sm text-slate-600 font-medium">{r.date}</span>
                            <span className="text-xs text-slate-400">{r.orders} طلبات</span>
                            <span className="font-black text-green-700 text-sm">{r.earned} جنيه</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-sm text-slate-500">
                          لا توجد أرباح مسجلة لهذا الشهر
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
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
                          ].map((f) => (
                            <div key={f.key}>
                              <label htmlFor={`driver-step1-${f.key}`} className="block text-sm font-semibold text-slate-700 mb-2">
                                {f.label}
                              </label>
                              <input
                                id={`driver-step1-${f.key}`}
                                name={`driver-step1-${f.key}`}
                                type={f.type}
                                placeholder={f.ph}
                                value={driverForm[f.key as keyof typeof driverForm]}
                                onChange={(e) => setDriverForm({ ...driverForm, [f.key]: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-right"
                              />
                            </div>
                          ))}
                          <div>
                            <label htmlFor="driver-city" className="block text-sm font-semibold text-slate-700 mb-2">
                              مدينة الإقامة
                            </label>
                            <select
                              id="driver-city"
                              name="driver-city"
                              value={driverForm.city}
                              onChange={(e) => setDriverForm({ ...driverForm, city: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-right"
                            >
                              <option value="">اختر مدينتك</option>
                              {cities.map((c) => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                              ))}
                            </select>
                            {cities.length === 0 && (
                              <p className="text-xs text-slate-400 mt-1">لا توجد مدن متاحة حالياً، يرجى المحاولة لاحقاً</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (!driverForm.city) {
                              setMessage('يرجى اختيار مدينة الإقامة')
                              return
                            }
                            setMessage('')
                            setDriverStep(2)
                          }}
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
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="driver-vehicle-type" className="block text-sm font-semibold text-slate-700 mb-2">
                                نوع المركبة
                              </label>
                              <select
                                id="driver-vehicle-type"
                                name="driver-vehicle-type"
                                value={driverForm.vehicleType}
                                onChange={(e) => setDriverForm({ ...driverForm, vehicleType: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-right"
                              >
                                <option value="motorcycle">دراجة نارية</option>
                                <option value="car">سيارة صغيرة</option>
                                <option value="bicycle">دراجة هوائية</option>
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
                                <label htmlFor={`driver-step2-${f.key}`} className="block text-sm font-semibold text-slate-700 mb-2">
                                  {f.label}
                                </label>
                                <input
                                  id={`driver-step2-${f.key}`}
                                  name={`driver-step2-${f.key}`}
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
                            id="driver-agreement"
                            name="driver-agreement"
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
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── OTP VERIFICATION PAGE ─── */}
      {activeView === "otp" && (
        <div className="top-spacing max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="mb-8">
            <h1 className="text-sm font-black text-slate-900">
              التحقق من الحساب
            </h1>
            <p className="text-slate-500 mt-1">
              أدخل رمز التحقق المرسل إلى بريدك الإلكتروني
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                <h2 className="text-sm font-black text-slate-900 mb-6">
                  أدخل رمز OTP
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      رمز التحقق (6 أرقام)
                    </label>
                    <input
                      type="text"
                      placeholder="123456"
                      value={otpForm.otp}
                      onChange={(e) => setOtpForm({ ...otpForm, otp: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-center text-2xl tracking-widest"
                      maxLength={6}
                    />
                  </div>
                  {message && (
                    <div className={`text-sm px-4 ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                      {message}
                    </div>
                  )}
                  <button
                    onClick={handleVerifyOTP}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {loading ? 'جاري التحقق...' : 'تحقق من الرمز'}
                  </button>
                  <button
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="w-full bg-yellow-400 hover:bg-yellow-300 text-green-800 font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {loading ? 'جاري الإرسال...' : 'إعادة إرسال الرمز'}
                  </button>
                  <button
                    onClick={() => setActiveView('landing')}
                    className="w-full text-sm text-slate-500 hover:text-green-600 transition-colors"
                  >
                    العودة للرئيسية
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MOBILE BOTTOM NAV ─── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-green-500/40 border-t border-green-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] h-12">
        <div className={`grid h-12 ${token ? 'grid-cols-3' : 'grid-cols-4'}`}>
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
            ...(!token ? [
              {
                id: "client" as View,
                label: "الزبون",
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
            ] : []),
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
