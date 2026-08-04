import { Resend } from 'resend';

// --- Why this file changed ---------------------------------------------
// Switched from Postmark to Resend because:
// - Resend allows Gmail sender addresses (Postmark doesn't)
// - Resend offers 3,000 free emails/month (vs Postmark's 200/day)
// - Resend has a modern, simple API with excellent deliverability

// Initialize Resend
let resendClient = null;
if (process.env.RESEND_API_KEY) {
  resendClient = new Resend(process.env.RESEND_API_KEY);
}

// Verify email configuration at startup
export const verifyEmailTransport = async () => {
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ Email is NOT configured: RESEND_API_KEY is missing from the environment.');
    console.error('   -> Get a free API key from https://resend.com/api-keys and add it to your environment variables.');
    return false;
  }
  try {
    // Resend client is initialized, consider it configured
    console.log('✅ Resend email service configured');
    return true;
  } catch (error) {
    console.error('❌ Resend configuration check failed:', error.message);
    return false;
  }
};

// Send OTP email
export const sendOTPEmail = async (email, otp, name) => {
  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_USER || 'wasalapp.sd@gmail.com';

    const msg = {
      from: fromEmail,
      to: email,
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
      `,
      text: `شركة واصل\nمرحباً ${name}\n\nرمز التحقق الخاص بك هو: ${otp}\n\nهذا الرمز صالح لمدة 15 دقيقة فقط.\nإذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.`
    };

    await resendClient.emails.send(msg);
    console.log(`✅ OTP sent to ${email} via Resend`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending OTP email to ${email} via Resend:`, {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code
    });
    console.error('   Check that:', {
      '1. API Key is valid': 'https://resend.com/api-keys',
      '2. Sender email is verified': 'https://resend.com/domains',
      '3. Domain is verified in Resend': 'https://resend.com/domains'
    });
    return false;
  }
};
