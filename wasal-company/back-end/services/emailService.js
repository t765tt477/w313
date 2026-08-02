import nodemailer from 'nodemailer';

// --- Why this file changed ---------------------------------------------
// Locally this worked out of the box because `service: 'gmail'` in nodemailer
// resolves smtp.gmail.com and (on most home/office networks) connects over
// IPv4 straight away. Render's containers commonly prefer/attempt IPv6 first
// for outbound connections; when that IPv6 route to Google's SMTP servers
// doesn't work cleanly, the connection just hangs until it times out. Because
// the old code only wrapped the send in try/catch and returned `false`, the
// user record (and its OTP) still got saved to MongoDB - so it looked like
// "OTP saved to the DB but never emailed", which matches the symptom exactly.
//
// Fixes applied here:
//  1. Use explicit SMTP host/port instead of the 'service: gmail' shorthand,
//     so we can force IPv4 (`family: 4`) and set sane timeouts.
//  2. Read EMAIL_HOST/EMAIL_PORT if provided, otherwise default to Gmail's
//     SMTP endpoint - this also matches the extra EMAIL_HOST/EMAIL_PORT vars
//     already present in this project's .env (which the old code ignored).
//  3. Log the *actual* SMTP error (code/command/response) instead of a
//     generic message, so failures are diagnosable from the Render logs.
//  4. Export verifyEmailTransport() so server.js can check the connection
//     once at boot and log a loud, unmistakable warning if it's broken -
//     instead of only finding out the next time someone registers.

const buildTransportConfig = () => {
  const host = process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('.')
    ? process.env.EMAIL_HOST
    : 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT) || 587;

  return {
    host,
    port,
    secure: port === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    family: 4, // force IPv4 - avoids hangs on hosts with broken IPv6 egress
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000
  };
};

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport(buildTransportConfig());
  }
  return transporter;
};

// Call once at server startup. Logs clearly whether SMTP is actually reachable
// with the current credentials, instead of silently discovering it on the
// first registration attempt in production.
export const verifyEmailTransport = async () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Email is NOT configured: EMAIL_USER / EMAIL_PASSWORD are missing from the environment.');
    return false;
  }
  try {
    await getTransporter().verify();
    console.log('✅ Email transport ready');
    return true;
  } catch (error) {
    console.error('❌ Email transport verification failed:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    console.error('   -> OTPs will still be generated and saved to the database, but no email will be sent until this is fixed.');
    return false;
  }
};

// Send OTP email
export const sendOTPEmail = async (email, otp, name) => {
  try {
    const mailOptions = {
      from: `"واصل" <${process.env.EMAIL_USER}>`,
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
      `
    };

    await getTransporter().sendMail(mailOptions);
    console.log(`✅ OTP sent to ${email}`);
    return true;
  } catch (error) {
    // Log the real SMTP error - this is what actually tells you *why* it
    // failed on Render (auth rejected, connection timed out, etc).
    console.error(`❌ Error sending OTP email to ${email}:`, {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    return false;
  }
};
