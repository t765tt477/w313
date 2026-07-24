# وصل - Wasal Delivery Service

منصة توصيل داخل المدينة - سريع، آمن، موثوق

## 📁 هيكل المشروع

```
wasal/
├── front-end/          # تطبيق العميل والمندوب
├── back-end/           # API الخلفية
└── dashboard/          # لوحة تحكم الإدارة
```

## 🚀 التشغيل

### المتطلبات
- Node.js (v18 أو أحدث)
- MongoDB Atlas
- npm أو pnpm

### 1. إعداد الخلفية (Back-end)

```bash
cd back-end
npm install
npm start
```

الخلفية ستعمل على `http://localhost:5000`

### 2. إعداد لوحة التحكم (Dashboard)

```bash
cd dashboard
npm install
npm run dev
```

لوحة التحكم ستعمل على `http://localhost:3001`

### 3. إعداد التطبيق (Front-end)

```bash
cd front-end
npm install
npm run dev
```

التطبيق سيعمل على `http://localhost:5173`

## 🔐 حساب الأدمن الافتراضي

لإنشاء حساب أدمن، سجل حساب جديد عبر الـ API وغير الـ role إلى 'admin' في قاعدة البيانات مباشرة.

## 📱 المميزات

### التطبيق (Front-end)
- تسجيل مستخدم جديد مع OTP
- تسجيل الدخول
- استرجاع كلمة المرور مع OTP
- إنشاء طلبات التوصيل
- تتبع الطلبات
- تقييم المندوبين

### لوحة التحكم (Dashboard)
- تسجيل دخول الأدمن
- إحصائيات شاملة
- إدارة المندوبين
- إضافة رصيد للمندوبين
- اعتماد المندوبين الجدد
- إدارة الطلبات

### الخلفية (Back-end)
- RESTful API
- MongoDB Atlas
- JWT Authentication
- OTP Verification
- إدارة الأدوار (Client, Driver, Admin)

## 📊 معادلة التسعير

```
سعر التوصيل = (المسافة × 2.00) + (الوزن × 0.50) + (الحجم × 1.00)
عمولة المنصة = 10%
مستحق المندوب = 90%
```

## 🔗 MongoDB Connection

تم إعداد الاتصال بـ MongoDB Atlas في ملف `.env`:

```
MONGODB_URI=mongodb+srv://wasal_company_sd_db_connectionss:t9LBZ5c7fegbh7P8wa3co1sa3p@wasalcompanycluster.fcigekr.mongodb.net/?appName=WasalCompanyCluster
```

## 📝 API Endpoints

### Authentication
- POST `/api/auth/register` - تسجيل مستخدم جديد
- POST `/api/auth/verify-otp` - التحقق من OTP
- POST `/api/auth/login` - تسجيل الدخول
- POST `/api/auth/forgot-password` - طلب استرجاع كلمة المرور
- POST `/api/auth/reset-password` - إعادة تعيين كلمة المرور

### Orders
- POST `/api/orders` - إنشاء طلب جديد
- GET `/api/orders` - الحصول على طلبات المستخدم
- GET `/api/orders/:id` - الحصول على تفاصيل طلب
- PUT `/api/orders/:id/cancel` - إلغاء طلب
- POST `/api/orders/:id/rate` - تقييم طلب

### Drivers
- GET `/api/drivers/profile` - ملف المندوب
- PUT `/api/drivers/location` - تحديث الموقع
- PUT `/api/drivers/availability` - تغيير التوفر
- GET `/api/drivers/available-orders` - الطلبات المتاحة
- POST `/api/drivers/accept-order` - قبول طلب
- PUT `/api/drivers/order-status` - تحديث حالة الطلب

### Admin
- GET `/api/admin/analytics` - الإحصائيات
- GET `/api/admin/drivers` - قائمة المندوبين
- POST `/api/admin/drivers/credit` - إضافة رصيد للمندوب
- PUT `/api/admin/drivers/:id/approve` - اعتماد المندوب
- GET `/api/admin/orders` - قائمة الطلبات

## 🛠️ التكنولوجيا المستخدمة

### Front-end
- React 19
- TypeScript
- TailwindCSS
- Vite
- Axios
- React Router

### Back-end
- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- bcryptjs

### Dashboard
- React 19
- TypeScript
- TailwindCSS
- Vite
- Axios
- React Router

## 📄 الترخيص

© 2025 وصل - جميع الحقوق محفوظة
