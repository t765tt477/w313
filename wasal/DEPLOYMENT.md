# Deployment Guide - Wasal Delivery Service

## GitHub Repository
**Repository:** https://github.com/t765tt477/w313.git

⚠️ **Important:** You need to push the code to GitHub manually. The current git user (ibraN3im) doesn't have permission to push to t765tt477/w313.git.

To push the code:
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/w313.git
git push -u origin main
```

## Backend Deployment (Render)

### Configuration
- **File:** `back-end/render.yaml`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Port:** 10000

### Environment Variables for Render
Add these in your Render dashboard:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wasal
JWT_SECRET=your_super_secret_jwt_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
NODE_ENV=production
PORT=10000
```

## Frontend Deployment (Vercel)

### Configuration
- **File:** `front-end/vercel.json`
- **Build Command:** `npm install && npm run build`
- **Output Directory:** `dist`
- **Framework:** Vite

### Environment Variables for Vercel
Add these in your Vercel project settings:

```env
VITE_API_URL=https://your-backend-url.onrender.com
```

## Dashboard Deployment (Vercel)

### Configuration
- **File:** `dashboard/vercel.json`
- **Build Command:** `npm install && npm run build`
- **Output Directory:** `dist`
- **Framework:** Vite

### Environment Variables for Vercel
Add these in your Vercel project settings:

```env
VITE_API_URL=https://your-backend-url.onrender.com
```

## Deployment Steps

### 1. Push to GitHub
First, ensure you have access to the repository and push the code:
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/w313.git
git push -u origin main
```

### 2. Deploy Backend to Render
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the `back-end` folder as root directory
5. Use the `render.yaml` configuration
6. Add environment variables listed above
7. Deploy

### 3. Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Set root directory to `front-end`
5. Add `VITE_API_URL` environment variable
6. Deploy

### 4. Deploy Dashboard to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Set root directory to `dashboard`
5. Add `VITE_API_URL` environment variable
6. Deploy

## Important Notes

1. **MongoDB URI:** Create a free MongoDB Atlas cluster and get your connection string
2. **Cloudinary:** Create a free Cloudinary account for image uploads
3. **Email Service:** Use Gmail with App Password for email notifications
4. **Twilio:** Create a Twilio account for SMS notifications (optional)
5. **JWT Secret:** Generate a secure random string for JWT token signing
6. **API URLs:** After deploying the backend, update the `VITE_API_URL` in frontend and dashboard with the actual Render URL

## Required Services

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Database
- [Cloudinary](https://cloudinary.com) - Image storage
- [Gmail](https://gmail.com) - Email service (with App Password)
- [Twilio](https://www.twilio.com) - SMS service (optional)
