import postmark from 'postmark';

// --- Why this file changed ---------------------------------------------
// Render's containers have issues with Gmail SMTP over IPv6. This service
// now uses Postmark API instead, which is more reliable on cloud platforms
// and offers a free tier (200 emails/day) with excellent deliverability.

// Initialize Postmark
let postmarkClient = null;
if (process.env.POSTMARK_API_KEY) {
  postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY);
}

// Verify email configuration at startup
export const verifyEmailTransport = async () => {
  if (!process.env.POSTMARK_API_KEY) {
    console.error('❌ Email is NOT configured: POSTMARK_API_KEY is missing from the environment.');
    console.error('   -> Get a free API key from https://account.postmarkapp.com/ and add it to your environment variables.');
    return false;
  }
  try {
    // Verify the API key by getting server info
    await postmarkClient.getServer();
    console.log('✅ Postmark email service configured');
    return true;
  } catch (error) {
    console.error('❌ Postmark configuration check failed:', error.message);
    return false;
  }
};

// Send OTP email
export const sendOTPEmail = async (email, otp, name) => {
  try {
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || process.env.EMAIL_USER;

    const msg = {
      From: fromEmail,
      To: email,
      Subject: 'رمز تحقق واصل',
      HtmlBody: `
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
      TextBody: `شركة واصل\nمرحباً ${name}\n\nرمز التحقق الخاص بك هو: ${otp}\n\nهذا الرمز صالح لمدة 15 دقيقة فقط.\nإذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.`
    };

    await postmarkClient.sendEmail(msg);
    console.log(`✅ OTP sent to ${email} via Postmark`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending OTP email to ${email} via Postmark:`, {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code
    });
    console.error('   Check that:', {
      '1. API Key is valid': 'https://account.postmarkapp.com/api_keys',
      '2. Sender email is verified': 'https://account.postmarkapp.com/servers',
      '3. API key has "Server" permissions': 'https://account.postmarkapp.com/api_keys'
    });
    return false;
  }
};
