import { BrevoClient } from '@getbrevo/brevo';

// --- Why this file changed ---------------------------------------------
// Switched from Resend to Brevo because:
// - Brevo allows Gmail sender addresses with Single Sender Verification
// - Brevo offers 300 free emails/day (vs Resend requiring custom domain)
// - Brevo has excellent deliverability and modern SDK
// - Brevo (formerly Sendinblue) is mature and reliable

// Initialize Brevo
let brevoClient = null;
if (process.env.BREVO_API_KEY) {
  brevoClient = new BrevoClient({
    apiKey: process.env.BREVO_API_KEY,
  });
}

// Verify email configuration at startup
export const verifyEmailTransport = async () => {
  if (!process.env.BREVO_API_KEY) {
    console.error('❌ Email is NOT configured: BREVO_API_KEY is missing from the environment.');
    console.error('   -> Get a free API key from https://app.brevo.com/ and add it to your environment variables.');
    return false;
  }
  try {
    // Brevo client is initialized, consider it configured
    console.log('✅ Brevo email service configured');
    return true;
  } catch (error) {
    console.error('❌ Brevo configuration check failed:', error.message);
    return false;
  }
};

// Send OTP email
export const sendOTPEmail = async (email, otp, name) => {
  try {
    const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_USER || 'wasalapp.sd@gmail.com';

    const msg = {
      sender: { email: fromEmail },
      to: [{ email: email }],
      subject: 'رمز تحقق واصل',
      htmlContent: `
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
      textContent: `شركة واصل\nمرحباً ${name}\n\nرمز التحقق الخاص بك هو: ${otp}\n\nهذا الرمز صالح لمدة 15 دقيقة فقط.\nإذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.`
    };

    await brevoClient.transactionalEmails.sendTransacEmail(msg);
    console.log(`✅ OTP sent to ${email} via Brevo`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending OTP email to ${email} via Brevo:`, {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code
    });
    console.error('   Check that:', {
      '1. API Key is valid': 'https://app.brevo.com/api-keys',
      '2. Sender email is verified': 'https://app.brevo.com/campaigns/tps',
      '3. API key has "Transactional" permissions': 'https://app.brevo.com/api-keys'
    });
    return false;
  }
};
