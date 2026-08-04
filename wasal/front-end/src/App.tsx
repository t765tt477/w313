import { useState, useEffect } from "react"
import { Car, MapPin, Eye, EyeOff } from "lucide-react"
import About from "./pages/About"
import Profile from "./pages/Profile"
import Notifications from "./pages/Notifications"
import ChatWidget from "./components/ChatWidget"
import LocationPicker from "./components/LocationPicker"
import RouteMap from "./components/RouteMap"
import NotificationBell from "./components/NotificationBell"
import NotificationBellMobile from "./components/NotificationBellMobile"
import SocialLinks from "./components/SocialLinks"
import { authAPI, orderAPI, driverAPI, cityAPI } from "./services/api"
import { getSocket, disconnectSocket } from "./services/socket"
import { playNotificationSound, playIncomingOrderSound } from "./utils/sound"

type View = "landing" | "client" | "driver" | "about" | "profile" | "otp" | "chat" | "driver-pending" | "driver-recharge" | "my-orders" | "notifications" | "driver-tracking"

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
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<any>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingHover, setRatingHover] = useState(0)
  const [ratingSubmitting, setRatingSubmitting] = useState(false)

  // Driver state
  const [driverProfile, setDriverProfile] = useState<any>(null)
  // True while we're fetching an existing driver's profile after login/refresh.
  // Prevents the "new driver registration" form from flashing on screen for
  // an already-registered driver before their profile data has arrived.
  const [driverProfileLoading, setDriverProfileLoading] = useState<boolean>(!!token)
  const [driverEarnings, setDriverEarnings] = useState<any[]>([])
  const [isDriverAvailable, setIsDriverAvailable] = useState(true)
  const [rechargeForm, setRechargeForm] = useState({ transactionLast6: '', amountSent: '' })
  const [rechargeErrors, setRechargeErrors] = useState({ transactionLast6: '', amountSent: '' })
  const [submittingRecharge, setSubmittingRecharge] = useState(false)
  const [rechargeSuccess, setRechargeSuccess] = useState(false)
  const [rechargeSuccessMessage, setRechargeSuccessMessage] = useState('')
  const [rechargeRequests, setRechargeRequests] = useState<any[]>([])
  const [balanceTransactions, setBalanceTransactions] = useState<any[]>([])
  const [lowBalanceWarning, setLowBalanceWarning] = useState<string | null>(null)
  const [showRechargePopup, setShowRechargePopup] = useState(false)

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
  const [loginErrors, setLoginErrors] = useState({ email: '', password: '' })
  const [registerErrors, setRegisterErrors] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '', city: '' })
  const [forgotPasswordErrors, setForgotPasswordErrors] = useState({ email: '', otp: '', newPassword: '' })
  const [driverErrors, setDriverErrors] = useState({
    name: '', phone: '', email: '', nationalId: '', birthDate: '', city: '', password: '', confirmPassword: '',
    vehicleType: '', plateNumber: '', vehicleModel: '', vehicleYear: '', vehicleColor: '', chassisNumber: '', licenseNumber: ''
  })
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [pendingRole, setPendingRole] = useState<string | null>(null)
  const [driverForm, setDriverForm] = useState({
    name: '', phone: '', email: '', password: '', confirmPassword: '', nationalId: '', birthDate: '', city: '',
    vehicleType: 'motorcycle', plateNumber: '', vehicleModel: '', vehicleYear: '', vehicleColor: '', chassisNumber: '', licenseNumber: ''
  })
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [cities, setCities] = useState<{ _id: string; name: string }[]>([])
  const [orderForm, setOrderForm] = useState({ weight: 3, size: '1' })
  // Which specific action is currently in flight (e.g. "login", "reorder-<id>").
  // Using a key instead of one shared boolean means clicking "reorder" on one
  // order no longer makes every other button on the page (login, cancel on a
  // different order, etc.) show its own "loading" text at the same time.
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const isLoading = (key: string) => loadingAction === key
  const [message, setMessage] = useState('')

  // Auto-dismiss any success/error banner a few seconds after it appears,
  // so it doesn't linger on screen (across screens/actions) until a reload.
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 4000)
    return () => clearTimeout(t)
  }, [message])

  // Load data on mount
  useEffect(() => {
    if (token) {
      loadUserData()
    }
  }, [token])

  // Load client orders when user role is known or when entering my-orders page
  useEffect(() => {
    if (token && user?.role === 'client') {
      loadClientOrders()
    }
  }, [token, user?.role])

  // Load orders when entering my-orders page
  useEffect(() => {
    if (activeView === 'my-orders' && token && user?.role === 'client') {
      loadClientOrders()
    }
  }, [activeView])

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

    // Order timeout - auto-cancelled due to no available drivers
    const onOrderTimeout = async (payload: any) => {
      if (payload?.sound) playNotificationSound()
      setMessage(payload?.message || 'عذراً، لم يتم العثور على مندوب متاح في الوقت المحدد. يرجى المحاولة مرة أخرى بعد قليل.')
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

    // Driver's wallet balance changed (commission deducted, recharge approved, etc.)
    const onBalanceUpdated = (payload: any) => {
      setDriverProfile((prev: any) => prev ? { ...prev, balance: payload.balance } : prev)
    }

    // Driver's balance dropped below the minimum threshold - show a warning
    // with a direct "recharge" action.
    const onBalanceLow = (notification: any) => {
      if (notification?.sound) playNotificationSound()
      setLowBalanceWarning(notification?.message || 'رصيدك غير كافٍ، يرجى شحن الرصيد')
    }

    // A previously-submitted recharge request was approved or rejected.
    const onRechargeReviewed = (payload: any) => {
      playNotificationSound()
      setMessage(
        payload?.status === 'approved'
          ? 'تمت الموافقة على طلب شحن رصيدك'
          : payload?.rechargeRequest?.reviewNote
            ? `تم رفض طلب شحن رصيدك: ${payload.rechargeRequest.reviewNote}`
            : 'تم رفض طلب شحن رصيدك'
      )
      if (payload?.status === 'approved') setLowBalanceWarning(null)
      driverAPI.getMyRechargeRequests().then((res) => setRechargeRequests(res.data.rechargeRequests || [])).catch(() => { })
    }

    socket.on('notification:new', onNotification)
    socket.on('order:new_offer', onNewOffer)
    socket.on('order:accepted', onOrderAccepted)
    socket.on('order:status_changed', onStatusChanged)
    socket.on('order:timeout', onOrderTimeout)
    socket.on('driver:location', onDriverLocation)
    socket.on('balance:updated', onBalanceUpdated)
    socket.on('balance:low', onBalanceLow)
    socket.on('recharge:reviewed', onRechargeReviewed)

    return () => {
      socket.off('notification:new', onNotification)
      socket.off('order:new_offer', onNewOffer)
      socket.off('order:accepted', onOrderAccepted)
      socket.off('order:status_changed', onStatusChanged)
      socket.off('order:timeout', onOrderTimeout)
      socket.off('driver:location', onDriverLocation)
      socket.off('balance:updated', onBalanceUpdated)
      socket.off('balance:low', onBalanceLow)
      socket.off('recharge:reviewed', onRechargeReviewed)
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
      setActiveView('driver-tracking')
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

      if (userRes.data.user.role === 'client') {
        setDriverProfileLoading(false)
        const ordersRes = await orderAPI.getUserOrders()
        setOrders(ordersRes.data.orders || [])
        if (ordersRes.data.orders.length > 0) {
          setCurrentOrder(ordersRes.data.orders[0])
        }
      }

      if (userRes.data.user.role === 'driver') {
        try {
          const driverRes = await driverAPI.getProfile()
          setDriverProfile(driverRes.data.driver)
          setIsDriverAvailable(driverRes.data.driver.isAvailable)
        } finally {
          // Whether the fetch succeeded or failed, we now know whether this
          // driver already has a profile - safe to stop showing the loader.
          setDriverProfileLoading(false)
        }

        // Load earnings data
        try {
          const earningsRes = await driverAPI.getEarnings()
          setDriverEarnings(earningsRes.data.earnings || [])
        } catch (error) {
          console.error('Error loading earnings:', error)
        }

        // Load wallet data (recharge requests + balance history)
        try {
          const rechargeRes = await driverAPI.getMyRechargeRequests()
          setRechargeRequests(rechargeRes.data.rechargeRequests || [])
        } catch (error) {
          console.error('Error loading recharge requests:', error)
        }
        try {
          const transactionsRes = await driverAPI.getMyBalanceTransactions()
          setBalanceTransactions(transactionsRes.data.transactions || [])
        } catch (error) {
          console.error('Error loading balance transactions:', error)
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      setDriverProfileLoading(false)
    }
  }

  // Auth handlers
  const handleLogin = async () => {
    const errors = { email: '', password: '' }
    if (!loginForm.email.trim()) errors.email = 'املء الحقل'
    if (!loginForm.password.trim()) errors.password = 'املء الحقل'
    setLoginErrors(errors)
    if (errors.email || errors.password) return

    setLoadingAction('login')
    try {
      const res = await authAPI.login(loginForm.email, loginForm.password)
      setToken(res.data.token)
      localStorage.setItem('token', res.data.token)
      setUser(res.data.user)

      // Redirect based on user role
      if (res.data.user.role === 'driver') {
        setDriverProfileLoading(true)
        setActiveView('driver')
      } else {
        setActiveView('client')
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل تسجيل الدخول')
    }
    setLoadingAction(null)
  }

  const handleRegister = async () => {
    const errors = { name: '', phone: '', email: '', password: '', confirmPassword: '', city: '' }
    if (!registerForm.name.trim()) errors.name = 'املء الحقل'
    if (!registerForm.phone.trim()) errors.phone = 'املء الحقل'
    if (!registerForm.email.trim()) errors.email = 'املء الحقل'
    if (!registerForm.city) errors.city = 'املء الحقل'
    if (!registerForm.password) errors.password = 'املء الحقل'
    else if (registerForm.password.length < 6) errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
    if (!registerForm.confirmPassword) errors.confirmPassword = 'املء الحقل'
    else if (registerForm.password !== registerForm.confirmPassword) errors.confirmPassword = 'كلمتي المرور غير متطابقين'
    setRegisterErrors(errors)
    if (Object.values(errors).some(e => e)) return

    setLoadingAction('register')
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
    setLoadingAction(null)
  }

  const handleVerifyOTP = async () => {
    setLoadingAction('verify-otp')
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
        setAgreedToTerms(false)
        setActiveView('driver-pending')
      } else {
        setActiveView('client')
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل التحقق من OTP')
    }
    setLoadingAction(null)
  }

  const handleResendOTP = async () => {
    setLoadingAction('resend-otp')
    try {
      const res = await authAPI.resendOTP({
        userId: pendingUserId,
        role: pendingRole
      })
      setMessage('تم إعادة إرسال رمز التحقق بنجاح')
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل إعادة إرسال الرمز')
    }
    setLoadingAction(null)
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
    setLoadingAction('create-order')
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
      setSelectedOrderForTracking(res.data.order)
      setRatingValue(0)
      setRatingHover(0)
      setActiveView('my-orders')
      setMessage('تم إنشاء الطلب بنجاح')
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل إنشاء الطلب')
    }
    setLoadingAction(null)
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

  const handleRateOrder = async (orderId: string) => {
    if (ratingValue < 1 || ratingValue > 5) {
      setMessage('يرجى اختيار عدد النجوم أولاً')
      return
    }
    setRatingSubmitting(true)
    try {
      const res = await orderAPI.rateOrder(orderId, ratingValue)
      setCurrentOrder((prev: any) => prev && prev._id === orderId
        ? { ...prev, rating: res.data.rating ?? ratingValue }
        : prev)
      setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, rating: res.data.rating ?? ratingValue } : o))
      setMessage('شكرًا لتقييمك، تم حفظه بنجاح')
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'تعذر إرسال التقييم')
    }
    setRatingSubmitting(false)
  }

  const handleCancelOrder = async () => {
    if (!currentOrder) return
    setLoadingAction(`cancel-order-${currentOrder?._id}`)
    try {
      const res = await orderAPI.cancelOrder(currentOrder._id, { reason: 'client' })
      setCurrentOrder(res.data.order)
      setOrders((prev) => prev.map((o) => o._id === res.data.order._id ? res.data.order : o))
      setMessage('تم إلغاء الطلب بنجاح')
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'تعذر إلغاء الطلب')
    }
    setLoadingAction(null)
  }

  const handleReorder = async (order: any) => {
    if (!order) return
    setLoadingAction(`reorder-${order?._id}`)
    try {
      const distance = calculateDistance(
        { lat: order.pickupLocation.lat, lng: order.pickupLocation.lng },
        { lat: order.deliveryLocation.lat, lng: order.deliveryLocation.lng }
      )
      const res = await orderAPI.createOrder({
        pickupLocation: order.pickupLocation,
        deliveryLocation: order.deliveryLocation,
        packageDetails: order.packageDetails,
        distance,
        paymentMethod: order.paymentMethod || 'cash'
      })
      setCurrentOrder(res.data.order)
      setOrders([res.data.order, ...orders])
      setSelectedOrderForTracking(res.data.order)
      setRatingValue(0)
      setRatingHover(0)
      setMessage('تم إعادة الطلب بنجاح')
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل إعادة الطلب')
    }
    setLoadingAction(null)
  }

  const loadClientOrders = async () => {
    if (!token) return
    try {
      const res = await orderAPI.getUserOrders()
      console.log('Orders loaded:', res.data.orders)
      setOrders(res.data.orders || [])
    } catch (error) {
      console.error('Error loading orders:', error)
    }
  }

  // Driver handlers
  const handleDriverRegister = async () => {
    const errors = {
      name: '', phone: '', email: '', nationalId: '', birthDate: '', city: '', password: '', confirmPassword: '',
      vehicleType: '', plateNumber: '', vehicleModel: '', vehicleYear: '', vehicleColor: '', chassisNumber: '', licenseNumber: ''
    }
    if (!driverForm.name.trim()) errors.name = 'املء الحقل'
    if (!driverForm.phone.trim()) errors.phone = 'املء الحقل'
    if (!driverForm.email.trim()) errors.email = 'املء الحقل'
    if (!driverForm.nationalId.trim()) errors.nationalId = 'املء الحقل'
    if (!driverForm.birthDate) errors.birthDate = 'املء الحقل'
    if (!driverForm.city) errors.city = 'املء الحقل'
    if (!driverForm.vehicleType) errors.vehicleType = 'املء الحقل'
    if (!driverForm.plateNumber.trim()) errors.plateNumber = 'املء الحقل'
    if (!driverForm.vehicleModel.trim()) errors.vehicleModel = 'املء الحقل'
    if (!driverForm.vehicleYear.trim()) errors.vehicleYear = 'املء الحقل'
    if (!driverForm.vehicleColor.trim()) errors.vehicleColor = 'املء الحقل'
    if (!driverForm.chassisNumber.trim()) errors.chassisNumber = 'املء الحقل'
    if (!driverForm.licenseNumber.trim()) errors.licenseNumber = 'املء الحقل'
    if (!driverForm.password) errors.password = 'املء الحقل'
    else if (driverForm.password.length < 6) errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
    if (!driverForm.confirmPassword) errors.confirmPassword = 'املء الحقل'
    else if (driverForm.password !== driverForm.confirmPassword) errors.confirmPassword = 'كلمتي المرور غير متطابقين'

    setDriverErrors(errors)
    if (Object.values(errors).some(e => e)) return

    if (!agreedToTerms) {
      setMessage('يجب الموافقة على شروط وسياسات التسجيل قبل إرسال الطلب')
      return
    }
    setLoadingAction('driver-register')
    try {
      const { confirmPassword, ...payload } = driverForm
      console.log('Sending driver registration data:', { ...payload, role: 'driver' })
      const res = await authAPI.register({
        ...payload,
        role: 'driver'
      })
      setPendingUserId(res.data.userId)
      setPendingRole('driver')
      setMessage('تم إرسال طلب التسجيل بنجاح. يرجى التحقق من OTP.')
      setActiveView('otp')
    } catch (error: any) {
      console.error('Driver registration error:', error.response?.data)
      setMessage(error.response?.data?.message || 'فشل إرسال الطلب')
    }
    setLoadingAction(null)
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

  const handleSubmitRecharge = async () => {
    const errors = { transactionLast6: '', amountSent: '' }

    if (!rechargeForm.transactionLast6.trim()) {
      errors.transactionLast6 = 'يرجى إدخال آخر 6 أرقام من عملية التحويل'
    } else if (rechargeForm.transactionLast6.trim().length !== 6) {
      errors.transactionLast6 = 'يجب أن يكون رقم العملية 6 أرقام'
    }

    if (!rechargeForm.amountSent || Number(rechargeForm.amountSent) <= 0) {
      errors.amountSent = 'يرجى إدخال قيمة المبلغ المرسل'
    }

    setRechargeErrors(errors)

    if (errors.transactionLast6 || errors.amountSent) {
      return
    }

    setSubmittingRecharge(true)
    try {
      await driverAPI.requestRecharge(rechargeForm.transactionLast6.trim(), Number(rechargeForm.amountSent))
      setRechargeSuccessMessage('تم إرسال طلب الشحن، سيتم مراجعته قريبًا')
      setRechargeSuccess(true)
      setRechargeForm({ transactionLast6: '', amountSent: '' })
      setRechargeErrors({ transactionLast6: '', amountSent: '' })
      const rechargeRes = await driverAPI.getMyRechargeRequests()
      setRechargeRequests(rechargeRes.data.rechargeRequests || [])
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'فشل إرسال طلب الشحن'

      // Check if error is about duplicate transaction
      if (errorMessage.includes('مسجل مسبقاً') || errorMessage.includes('استخدام نفس الرقم')) {
        setRechargeErrors({
          transactionLast6: errorMessage,
          amountSent: ''
        })
      } else {
        setRechargeSuccessMessage(errorMessage)
        setRechargeSuccess(true)
      }
    } finally {
      setSubmittingRecharge(false)
    }
  }

  const handleResetRechargeForm = () => {
    setRechargeSuccess(false)
    setRechargeSuccessMessage('')
    setRechargeForm({ transactionLast6: '', amountSent: '' })
    setRechargeErrors({ transactionLast6: '', amountSent: '' })
  }

  const handleUpdateDriverOrderStatus = async (status: 'picked_up' | 'delivered') => {
    if (!currentOrder) return
    setLoadingAction(`driver-status-${currentOrder?._id}`)
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
    setLoadingAction(null)
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
    const errors = { email: '', otp: '', newPassword: '' }
    if (!forgotPasswordForm.email.trim()) errors.email = 'املء الحقل'
    setForgotPasswordErrors(errors)
    if (errors.email) return

    setLoadingAction('forgot-password')
    try {
      await authAPI.forgotPassword(forgotPasswordForm.email)
      setForgotPasswordStep('otp')
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل إرسال رمز التحقق')
    }
    setLoadingAction(null)
  }

  const handleResendForgotPasswordOTP = async () => {
    setLoadingAction('resend-forgot-password-otp')
    try {
      await authAPI.forgotPassword(forgotPasswordForm.email)
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'فشل إعادة إرسال الرمز')
    }
    setLoadingAction(null)
  }

  const handleResetPassword = async () => {
    const errors = { email: '', otp: '', newPassword: '' }
    if (!forgotPasswordForm.otp.trim()) errors.otp = 'املء الحقل'
    if (!forgotPasswordForm.newPassword) errors.newPassword = 'املء الحقل'
    else if (forgotPasswordForm.newPassword.length < 6) errors.newPassword = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
    setForgotPasswordErrors(errors)
    if (errors.otp || errors.newPassword) return

    setLoadingAction('reset-password')
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
    setLoadingAction(null)
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
              {/* Notification Bell */}
              {token && (
                <NotificationBell
                  onViewNotifications={() => setActiveView("notifications")}
                />
              )}
              {[
                ...(!token ? [
                  { id: "client" as View, label: "تطبيق الزبون" },
                  { id: "driver" as View, label: "تطبيق المندوب" },
                ] : []),
                ...(token && user?.role === 'driver' ? [
                  { id: "driver" as View, label: "تطبيق المندوب" },
                ] : []),
                ...(token && user?.role !== 'driver' ? [
                  { id: "my-orders" as View, label: "طلباتي" },
                ] : []),
                { id: "about" as View, label: "عن وصل" },
                ...(token ? [{ id: "chat" as View, label: "الدردشة" }] : []),
                ...(token ? [{ id: "profile" as View, label: "البروفايل" }] : []),
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === item.id
                    ? "bg-yellow-400 text-green-800 shadow-xs"
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
              className="bg-yellow-400 hover:bg-yellow-300 text-green-900 font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-xs hover:shadow-md active:scale-95"
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
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                رفض
              </button>
              <button
                onClick={handleAcceptOffer}
                disabled={offerLoading}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
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

            <div className="first-page top-spacing relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
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
                      className="bg-yellow-400 hover:bg-yellow-300 text-green-800 font-bold px-7.5 py-2.5 rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 text-base"
                    >
                      أرسل طلبًا الآن
                    </button>
                    <button
                      onClick={() => setActiveView("driver")}
                      className="bg-white/15 backdrop-blur-sm hover:bg-white/25 text-white font-semibold px-8 py-2.5 rounded-2xl border border-white/30 transition-all text-base"
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

      {/* ─── CHAT PAGE ─── */}
      {activeView === "chat" && token && (
        <div className="top-spacing pb-10">
          <ChatWidget token={token} user={user} currentOrder={currentOrder} />
        </div>
      )}

      {/* ─── PROFILE PAGE ─── */}
      {activeView === "profile" && <Profile user={user} onLogout={handleLogout} />}

      {/* ─── NOTIFICATIONS PAGE ─── */}
      {activeView === "notifications" && token && (
        <Notifications
          user={user}
          onViewOrders={() => setActiveView("my-orders")}
          onViewProfile={() => setActiveView("profile")}
          onBack={() => setActiveView("landing")}
        />
      )}

      {/* ─── DRIVER RECHARGE PAGE ─── */}
      {activeView === "driver-recharge" && token && user?.role === 'driver' && (
        <div className="top-spacing pb-10 max-w-lg mx-auto px-4 md:px-0">
          <button
            onClick={() => setActiveView('driver')}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-green-700 mb-4"
          >
            <span>→</span> العودة لتطبيق المندوب
          </button>

          <h1 className="text-xl font-black text-slate-900 mb-1">شحن الرصيد</h1>
          <p className="text-sm text-slate-500 mb-6">
            رصيدك الحالي: <span className="font-bold text-green-700">{(driverProfile?.balance || 0).toFixed(2)} جنيه</span>
          </p>

          {/* Bank transfer recharge form */}
          {!rechargeSuccess ? (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-5 mb-6">
              <h2 className="font-black text-slate-800 mb-1">شحن عبر التحويل البنكي (بنكك)</h2>
              <p className="text-xs text-slate-400 mb-4">
                أرسل المبلغ عبر تطبيق بنكك، ثم أدخل آخر 6 أرقام من عملية التحويل وقيمة المبلغ المرسل بالجنيه السوداني.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">آخر 6 أرقام من عملية التحويل</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={rechargeForm.transactionLast6}
                    onChange={(e) => {
                      setRechargeForm({ ...rechargeForm, transactionLast6: e.target.value.replace(/\D/g, '').slice(0, 6) })
                      if (rechargeErrors.transactionLast6) {
                        setRechargeErrors({ ...rechargeErrors, transactionLast6: '' })
                      }
                    }}
                    placeholder="مثال: 482913"
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${rechargeErrors.transactionLast6
                      ? 'border-red-500 focus:ring-red-400'
                      : 'border-slate-200 focus:ring-green-400'
                      }`}
                  />
                  {rechargeErrors.transactionLast6 && (
                    <p className="text-red-500 text-xs mt-1">{rechargeErrors.transactionLast6}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">قيمة المبلغ المرسل (جنيه سوداني)</label>
                  <input
                    type="number"
                    min={1}
                    value={rechargeForm.amountSent}
                    onChange={(e) => {
                      setRechargeForm({ ...rechargeForm, amountSent: e.target.value })
                      if (rechargeErrors.amountSent) {
                        setRechargeErrors({ ...rechargeErrors, amountSent: '' })
                      }
                    }}
                    placeholder="0.00"
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${rechargeErrors.amountSent
                      ? 'border-red-500 focus:ring-red-400'
                      : 'border-slate-200 focus:ring-green-400'
                      }`}
                  />
                  {rechargeErrors.amountSent && (
                    <p className="text-red-500 text-xs mt-1">{rechargeErrors.amountSent}</p>
                  )}
                </div>
                <button
                  onClick={handleSubmitRecharge}
                  disabled={submittingRecharge}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold py-2.5 rounded-xl transition-colors"
                >
                  {submittingRecharge ? 'جاري الإرسال...' : 'إرسال طلب الشحن'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-8 mb-6 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">
                {rechargeSuccessMessage.includes('فشل') ? 'فشل طلب الشحن' : 'تم طلب الشحن'}
              </h2>
              <p className={`text-sm mb-6 ${rechargeSuccessMessage.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                {rechargeSuccessMessage}
              </p>
              <button
                onClick={handleResetRechargeForm}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors"
              >
                إعادة الشحن
              </button>
            </div>
          )}

          {/* Recharge requests history */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-5 mb-6">
            <h2 className="font-black text-slate-800 mb-3">طلبات الشحن السابقة</h2>
            {rechargeRequests.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">لا توجد طلبات شحن بعد</p>
            ) : (
              <div className="space-y-2">
                {rechargeRequests.map((req: any) => (
                  <div key={req._id} className="flex items-center justify-between border border-slate-100 rounded-xl p-3">
                    <div>
                      <div className="text-sm font-bold text-slate-800">{req.amountSent.toFixed(2)} جنيه</div>
                      <div className="text-xs text-slate-400">
                        {new Date(req.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                      {req.status === 'rejected' && req.reviewNote && (
                        <div className="text-xs text-red-600 mt-1">سبب الرفض: {req.reviewNote}</div>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${req.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : req.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {req.status === 'pending' ? 'قيد المراجعة' : req.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Balance transaction history */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-5">
            <h2 className="font-black text-slate-800 mb-3">سجل حركة الرصيد</h2>
            {balanceTransactions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">لا توجد عمليات على الرصيد بعد</p>
            ) : (
              <div className="space-y-2">
                {balanceTransactions.map((t: any) => {
                  const isPositive = t.amount >= 0
                  const typeLabel = {
                    recharge_bank: 'شحن بنكي',
                    recharge_cash: 'شحن نقدي',
                    commission_deduction: 'خصم عمولة',
                    adjustment: 'تعديل'
                  }[t.type as string] || t.type
                  return (
                    <div key={t._id} className="flex items-center justify-between border border-slate-100 rounded-xl p-3">
                      <div>
                        <div className="text-xs text-slate-500">{typeLabel}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(t.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </div>
                      <div className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{t.amount.toFixed(2)} جنيه
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CLIENT APP ─── */}
      {activeView === "client" && (
        <div className="top-spacing pb-6">
          <div className="mb-6 px-4 md:px-8">
            <h1 className="text-sm font-black text-slate-900">تطبيق الزبون</h1>
            <p className="text-slate-500 mt-1">
              أنشئ وتابع طلبات التوصيل بسهولة
            </p>
          </div>

          {token && user?.role === 'driver' ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl mx-8 p-4 text-center">
              <h2 className="text-lg font-black text-red-800 mb-2">عفواً، هذه الصفحة للزبائن فقط</h2>
              <p className="text-red-600 mb-4">أنت مسجل دخول كمندوب. يرجى استخدام تطبيق المندوب.</p>
              <button
                onClick={() => setActiveView('driver')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold px-6 py-2.5 rounded-lg transition-colors"
              >
                الانتقال لتطبيق المندوب
              </button>
            </div>
          ) : !token ? (
            <section>
              {/* Tab toggle */}
              <div className="flex flex-row w-fit bg-slate-100 rounded-xl p-1 mb-4 md:mb-6 mx-auto gap-1">
                {(["login", "register"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-6 py-2 md:py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === t
                      ? "bg-white shadow text-green-700"
                      : "text-slate-500"
                      }`}
                  >
                    {t === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
                  </button>
                ))}
              </div>

              {/* Auth form */}
              <div className="max-w-2xl px-4 mx-auto">
                <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-4 mx-auto">
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
                            placeholder="09XXXXXXXX أو xxx@email.com"
                            value={loginForm.email}
                            onChange={(e) => { setLoginForm({ ...loginForm, email: e.target.value }); setLoginErrors({ ...loginErrors, email: '' }) }}
                            required
                            className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right ${loginErrors.email ? 'border-red-500' : 'border-slate-200'}`}
                          />
                          {loginErrors.email && <p className="text-red-500 text-xs mt-1">{loginErrors.email}</p>}
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
                              onChange={(e) => { setLoginForm({ ...loginForm, password: e.target.value }); setLoginErrors({ ...loginErrors, password: '' }) }}
                              required
                              className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all ${loginErrors.password ? 'border-red-500' : 'border-slate-200'}`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          {loginErrors.password && <p className="text-red-500 text-xs mt-1">{loginErrors.password}</p>}
                        </div>
                        {message && (
                          <div className={`text-sm px-4 ${message.includes('فشل') ? 'text-red-600' : 'text-red-400'}`}>
                            {message}
                          </div>
                        )}
                        <button
                          onClick={handleLogin}
                          disabled={isLoading('login')}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                        >
                          {isLoading('login') ? 'جاري الدخول...' : 'دخول'}
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
                                onChange={(e) => { setForgotPasswordForm({ ...forgotPasswordForm, email: e.target.value }); setForgotPasswordErrors({ ...forgotPasswordErrors, email: '' }) }}
                                required
                                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right ${forgotPasswordErrors.email ? 'border-red-500' : 'border-slate-200'}`}
                              />
                              {forgotPasswordErrors.email && <p className="text-red-500 text-xs mt-1">{forgotPasswordErrors.email}</p>}
                            </div>
                            {message && (
                              <div className={`text-sm px-4 ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                                {message}
                              </div>
                            )}
                            <button
                              onClick={handleForgotPassword}
                              disabled={isLoading('forgot-password')}
                              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                            >
                              {isLoading('forgot-password') ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
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
                                onChange={(e) => { setForgotPasswordForm({ ...forgotPasswordForm, otp: e.target.value }); setForgotPasswordErrors({ ...forgotPasswordErrors, otp: '' }) }}
                                required
                                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-center text-2xl tracking-widest ${forgotPasswordErrors.otp ? 'border-red-500' : 'border-slate-200'}`}
                                maxLength={6}
                              />
                              {forgotPasswordErrors.otp && <p className="text-red-500 text-xs mt-1">{forgotPasswordErrors.otp}</p>}
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
                                  onChange={(e) => { setForgotPasswordForm({ ...forgotPasswordForm, newPassword: e.target.value }); setForgotPasswordErrors({ ...forgotPasswordErrors, newPassword: '' }) }}
                                  required
                                  minLength={6}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all ${forgotPasswordErrors.newPassword ? 'border-red-500' : 'border-slate-200'}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                              </div>
                              {forgotPasswordErrors.newPassword && <p className="text-red-500 text-xs mt-1">{forgotPasswordErrors.newPassword}</p>}
                            </div>
                            {message && (
                              <div className={`text-sm px-4 ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                                {message}
                              </div>
                            )}
                            <button
                              onClick={handleResetPassword}
                              disabled={isLoading('reset-password')}
                              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                            >
                              {isLoading('reset-password') ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                            </button>
                            <button
                              onClick={handleResendForgotPasswordOTP}
                              disabled={isLoading('resend-forgot-password-otp')}
                              className="w-full bg-yellow-400 hover:bg-yellow-300 text-green-800 font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                            >
                              {isLoading('resend-forgot-password-otp') ? 'جاري الإرسال...' : 'إعادة إرسال الرمز'}
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
                        أنشئ حسابك
                      </h2>
                      <div className="space-y-4">
                        {[
                          {
                            label: "الاسم الكامل",
                            type: "text",
                            ph: "شاذلي طارق الشاذلي",
                            key: "name"
                          },
                          { label: "رقم الهاتف", type: "tel", ph: "09XXXXXXXX", key: "phone" },
                          {
                            label: "البريد الإلكتروني",
                            type: "email",
                            ph: "xxx@email.com",
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
                                  onChange={(e) => { setRegisterForm({ ...registerForm, [f.key]: e.target.value }); setRegisterErrors({ ...registerErrors, [f.key]: '' }) }}
                                  required
                                  minLength={6}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all ${registerErrors[f.key as keyof typeof registerErrors] ? 'border-red-500' : 'border-slate-200'}`}
                                />
                                <button
                                  type="button"
                                  onClick={f.toggleVisible}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                  {f.visible ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                              </div>
                            ) : (
                              <input
                                id={`register-${f.key}`}
                                name={`register-${f.key}`}
                                type={f.type}
                                placeholder={f.ph}
                                value={registerForm[f.key as keyof typeof registerForm]}
                                onChange={(e) => { setRegisterForm({ ...registerForm, [f.key]: e.target.value }); setRegisterErrors({ ...registerErrors, [f.key]: '' }) }}
                                required
                                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right ${registerErrors[f.key as keyof typeof registerErrors] ? 'border-red-500' : 'border-slate-200'}`}
                              />
                            )}
                            {registerErrors[f.key as keyof typeof registerErrors] && <p className="text-red-500 text-xs mt-1">{registerErrors[f.key as keyof typeof registerErrors]}</p>}
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
                            onChange={(e) => { setRegisterForm({ ...registerForm, city: e.target.value }); setRegisterErrors({ ...registerErrors, city: '' }) }}
                            required
                            className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-right ${registerErrors.city ? 'border-red-500' : 'border-slate-200'}`}
                          >
                            <option value="">اختر مدينتك</option>
                            {cities.map((c) => (
                              <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                          </select>
                          {registerErrors.city && <p className="text-red-500 text-xs mt-1">{registerErrors.city}</p>}
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
                          disabled={isLoading('register')}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                        >
                          {isLoading('register') ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

            </section>
          ) : (
            <div className="grid lg:grid-cols-5 gap-8">
              {/* Order creation */}
              <div className="lg:col-span-5 space-y-4">
                {/* New order */}
                <div className="bg-white pb-6">
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
                        required
                        min="1"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-right"
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
                        required
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-right bg-white"
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
                      disabled={isLoading('create-order')}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {isLoading('create-order') ? 'جاري إنشاء الطلب...' : 'إنشاء الطلب'}
                    </button>
                    <span className="text-sm text-slate-500">الدفع <span className="font-bold text-blue-600">كاش</span> او <span className="font-bold text-red-600">بنكك</span></span>
                  </div>
                  {message && (
                    <div className={`px-4 pt-3 text-sm ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                      {message}
                    </div>
                  )}
                </div>

                {/* Order tracking — same card style as the driver's "طلب جارٍ" tracking page */}
                {currentOrder && (
                  <div className="bg-white p-3 mb-6">
                    <div className="flex items-center justify-between mb-4">
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
                    {/* Cancel button for pending orders */}
                    {currentOrder.status === 'pending' && (
                      <div className="mb-4 flex flex-row justify-evenly">
                        <button
                          onClick={handleCancelOrder}
                          disabled={isLoading(`cancel-order-${currentOrder?._id}`)}
                          className="w-fit bg-red-100 hover:bg-red-200 text-red-700 font-bold px-6 py-2 rounded-xl transition-colors disabled:opacity-50 text-sm"
                        >
                          {isLoading(`cancel-order-${currentOrder?._id}`) ? 'جاري الإلغاء...' : 'إلغاء الطلب'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrderForTracking(currentOrder)
                            setActiveView('my-orders')
                          }}
                          className="w-fit bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-bold px-6 py-2 rounded-xl transition-colors disabled:opacity-50 text-sm"
                        >
                          تتبع الطلب
                        </button>
                      </div>
                    )}
                    {/* Auto-cancel message */}
                    {currentOrder.status === 'cancelled' && currentOrder.cancelReason === 'timeout' && (
                      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                        <div className="font-black text-amber-800 mb-2">⏰ انتهت مدة الانتظار</div>
                        <div className="text-amber-700 text-sm mb-3">
                          عذراً، لم يتم العثور على مندوب متاح في الوقت المحدد. يرجى الانتظار قليلاً ثم إعادة إنشاء الطلب.
                        </div>
                        <button
                          onClick={() => handleReorder(currentOrder)}
                          disabled={isLoading(`reorder-${currentOrder?._id}`)}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl transition-colors text-sm disabled:opacity-50"
                        >
                          {isLoading(`reorder-${currentOrder?._id}`) ? 'جاري إعادة الطلب...' : 'إعادة الطلب'}
                        </button>
                      </div>
                    )}
                    {/* Client cancel message */}
                    {currentOrder.status === 'cancelled' && currentOrder.cancelReason === 'client' && (
                      <div className="mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                        <div className="font-black text-slate-800 mb-2">تم إلغاء الطلب</div>
                        <div className="text-slate-600 text-sm mb-3">
                          يمكنك إعادة إنشاء الطلب في أي وقت
                        </div>
                        <button
                          onClick={() => handleReorder(currentOrder)}
                          disabled={isLoading(`reorder-${currentOrder?._id}`)}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl transition-colors text-sm disabled:opacity-50"
                        >
                          {isLoading(`reorder-${currentOrder?._id}`) ? 'جاري إعادة الطلب...' : 'إعادة الطلب'}
                        </button>
                      </div>
                    )}
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
                              className={`text-[8px] font-semibold ${s.done ? "text-green-600" : "text-slate-400"
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
                          activeLeg={currentOrder.status === 'accepted' ? 'to_pickup' : 'to_delivery'}
                          height="260px"
                        />
                      </div>
                    )}
                    {/* Pickup / delivery info — same grid style as the driver card */}
                    <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
                      <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                        <div className="font-semibold text-green-800 mb-0.5">📍 الاستلام</div>
                        <div className="text-slate-600">{currentOrder.pickupLocation?.address || '---'}</div>
                      </div>
                      <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100">
                        <div className="font-semibold text-yellow-800 mb-0.5">📍 التسليم</div>
                        <div className="text-slate-600">{currentOrder.deliveryLocation?.address || '---'}</div>
                      </div>
                    </div>
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
                            {[1, 2, 3, 4, 5].map((n) => (
                              <span key={n} className={`text-xs ${n <= Math.round(currentOrder.driver.rating || 0) ? 'text-yellow-400' : 'text-slate-200'}`}>
                                ★
                              </span>
                            ))}
                            <span className="text-xs text-slate-500 mr-1">{(currentOrder.driver.rating || 0).toFixed(1)}</span>
                          </div>
                        </div>
                        <button className="bg-green-100 text-green-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-green-200 transition-colors">
                          اتصال
                        </button>
                      </div>
                    )}
                    {/* Rate the driver - shown once the order is delivered */}
                    {currentOrder.status === 'delivered' && (
                      <div className="mt-4 bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
                        {currentOrder.rating ? (
                          <>
                            <div className="font-black text-green-800 mb-1">شكرًا لتقييمك 🎉</div>
                            <div className="flex items-center justify-center gap-1">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <span key={n} className={`text-lg ${n <= currentOrder.rating ? 'text-yellow-400' : 'text-slate-200'}`}>★</span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-black text-slate-800 mb-2">كيف كانت تجربتك مع المندوب؟</div>
                            <div className="flex items-center justify-center gap-1 mb-3">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => setRatingValue(n)}
                                  onMouseEnter={() => setRatingHover(n)}
                                  onMouseLeave={() => setRatingHover(0)}
                                  className={`text-2xl transition-colors ${n <= (ratingHover || ratingValue) ? 'text-yellow-400' : 'text-slate-300'}`}
                                  aria-label={`${n} نجوم`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => handleRateOrder(currentOrder._id)}
                              disabled={ratingSubmitting || ratingValue === 0}
                              className="bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-6 py-2 rounded-xl transition-colors disabled:opacity-50"
                            >
                              {ratingSubmitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MY ORDERS PAGE ─── */}
      {activeView === "my-orders" && token && (
        <div className="order-tracking">

          {!selectedOrderForTracking ? (
            <div className="px-4 md:px-8 top-spacing flex flex-wrap">
              {orders.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-8 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mb-2">لا توجد طلبات بعد</h2>
                  <p className="text-slate-500 mb-4">ابدأ بإنشاء طلب توصيل جديد</p>
                  <button
                    onClick={() => setActiveView('client')}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors"
                  >
                    إنشاء طلب جديد
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">عدد الطلبات: {orders.length}</p>
                  <section className="flex flex-row flex-wrap justify-center gap-3">
                    {orders.map((order) => (
                      <div key={order._id} className="bg-white max-w-sm rounded-2xl shadow-xs p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-bold text-yellow-600">طلب #{order._id?.slice(-6) || '---'}</div>
                              <div className="text-xs text-slate-500">
                                {new Date(order.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                              </div>
                            </div>
                          </div>
                          <span className={`font-bold text-sm px-3 py-1 rounded-full ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            order.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                              order.status === 'picked_up' ? 'bg-purple-100 text-purple-700' :
                                order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                  'bg-red-100 text-red-700'
                            }`}>
                            {order.status === 'pending' ? 'قيد الانتظار' :
                              order.status === 'accepted' ? 'تم القبول' :
                                order.status === 'picked_up' ? 'تم الاستلام' :
                                  order.status === 'delivered' ? 'تم التسليم' :
                                    'ملغي'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div>
                            <div className="text-slate-500 text-xs mb-1">من</div>
                            <div className="text-slate-900 font-medium truncate">{order.pickupLocation?.address || '---'}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 text-xs mb-1">إلى</div>
                            <div className="text-slate-900 font-medium truncate">{order.deliveryLocation?.address || '---'}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm mb-3">
                          <div className="text-slate-500">
                            <span className="font-semibold text-slate-700">التكلفة:</span>
                            <span className="font-bold text-green-700 mr-1">{order.price?.toFixed(2) || '0.00'} جنيه</span>
                          </div>
                          {order.driver && (
                            <div className="text-slate-500">
                              <span className="font-semibold text-slate-700">المندوب:</span>
                              <span className="font-medium text-slate-900 mr-1">{order.driver.name || '---'}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {['pending', 'accepted', 'picked_up'].includes(order.status) && (
                            <button
                              onClick={() => setSelectedOrderForTracking(order)}
                              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded-xl transition-colors text-sm"
                            >
                              تتبع الطلب
                            </button>
                          )}
                          {order.status === 'cancelled' && (
                            <button
                              onClick={() => handleReorder(order)}
                              disabled={isLoading(`reorder-${order._id}`)}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-xl transition-colors text-sm disabled:opacity-50"
                            >
                              {isLoading(`reorder-${order._id}`) ? 'جاري إعادة الطلب...' : 'إعادة الطلب'}
                            </button>
                          )}
                          {order.status === 'pending' && (
                            <button
                              onClick={async () => {
                                if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return
                                setLoadingAction(`cancel-order-${order._id}`)
                                try {
                                  const res = await orderAPI.cancelOrder(order._id, { reason: 'client' })
                                  setOrders((prev) => prev.map((o) => o._id === res.data.order._id ? res.data.order : o))
                                  setMessage('تم إلغاء الطلب بنجاح')
                                } catch (error: any) {
                                  setMessage(error.response?.data?.message || 'تعذر إلغاء الطلب')
                                }
                                setLoadingAction(null)
                              }}
                              disabled={isLoading(`cancel-order-${order._id}`)}
                              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-xl transition-colors text-sm disabled:opacity-50"
                            >
                              {isLoading(`cancel-order-${order._id}`) ? 'جاري الإلغاء...' : 'إلغاء الطلب'}
                            </button>
                          )}
                        </div>

                      </div>
                    ))}
                  </section>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full h-screen overflow-hidden">
              {/* Full screen map */}
              <div className="absolute inset-0 z-0">
                <RouteMap
                  pickup={selectedOrderForTracking.pickupLocation}
                  delivery={selectedOrderForTracking.deliveryLocation}
                  driverPosition={trackedDriverPosition}
                  activeLeg={selectedOrderForTracking.status === 'accepted' ? 'to_pickup' : 'to_delivery'}
                  height="100vh"
                />
              </div>

              {/* Floating back button */}
              <button
                onClick={() => setSelectedOrderForTracking(null)}
                className="absolute top-28 right-6.5 z-10 bg-white/95 backdrop-blur-sm shadow-lg border border-red-500 rounded-full p-1.5 hover:bg-white transition-colors"
              >
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Floating order info card */}
              <div className="absolute top-28 left-4 right-16 z-10">
                <div className="bg-white/95 backdrop-blur-sm w-fit shadow-lg rounded-2xl p-1">
                  <div className="flex items-center justify-between gap-1">
                    <h2 className="text-sm font-black text-slate-900">
                      تتبع الطلب #{selectedOrderForTracking._id?.slice(-6) || '---'}
                    </h2>
                    <span className={`font-bold text-xs px-3 py-1 rounded-full ${selectedOrderForTracking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      selectedOrderForTracking.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                        selectedOrderForTracking.status === 'picked_up' ? 'bg-purple-100 text-purple-700' :
                          selectedOrderForTracking.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                      }`}>
                      {selectedOrderForTracking.status === 'pending' ? 'قيد الانتظار' :
                        selectedOrderForTracking.status === 'accepted' ? 'تم القبول' :
                          selectedOrderForTracking.status === 'picked_up' ? 'تم الاستلام' :
                            selectedOrderForTracking.status === 'delivered' ? 'تم التسليم' :
                              'ملغي'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating location info */}
              <div className="absolute bottom-3 p-1 left-4 right-4 z-10">
                <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-2xl space-y-2 w-fit">
                  <div className="flex flex-col gap-1 p-1 text-sm w-fit">
                    <div className="bg-green-50 rounded-xl border border-green-100">
                      <div className="font-semibold text-green-800 mb-1 text-xs">📍 الاستلام</div>
                      <div className="text-slate-600 text-xs">{selectedOrderForTracking.pickupLocation?.address || '---'}</div>
                    </div>
                    <div className="bg-yellow-50 rounded-xl border border-yellow-100">
                      <div className="font-semibold text-yellow-800 mb-1 text-xs">🎯 التسليم</div>
                      <div className="text-slate-600 text-xs">{selectedOrderForTracking.deliveryLocation?.address || '---'}</div>
                    </div>
                  </div>

                  {selectedOrderForTracking.driver && (
                    <div className="bg-slate-50 rounded-xl p-1">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {selectedOrderForTracking.driver.name?.[0] || 'م'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{selectedOrderForTracking.driver.name || '---'}</div>
                          <div className="text-xs text-slate-500">{selectedOrderForTracking.driver.phone || '---'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Floating action buttons */}
              <div className="absolute bottom-35 left-4 right-4 z-10">
                <div className="flex flex-col w-fit gap-2">
                  {selectedOrderForTracking.status === 'pending' && (
                    <button
                      onClick={async () => {
                        if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return
                        setLoadingAction(`cancel-order-${selectedOrderForTracking._id}`)
                        try {
                          const res = await orderAPI.cancelOrder(selectedOrderForTracking._id, { reason: 'client' })
                          setOrders((prev) => prev.map((o) => o._id === res.data.order._id ? res.data.order : o))
                          setSelectedOrderForTracking(null)
                          setMessage('تم إلغاء الطلب بنجاح')
                        } catch (error: any) {
                          setMessage(error.response?.data?.message || 'تعذر إلغاء الطلب')
                        }
                        setLoadingAction(null)
                      }}
                      disabled={isLoading(`cancel-order-${selectedOrderForTracking._id}`)}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold p-1.5 rounded-xl transition-colors text-sm disabled:opacity-50 shadow-lg"
                    >
                      {isLoading(`cancel-order-${selectedOrderForTracking._id}`) ? 'جاري الإلغاء...' : 'إلغاء الطلب'}
                    </button>
                  )}
                  {selectedOrderForTracking.status === 'cancelled' && (
                    <button
                      onClick={() => handleReorder(selectedOrderForTracking)}
                      disabled={isLoading(`reorder-${selectedOrderForTracking._id}`)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold p-1.5 rounded-xl transition-colors text-sm disabled:opacity-50 shadow-lg"
                    >
                      {isLoading(`reorder-${selectedOrderForTracking._id}`) ? 'جاري إعادة الطلب...' : 'إعادة الطلب'}
                    </button>
                  )}
                  <button
                    onClick={() => setActiveView('client')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold p-1.5 rounded-xl transition-colors text-sm shadow-lg"
                  >
                    طلب جديد
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )
      }

      {/* ─── DRIVER APP ─── */}
      {
        activeView === "driver" && (
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
                <p className="text-red-600 mb-4">
                  أنت مسجل دخول حاليًا كزبون. للدخول أو التسجيل كمندوب، يرجى تسجيل الخروج
                  من حساب الزبون أولاً، ثم اضغط على زر «انضم كمندوب».
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors"
                  >
                    تسجيل الخروج
                  </button>
                  <button
                    onClick={() => setActiveView('client')}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-6 py-2.5 rounded-xl transition-colors"
                  >
                    الانتقال لتطبيق الزبون
                  </button>
                </div>
              </div>
            ) : !token ? (
              <>
                {/* Tab toggle */}
                <div className="flex bg-slate-100 mx-auto w-fit rounded-xl p-2 mb-5 md:mb-6 gap-1">
                  {(["login", "register"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setActiveTab(t); setDriverStep(1) }}
                      className={`px-6 py-1.5 md:py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === t
                        ? "bg-white shadow text-green-700"
                        : "text-slate-500"
                        }`}
                    >
                      {t === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
                    </button>
                  ))}
                </div>

                {/* Auth form */}
                {activeTab === "login" ? (
                  <div className="bg-white mx-auto max-w-xl border border-slate-100 rounded-2xl shadow-xs p-4">
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
                          required
                          className="w-full border border-slate-200 rounded-xl px-4 py-2 md:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right"
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
                            required
                            className="w-full border border-slate-200 rounded-xl px-4 py-2 md:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                        disabled={isLoading('login')}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 md:py-2.5 rounded-xl transition-colors disabled:opacity-50"
                      >
                        {isLoading('login') ? 'جاري الدخول...' : 'دخول'}
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
                  </div>
                ) : activeTab === "forgot-password" ? (
                  <div className="bg-white mx-auto max-w-xl border border-slate-100 rounded-2xl shadow-xs p-4">
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
                              required
                              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right"
                            />
                          </div>
                          {message && (
                            <div className={`text-sm px-4 ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                              {message}
                            </div>
                          )}
                          <button
                            onClick={handleForgotPassword}
                            disabled={isLoading('forgot-password')}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {isLoading('forgot-password') ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
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
                              required
                              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-center text-2xl tracking-widest"
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
                                required
                                minLength={6}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
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
                          {message && (
                            <div className={`text-sm px-4 ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                              {message}
                            </div>
                          )}
                          <button
                            onClick={handleResetPassword}
                            disabled={isLoading('reset-password')}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {isLoading('reset-password') ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                          </button>
                          <button
                            onClick={handleResendForgotPasswordOTP}
                            disabled={isLoading('resend-forgot-password-otp')}
                            className="w-full bg-yellow-400 hover:bg-yellow-300 text-green-800 font-bold py-2 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {isLoading('resend-forgot-password-otp') ? 'جاري الإرسال...' : 'إعادة إرسال الرمز'}
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
                  </div>
                ) : (
                  <>
                    {/* Driver registration with steps */}
                    <div className="grid lg:grid-cols-3 gap-2 mb-6">
                      <div className="lg:col-span-2">
                        {/* Step 1 */}
                        {driverStep === 1 && (
                          <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-4">
                            <h2 className="text-base font-black text-slate-900 mb-4">
                              البيانات الشخصية
                            </h2>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  الاسم الكامل
                                </label>
                                <input
                                  type="text"
                                  placeholder="الاسم الكامل"
                                  value={driverForm.name}
                                  onChange={(e) => { setDriverForm({ ...driverForm, name: e.target.value }); setDriverErrors({ ...driverErrors, name: '' }) }}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right ${driverErrors.name ? 'border-red-500' : 'border-slate-200'}`}
                                />
                                {driverErrors.name && <p className="text-red-500 text-xs mt-1">{driverErrors.name}</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  رقم الهاتف
                                </label>
                                <input
                                  type="tel"
                                  placeholder="09XXXXXXXX"
                                  value={driverForm.phone}
                                  onChange={(e) => { setDriverForm({ ...driverForm, phone: e.target.value }); setDriverErrors({ ...driverErrors, phone: '' }) }}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right ${driverErrors.phone ? 'border-red-500' : 'border-slate-200'}`}
                                />
                                {driverErrors.phone && <p className="text-red-500 text-xs mt-1">{driverErrors.phone}</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  البريد الإلكتروني
                                </label>
                                <input
                                  type="email"
                                  placeholder="name@email.com"
                                  value={driverForm.email}
                                  onChange={(e) => { setDriverForm({ ...driverForm, email: e.target.value }); setDriverErrors({ ...driverErrors, email: '' }) }}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right ${driverErrors.email ? 'border-red-500' : 'border-slate-200'}`}
                                />
                                {driverErrors.email && <p className="text-red-500 text-xs mt-1">{driverErrors.email}</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  رقم الهوية الوطنية
                                </label>
                                <input
                                  type="text"
                                  placeholder="رقم الهوية"
                                  value={driverForm.nationalId}
                                  onChange={(e) => { setDriverForm({ ...driverForm, nationalId: e.target.value }); setDriverErrors({ ...driverErrors, nationalId: '' }) }}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right ${driverErrors.nationalId ? 'border-red-500' : 'border-slate-200'}`}
                                />
                                {driverErrors.nationalId && <p className="text-red-500 text-xs mt-1">{driverErrors.nationalId}</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  تاريخ الميلاد
                                </label>
                                <input
                                  type="date"
                                  value={driverForm.birthDate}
                                  onChange={(e) => { setDriverForm({ ...driverForm, birthDate: e.target.value }); setDriverErrors({ ...driverErrors, birthDate: '' }) }}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right ${driverErrors.birthDate ? 'border-red-500' : 'border-slate-200'}`}
                                />
                                {driverErrors.birthDate && <p className="text-red-500 text-xs mt-1">{driverErrors.birthDate}</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  مدينة الإقامة
                                </label>
                                <select
                                  value={driverForm.city}
                                  onChange={(e) => { setDriverForm({ ...driverForm, city: e.target.value }); setDriverErrors({ ...driverErrors, city: '' }) }}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-right ${driverErrors.city ? 'border-red-500' : 'border-slate-200'}`}
                                >
                                  <option value="">اختر مدينتك</option>
                                  {cities.map((c) => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                  ))}
                                </select>
                                {driverErrors.city && <p className="text-red-500 text-xs mt-1">{driverErrors.city}</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  كلمة المرور
                                </label>
                                <div className="relative">
                                  <input
                                    type={showDriverPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={driverForm.password}
                                    onChange={(e) => { setDriverForm({ ...driverForm, password: e.target.value }); setDriverErrors({ ...driverErrors, password: '' }) }}
                                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all ${driverErrors.password ? 'border-red-500' : 'border-slate-200'}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowDriverPassword(!showDriverPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                  >
                                    {showDriverPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                  </button>
                                </div>
                                {driverErrors.password && <p className="text-red-500 text-xs mt-1">{driverErrors.password}</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  تأكيد كلمة المرور
                                </label>
                                <div className="relative">
                                  <input
                                    type={showDriverConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={driverForm.confirmPassword}
                                    onChange={(e) => { setDriverForm({ ...driverForm, confirmPassword: e.target.value }); setDriverErrors({ ...driverErrors, confirmPassword: '' }) }}
                                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all ${driverErrors.confirmPassword ? 'border-red-500' : 'border-slate-200'}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowDriverConfirmPassword(!showDriverConfirmPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                  >
                                    {showDriverConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                  </button>
                                </div>
                                {driverErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{driverErrors.confirmPassword}</p>}
                              </div>
                              {message && (
                                <div className={`text-sm ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                                  {message}
                                </div>
                              )}
                              <button
                                onClick={() => {
                                  const errors = {
                                    name: '', phone: '', email: '', nationalId: '', birthDate: '', city: '', password: '', confirmPassword: '',
                                    vehicleType: '', plateNumber: '', vehicleModel: '', vehicleYear: '', vehicleColor: '', chassisNumber: '', licenseNumber: ''
                                  }
                                  if (!driverForm.name.trim()) errors.name = 'املء الحقل'
                                  if (!driverForm.phone.trim()) errors.phone = 'املء الحقل'
                                  if (!driverForm.email.trim()) errors.email = 'املء الحقل'
                                  if (!driverForm.nationalId.trim()) errors.nationalId = 'املء الحقل'
                                  if (!driverForm.birthDate) errors.birthDate = 'املء الحقل'
                                  if (!driverForm.city) errors.city = 'املء الحقل'
                                  if (!driverForm.password) errors.password = 'املء الحقل'
                                  else if (driverForm.password.length < 6) errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
                                  if (!driverForm.confirmPassword) errors.confirmPassword = 'املء الحقل'
                                  else if (driverForm.password !== driverForm.confirmPassword) errors.confirmPassword = 'كلمتي المرور غير متطابقين'

                                  setDriverErrors(errors)
                                  if (Object.values(errors).some(e => e)) return

                                  setDriverStep(2)
                                }}
                                className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition-colors"
                              >
                                التالي ←
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Step 2 */}
                        {driverStep === 2 && (
                          <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-6">
                            <h2 className="text-base font-black text-slate-900 mb-6">
                              بيانات المركبة
                            </h2>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  نوع المركبة
                                </label>
                                <select
                                  value={driverForm.vehicleType}
                                  onChange={(e) => { setDriverForm({ ...driverForm, vehicleType: e.target.value }); setDriverErrors({ ...driverErrors, vehicleType: '' }) }}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-right ${driverErrors.vehicleType ? 'border-red-500' : 'border-slate-200'}`}
                                >
                                  <option value="motorcycle">دراجة نارية</option>
                                  <option value="car">سيارة</option>
                                  <option value="van">شاحنة صغيرة</option>
                                </select>
                                {driverErrors.vehicleType && <p className="text-red-500 text-xs mt-1">{driverErrors.vehicleType}</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  رقم اللوحة
                                </label>
                                <input
                                  type="text"
                                  placeholder="رقم اللوحة"
                                  value={driverForm.plateNumber}
                                  onChange={(e) => { setDriverForm({ ...driverForm, plateNumber: e.target.value }); setDriverErrors({ ...driverErrors, plateNumber: '' }) }}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right ${driverErrors.plateNumber ? 'border-red-500' : 'border-slate-200'}`}
                                />
                                {driverErrors.plateNumber && <p className="text-red-500 text-xs mt-1">{driverErrors.plateNumber}</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  موديل المركبة
                                </label>
                                <input
                                  type="text"
                                  placeholder="موديل المركبة"
                                  value={driverForm.vehicleModel}
                                  onChange={(e) => { setDriverForm({ ...driverForm, vehicleModel: e.target.value }); setDriverErrors({ ...driverErrors, vehicleModel: '' }) }}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right ${driverErrors.vehicleModel ? 'border-red-500' : 'border-slate-200'}`}
                                />
                                {driverErrors.vehicleModel && <p className="text-red-500 text-xs mt-1">{driverErrors.vehicleModel}</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  سنة الصنع
                                </label>
                                <input
                                  type="text"
                                  placeholder="سنة الصنع"
                                  value={driverForm.vehicleYear}
                                  onChange={(e) => { setDriverForm({ ...driverForm, vehicleYear: e.target.value }); setDriverErrors({ ...driverErrors, vehicleYear: '' }) }}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right ${driverErrors.vehicleYear ? 'border-red-500' : 'border-slate-200'}`}
                                />
                                {driverErrors.vehicleYear && <p className="text-red-500 text-xs mt-1">{driverErrors.vehicleYear}</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  لون المركبة
                                </label>
                                <input
                                  type="text"
                                  placeholder="لون المركبة"
                                  value={driverForm.vehicleColor}
                                  onChange={(e) => { setDriverForm({ ...driverForm, vehicleColor: e.target.value }); setDriverErrors({ ...driverErrors, vehicleColor: '' }) }}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right ${driverErrors.vehicleColor ? 'border-red-500' : 'border-slate-200'}`}
                                />
                                {driverErrors.vehicleColor && <p className="text-red-500 text-xs mt-1">{driverErrors.vehicleColor}</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  رقم الشاسيه
                                </label>
                                <input
                                  type="text"
                                  placeholder="رقم الشاسيه"
                                  value={driverForm.chassisNumber}
                                  onChange={(e) => { setDriverForm({ ...driverForm, chassisNumber: e.target.value }); setDriverErrors({ ...driverErrors, chassisNumber: '' }) }}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right ${driverErrors.chassisNumber ? 'border-red-500' : 'border-slate-200'}`}
                                />
                                {driverErrors.chassisNumber && <p className="text-red-500 text-xs mt-1">{driverErrors.chassisNumber}</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  رقم رخصة القيادة
                                </label>
                                <input
                                  type="text"
                                  placeholder="رقم رخصة القيادة"
                                  value={driverForm.licenseNumber}
                                  onChange={(e) => { setDriverForm({ ...driverForm, licenseNumber: e.target.value }); setDriverErrors({ ...driverErrors, licenseNumber: '' }) }}
                                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-right ${driverErrors.licenseNumber ? 'border-red-500' : 'border-slate-200'}`}
                                />
                                {driverErrors.licenseNumber && <p className="text-red-500 text-xs mt-1">{driverErrors.licenseNumber}</p>}
                              </div>
                              <div className="flex gap-3 mt-6">
                                <button
                                  onClick={() => setDriverStep(1)}
                                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition-colors"
                                >
                                  → السابق
                                </button>
                                <button
                                  onClick={() => setDriverStep(3)}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition-colors"
                                >
                                  التالي ←
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Step 3 */}
                        {driverStep === 3 && (
                          <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-6">
                            <h2 className="text-base font-black text-slate-900 mb-2">
                              المستندات المطلوبة
                            </h2>
                            <p className="text-slate-500 text-sm mb-4">
                              سيتم طلب المستندات لاحقاً بعد مراجعة طلبك
                            </p>
                            <div className="flex gap-3 mt-6">
                              <button
                                onClick={() => setDriverStep(2)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition-colors"
                              >
                                → السابق
                              </button>
                              <button
                                onClick={() => setDriverStep(4)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition-colors"
                              >
                                التالي ←
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Step 4 */}
                        {driverStep === 4 && (
                          <div className="bg-white">
                            <h2 className="text-base font-black text-slate-900 mb-2">
                              الإقرار والتأكيد
                            </h2>
                            <p className="text-slate-500 text-sm mb-4">
                              يرجى قراءة الشروط والسياسات قبل الموافقة
                            </p>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                              <p className="text-amber-800 text-xs leading-relaxed mb-2">
                                <strong>تنبيه هام:</strong>
                              </p>
                              <p className="text-amber-700 text-sm leading-relaxed">
                                يُقرّ المندوب بأن التسجيل الإلكتروني هو تسجيل مبدئي فقط،
                                ولا يتم تفعيل الحساب أو السماح له بتقديم خدمات التوصيل
                                إلا بعد استكمال جميع الإجراءات التالية:
                              </p>
                              <ul className="text-amber-700 text-sm leading-relaxed mt-2 space-y-1 list-disc list-inside">
                                <li className="flex gap-2">
                                  <span className="font-bold">١.</span>
                                  <span>تقديم المستندات المطلوبة (الهوية، رخصة القيادة، رخصة المركبة)</span>
                                </li>
                                <li className="flex gap-2">
                                  <span className="font-bold">٢.</span>
                                  <span>مراجعة الإدارة للبيانات والمستندات</span>
                                </li>
                                <li className="flex gap-2">
                                  <span className="font-bold">٣.</span>
                                  <span>لا يعتبر المندوب معتمدًا أو مخوّلًا بتقديم خدمات
                                    التوصيل إلا بعد إشعاره رسميًا عبر التطبيق بتفعيل
                                    حسابه.</span>
                                </li>
                              </ul>
                            </div>
                            <div className="flex items-start gap-3 mb-4">
                              <input
                                type="checkbox"
                                id="driver-terms"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-1 w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500"
                              />
                              <label htmlFor="driver-terms" className="text-sm text-slate-600">
                                أقر بأنني قرأت وفهمت الشروط والسياسات المذكورة أعلاه،
                                وأوافق على الالتزام بها.
                              </label>
                            </div>
                            <div className="flex gap-3 mb-3">
                              <button
                                onClick={() => setDriverStep(3)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition-colors"
                              >
                                → السابق
                              </button>
                              <button
                                onClick={handleDriverRegister}
                                disabled={isLoading('driver-register') || !agreedToTerms}
                                title={!agreedToTerms ? 'يجب الموافقة على الشروط والسياسات أولاً' : undefined}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition-colors disabled:opacity-50"
                              >
                                {isLoading('driver-register') ? 'جاري الإرسال...' : 'إرسال الطلب'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sidebar info */}
                      <div className="hidden lg:block lg:col-span-1">
                        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 sticky top-24">
                          <h3 className="font-black text-green-800 mb-3">خطوات التسجيل</h3>
                          <div className="space-y-2 text-sm">
                            <div className={`flex items-center gap-2 ${driverStep >= 1 ? 'text-green-700' : 'text-slate-400'}`}>
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${driverStep >= 1 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</span>
                              <span>البيانات الشخصية</span>
                            </div>
                            <div className={`flex items-center gap-2 ${driverStep >= 2 ? 'text-green-700' : 'text-slate-400'}`}>
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${driverStep >= 2 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</span>
                              <span>بيانات المركبة</span>
                            </div>
                            <div className={`flex items-center gap-2 ${driverStep >= 3 ? 'text-green-700' : 'text-slate-400'}`}>
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${driverStep >= 3 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3</span>
                              <span>المستندات</span>
                            </div>
                            <div className={`flex items-center gap-2 ${driverStep >= 4 ? 'text-green-700' : 'text-slate-400'}`}>
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${driverStep >= 4 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}`}>4</span>
                              <span>التأكيد</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Active order notification - simplified since full tracking is now on separate page */}
                {currentOrder && ['accepted', 'picked_up'].includes(currentOrder.status) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📦</span>
                      <div>
                        <div className="font-black text-blue-800">لديك طلب جارٍ</div>
                        <div className="text-sm text-blue-700">
                          الطلب #{currentOrder._id?.slice(-6)} - {currentOrder.status === 'accepted' ? 'في الطريق للاستلام' : 'جارٍ التوصيل'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveView('driver-tracking')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
                    >
                      تتبع الطلب
                    </button>
                  </div>
                )}

                {driverProfileLoading ? (
                  <div className="max-w-4xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-xs p-10 text-center">
                    <div className="w-10 h-10 border-4 border-green-100 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-semibold">جاري تحميل بيانات حسابك...</p>
                  </div>
                ) : driverProfile ? (
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
                    <div className="bg-white border border-slate-100 rounded-lg shadow-xs p-4 mb-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <h2 className="text-lg font-black text-slate-900">
                            أهلًا {driverProfile.name} 👋
                          </h2>
                          <p className="text-sm text-slate-500 mt-1">
                            {isDriverAvailable
                              ? 'أنت متاح الآن، بانتظار وصول طلب جديد...'
                              : 'أنت غير متاح، فعّل حالتك لبدء استقبال الطلبات'}
                          </p>
                        </div>
                        <button
                          onClick={handleToggleAvailability}
                          disabled={!driverProfile.isApproved || driverProfile.isSuspended}
                          className={`p-2 rounded-2xl text-xs transition-colors disabled:opacity-40 ${isDriverAvailable
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                            }`}
                        >
                          {isDriverAvailable ? '🟢 متاح' : '⚪ غير متاح'}
                        </button>
                      </div>
                    </div>

                    {/* Low balance warning */}
                    {(lowBalanceWarning || (driverProfile.balance ?? 0) < 50) && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-4 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">⚠️</span>
                          <div>
                            <div className="font-black text-red-800">رصيدك غير كافٍ</div>
                            <div className="text-sm text-red-700">
                              {lowBalanceWarning || 'يرجى شحن الرصيد لمواصلة استقبال الطلبات.'}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowRechargePopup(true)}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-sm whitespace-nowrap"
                        >
                          طلب شحن رصيد
                        </button>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                      <div className="bg-green-500/10 border border-slate-100 rounded-lg p-1 text-center">
                        <div className="text-base font-black text-green-700">{driverProfile.totalDeliveries || 0}</div>
                        <div className="text-xs text-slate-500 mt-1">توصيلات مكتملة</div>
                      </div>
                      <div className="bg-green-500/10 border border-slate-100 rounded-lg p-1 text-center">
                        <div className="text-base font-black text-green-700">{(driverProfile.balance || 0).toFixed(0)}</div>
                        <div className="text-xs text-slate-500 mt-1">رصيدك (جنيه)</div>
                      </div>
                      <div className="bg-green-500/10 border border-slate-100 rounded-lg p-1 text-center">
                        <div className="text-base font-black text-green-700">{(driverProfile.totalEarnings || 0).toFixed(0)}</div>
                        <div className="text-xs text-slate-500 mt-1">إجمالي الأرباح</div>
                      </div>
                      <div className="bg-green-500/10 border border-slate-100 rounded-lg p-1 text-center">
                        <div className="text-base font-black text-green-700">{(driverProfile.rating || 0).toFixed(1)} ⭐</div>
                        <div className="text-xs text-slate-500 mt-1">التقييم</div>
                      </div>
                    </div>

                    {/* Recharge button */}
                    <button
                      onClick={() => setShowRechargePopup(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors mb-6 shadow-sm"
                    >
                      💰 شحن الرصيد
                    </button>

                    {/* Waiting state (no active order) */}
                    {!(currentOrder && ['accepted', 'picked_up'].includes(currentOrder.status)) && driverProfile.isApproved && (
                      <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-5 text-center">
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
                              className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-green-100"
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
                  <div className="grid lg:grid-cols-3 gap-2 mb-6">
                    <div className="lg:col-span-2">
                      {/* Step 1 */}
                      {driverStep === 1 && (
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-4">
                          <h2 className="text-base font-black text-slate-900 mb-4">
                            البيانات الشخصية
                          </h2>
                          <div className="grid sm:grid-cols-2 gap-4">
                            {[
                              {
                                label: "الاسم الكامل",
                                ph: "ابراهيم النعيم بليله",
                                type: "text",
                                key: "name"
                              },
                              { label: "رقم الهاتف", ph: "09XXXXXXXX", type: "tel", key: "phone" },
                              {
                                label: "البريد الإلكتروني",
                                ph: "xxxx@email.com",
                                type: "email",
                                key: "email"
                              },
                              {
                                label: "رقم الهوية الوطنية",
                                ph: "XXXXXXX",
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
                                  required
                                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-right"
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
                                required
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-right"
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
                            className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition-colors"
                          >
                            التالي ←
                          </button>
                        </div>
                      )}

                      {/* Step 2 */}
                      {driverStep === 2 && (
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-6">
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
                                  required
                                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-right"
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
                                { label: "رقم الشاسيه", ph: "XXXXXXXXXXXXX", key: "chassisNumber" },
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
                                    required
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-right"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-3 mt-6">
                            <button
                              onClick={() => setDriverStep(1)}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition-colors"
                            >
                              → السابق
                            </button>
                            <button
                              onClick={() => setDriverStep(3)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition-colors"
                            >
                              التالي ←
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Step 3 */}
                      {driverStep === 3 && (
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-6">
                          <h2 className="text-base font-black text-slate-900 mb-2">
                            المستندات المطلوبة
                          </h2>
                          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            لا حاجة لرفع أي ملفات من هنا. سيقوم فريقنا بإضافة صور مستنداتك
                            إلى حسابك من خلال لوحة تحكم الإدارة بعد مطابقتها في مقر الشركة
                            أو أحد مراكزها المعتمدة، وفق المستندات التالية:
                          </p>
                          <div className="space-y-3">
                            {[
                              { label: "صورة الهوية الوطنية (وجهين)" },
                              { label: "استمارة تسجيل المركبة" },
                              { label: "صورة شخصية واضحة" },
                              { label: "شهادة فحص المركبة" },
                            ].map((doc) => (
                              <div
                                key={doc.label}
                                className="flex items-center gap-3 border border-slate-200 rounded-xl p-4"
                              >
                                <span className="text-green-600">📄</span>
                                <div className="font-semibold text-slate-700 text-sm">
                                  {doc.label}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-3 mt-6">
                            <button
                              onClick={() => setDriverStep(2)}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition-colors"
                            >
                              → السابق
                            </button>
                            <button
                              onClick={() => setDriverStep(4)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition-colors"
                            >
                              التالي ←
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Step 4 */}
                      {driverStep === 4 && (
                        <div className="bg-white">
                          <h2 className="text-base font-black text-slate-900 mb-2">
                            الإقرار والتأكيد
                          </h2>
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">

                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-amber-500 text-xl">⚠️</span>
                                <p className="font-bold text-amber-800 text-sm">
                                  شرط استكمال التسجيل
                                </p>
                              </div>
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
                          <label className="flex items-start gap-3 cursor-pointer mb-6">
                            <input
                              id="driver-agreement"
                              name="driver-agreement"
                              type="checkbox"
                              checked={agreedToTerms}
                              onChange={(e) => setAgreedToTerms(e.target.checked)}
                              required
                              className="mt-1 w-5 h-5 accent-green-600 cursor-pointer"
                            />
                            <span className="text-sm text-slate-700 leading-relaxed">
                              أقرّ بأنني قرأت وفهمت شروط استكمال التسجيل وأوافق عليها
                              كاملةً
                            </span>
                          </label>
                          <div className="flex gap-3 mb-3">
                            <button
                              onClick={() => setDriverStep(3)}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition-colors"
                            >
                              → السابق
                            </button>
                            <button
                              onClick={handleDriverRegister}
                              disabled={isLoading('driver-register') || !agreedToTerms}
                              title={!agreedToTerms ? 'يجب الموافقة على الشروط والسياسات أولاً' : undefined}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition-colors disabled:opacity-50"
                            >
                              {isLoading('driver-register') ? 'جاري الإرسال...' : 'إرسال الطلب ✓'}
                            </button>
                          </div>
                          {message && (
                            <div className={`text-sm ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                              {message}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      }

      {/* ─── OTP VERIFICATION PAGE ─── */}
      {
        activeView === "otp" && (
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
              <div className="lg:col-span-2 px-4">
                <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-4">
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
                        required
                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-center text-2xl tracking-widest"
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
                      disabled={isLoading('verify-otp')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {isLoading('verify-otp') ? 'جاري التحقق...' : 'تحقق من الرمز'}
                    </button>
                    <button
                      onClick={handleResendOTP}
                      disabled={isLoading('resend-otp')}
                      className="w-full bg-yellow-400 hover:bg-yellow-300 text-green-800 font-bold py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {isLoading('resend-otp') ? 'جاري الإرسال...' : 'إعادة إرسال الرمز'}
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
        )
      }

      {/* ─── DRIVER: REGISTRATION SUBMITTED, AWAITING APPROVAL ─── */}
      {
        activeView === "driver-pending" && (
          <div className="top-spacing max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-8 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h1 className="text-lg font-black text-slate-900 mb-2">
                تم التسجيل بنجاح
              </h1>
              <p className="text-slate-600 leading-relaxed mb-2">
                شكرًا لانضمامك إلى شبكة مندوبي وصل. تم استلام طلب تسجيلك وبياناتك بنجاح.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 my-5 flex items-start gap-3 text-right">
                <span className="text-2xl">⏳</span>
                <p className="text-sm text-yellow-800 leading-relaxed">
                  حسابك الآن قيد المراجعة من قبل الإدارة. يرجى الانتظار حتى تتم الموافقة
                  على طلبك وتفعيل حسابك، وسيتم إعلامك فور اعتماد التسجيل. لن تتمكن من
                  استقبال طلبات التوصيل قبل ذلك.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setActiveView('driver')}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors"
                >
                  الذهاب إلى حسابي
                </button>
                <button
                  onClick={() => setActiveView('landing')}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-6 py-2.5 rounded-xl transition-colors"
                >
                  العودة للرئيسية
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ─── DRIVER: ORDER TRACKING PAGE ─── */}
      {
        activeView === "driver-tracking" && currentOrder && (
          <div className="top-spacing max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
            <div className="mb-6">
              <button
                onClick={() => setActiveView('driver')}
                className="flex items-center gap-2 text-slate-600 hover:text-green-600 transition-colors mb-4"
              >
                <span>→</span>
                <span className="font-semibold">العودة لتطبيق المندوب</span>
              </button>
              <h1 className="text-lg font-black text-slate-900">
                تتبع الطلب #{currentOrder._id?.slice(-6)}
              </h1>
            </div>

            {currentOrder && ['accepted', 'picked_up'].includes(currentOrder.status) && (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-4 mb-6">
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
                      activeLeg={currentOrder.status === 'accepted' ? 'to_pickup' : 'to_delivery'}
                      height="350px"
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
                      disabled={isLoading(`driver-status-${currentOrder?._id}`)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl transition-colors disabled:opacity-50 sm:col-span-2"
                    >
                      {isLoading(`driver-status-${currentOrder?._id}`) ? '...' : 'تم استلام الطرد'}
                    </button>
                  )}
                  {currentOrder.status === 'picked_up' && (
                    <button
                      onClick={() => handleUpdateDriverOrderStatus('delivered')}
                      disabled={isLoading(`driver-status-${currentOrder?._id}`)}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition-colors disabled:opacity-50 sm:col-span-2"
                    >
                      {isLoading(`driver-status-${currentOrder?._id}`) ? '...' : 'تم تسليم الطلب'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {message && (
              <div className={`bg-slate-50 border rounded-xl p-4 mb-4 ${message.includes('فشل') ? 'border-red-200' : 'border-green-200'}`}>
                <div className={`text-sm font-semibold ${message.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                  {message}
                </div>
              </div>
            )}
          </div>
        )
      }

      {/* ─── MOBILE BOTTOM NAV ─── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-green-500/40 border-t border-green-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] h-12">
        <div className={`grid h-12 ${token ? 'grid-cols-6' : 'grid-cols-4'}`}>
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
            ...(token && user?.role === 'driver' ? [
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
            ...(token && user?.role !== 'driver' ? [
              {
                id: "my-orders" as View,
                label: "طلباتي",
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="currentColor"
                  >
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                ),
              },
            ] : []),
            ...(token ? [{
              id: "chat" as View,
              label: "الدردشة",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="currentColor"
                >
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
              ),
            }] : []),
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
            ...(token ? [{
              id: "notifications" as View,
              label: "الإشعارات",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="currentColor"
                >
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
                </svg>
              ),
              isNotification: true,
            }] : []),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center justify-center relative transition-colors ${activeView === item.id ? "text-green-600" : "text-yellow-600"
                }`}
            >
              {activeView === item.id && (
                <span className="absolute top-0 inset-x-4 h-0.5 bg-green-500 rounded-full" />
              )}
              {"isNotification" in item && item.isNotification ? (
                <NotificationBellMobile active={activeView === item.id} />
              ) : (
                item.icon
              )}
              <span className="text-[10px] font-semibold leading-none">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Spacer so content clears the bottom nav on mobile */}
      <div className="md:hidden h-12" />

      {/* Recharge Popup */}
      {showRechargePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-yellow-600">شحن الرصيد</h2>
                <button
                  onClick={() => setShowRechargePopup(false)}
                  className="text-yellow-600 hover:text-yellow-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-slate-500 mb-2">
                رصيدك الحالي: <span className="font-bold text-lg text-yellow-600">{(driverProfile?.balance || 0).toFixed(2)} جنيه</span>
              </p>

              {/* Bank transfer recharge form */}
              {!rechargeSuccess ? (
                <div className="space-y-4">
                  <div className="bg-green-500/5 rounded-xl p-4">
                    <h3 className="font-black text-yellow-600 mb-2 text-sm">شحن عبر التحويل البنكي <span className="text-red-500 text-lg font-bold">(بنكك)</span></h3>
                    <p className="text-xs text-gray-500 mb-3">
                      أرسل المبلغ عبر تطبيق بنكك، ثم أدخل آخر 6 أرقام من عملية التحويل وقيمة المبلغ المرسل بالجنيه السوداني.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">آخر 6 أرقام من عملية التحويل</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={rechargeForm.transactionLast6}
                          onChange={(e) => {
                            setRechargeForm({ ...rechargeForm, transactionLast6: e.target.value.replace(/\D/g, '').slice(0, 6) })
                            if (rechargeErrors.transactionLast6) {
                              setRechargeErrors({ ...rechargeErrors, transactionLast6: '' })
                            }
                          }}
                          placeholder="مثال: 482913"
                          className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${rechargeErrors.transactionLast6
                            ? 'border-red-500 focus:ring-red-400'
                            : 'border-slate-200 focus:ring-green-400'
                            }`}
                        />
                        {rechargeErrors.transactionLast6 && (
                          <p className="text-red-500 text-xs mt-1">{rechargeErrors.transactionLast6}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">قيمة المبلغ المرسل (جنيه سوداني)</label>
                        <input
                          type="number"
                          min={1}
                          value={rechargeForm.amountSent}
                          onChange={(e) => {
                            setRechargeForm({ ...rechargeForm, amountSent: e.target.value })
                            if (rechargeErrors.amountSent) {
                              setRechargeErrors({ ...rechargeErrors, amountSent: '' })
                            }
                          }}
                          placeholder="0.00"
                          className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${rechargeErrors.amountSent
                            ? 'border-red-500 focus:ring-red-400'
                            : 'border-slate-200 focus:ring-green-400'
                            }`}
                        />
                        {rechargeErrors.amountSent && (
                          <p className="text-red-500 text-xs mt-1">{rechargeErrors.amountSent}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSubmitRecharge}
                    disabled={submittingRecharge}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold py-2.5 rounded-xl transition-colors"
                  >
                    {submittingRecharge ? 'جاري الإرسال...' : 'إرسال طلب الشحن'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">
                    {rechargeSuccessMessage.includes('فشل') ? 'فشل طلب الشحن' : 'تم طلب الشحن'}
                  </h3>
                  <p className={`text-sm mb-6 ${rechargeSuccessMessage.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}>
                    {rechargeSuccessMessage}
                  </p>
                  <button
                    onClick={() => {
                      handleResetRechargeForm()
                      setShowRechargePopup(false)
                    }}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2.5 rounded-xl transition-colors"
                  >
                    إغلاق
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div >
  )
}
