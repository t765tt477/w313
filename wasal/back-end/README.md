# Wasal Back-end API

خلفية منصة وصل - Node.js/Express/MongoDB

## التثبيت

```bash
npm install
```

## التشغيل

```bash
# Development
npm run dev

# Production
npm start
```

## المتغيرات البيئية

أنشئ ملف `.env`:

```
PORT=5000
MONGODB_URI=mongodb+srv://wasal_company_sd_db_connectionss:t9LBZ5c7fegbh7P8wa3co1sa3p@wasalcompanycluster.fcigekr.mongodb.net/?appName=WasalCompanyCluster
JWT_SECRET=wasal_jwt_secret_key_2025
JWT_EXPIRE=7d
OTP_EXPIRE=5
```

## قاعدة البيانات

### الموديلات

#### User
- name, email, phone, password
- role: client, driver, admin
- isVerified, otp

#### Driver
- user (ref: User)
- vehicleType, vehicleNumber, licenseNumber
- isAvailable, currentLocation
- balance, totalEarnings, totalDeliveries
- rating, ratingCount, isApproved

#### Order
- client (ref: User), driver (ref: Driver)
- pickupLocation, deliveryLocation
- packageDetails, distance, price
- platformFee, driverEarnings
- status, paymentMethod, paymentStatus

#### Admin
- user (ref: User)
- permissions

## API Endpoints

### Authentication
- POST `/api/auth/register` - تسجيل مع OTP
- POST `/api/auth/verify-otp` - التحقق من OTP
- POST `/api/auth/login` - تسجيل الدخول
- POST `/api/auth/forgot-password` - استرجاع كلمة المرور
- POST `/api/auth/reset-password` - إعادة تعيين كلمة المرور
- GET `/api/auth/me` - بيانات المستخدم الحالي

### Users
- PUT `/api/users/profile` - تحديث الملف الشخصي
- PUT `/api/users/change-password` - تغيير كلمة المرور

### Drivers
- GET `/api/drivers/profile` - ملف المندوب
- PUT `/api/drivers/location` - تحديث الموقع
- PUT `/api/drivers/availability` - تغيير التوفر
- GET `/api/drivers/available-orders` - الطلبات المتاحة
- POST `/api/drivers/accept-order` - قبول طلب
- PUT `/api/drivers/order-status` - تحديث حالة الطلب
- GET `/api/drivers/orders` - طلبات المندوب

### Orders
- POST `/api/orders` - إنشاء طلب
- GET `/api/orders` - طلبات المستخدم
- GET `/api/orders/:id` - تفاصيل طلب
- PUT `/api/orders/:id/cancel` - إلغاء طلب
- POST `/api/orders/:id/rate` - تقييم طلب

### Admin
- GET `/api/admin/analytics` - الإحصائيات
- GET `/api/admin/drivers` - قائمة المندوبين
- POST `/api/admin/drivers/credit` - إضافة رصيد
- GET `/api/admin/drivers/:id` - تفاصيل مندوب
- PUT `/api/admin/drivers/:id/approve` - اعتماد مندوب
- GET `/api/admin/orders` - قائمة الطلبات
