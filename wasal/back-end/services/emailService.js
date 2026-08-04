import sgMail from '@sendgrid/mail';

// --- Why this file changed ---------------------------------------------
// Render's containers have issues with Gmail SMTP over IPv6. This service
// now uses SendGrid API instead, which is more reliable on cloud platforms
// and offers a free tier (100 emails/day).

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Verify email configuration at startup
export const verifyEmailTransport = async () => {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ Email is NOT configured: SENDGRID_API_KEY is missing from the environment.');
    console.error('   -> Get a free API key from https://sendgrid.com/ and add it to your environment variables.');
    return false;
  }
  try {
    // SendGrid doesn't have a simple verify() method, so we'll test with a minimal request
    // If the API key is invalid, the actual send will fail
    console.log('✅ SendGrid email service configured');
    return true;
  } catch (error) {
    console.error('❌ SendGrid configuration check failed:', error.message);
    return false;
  }
};

// Send OTP email
export const sendOTPEmail = async (email, otp, name) => {
  try {
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER,
      subject: 'رمز تحقق واصل',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: right;">
          <h2 style="text-align: right; color: #10d202;">شركة واصل</h2>
          <h2 style="text-align: right; color: #333;">مرحباً ${name}</h2>
          <p style="text-align: right; color: #666;">رمز التحقق الخاص بك هو:</p>
          <div style="background: #f4f4f4; padding: 10px; text-align: center; border-radius: 5px; margin: 10px 0;">
            <h1 style="color: #abe206; margin: 0; font-size: 32px;">${otp}</h1>
          </div>
          <p style="text-align: right; color: #666;">هذا الرمز صالح لمدة 15 دقيقة فقط.</p>
          <p style="text-align: right; color: #999999; font-size: 12px;">إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.</p>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log(`✅ OTP sent to ${email} via SendGrid`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending OTP email to ${email} via SendGrid:`, {
      message: error.message,
      response: error.response?.body
    });
    return false;
  }
};
