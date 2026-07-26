import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send OTP email
export const sendOTPEmail = async (email, otp, name) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'رمز تحقق واصل',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10d202;">شركة واصل:</h2>
          <h2 style="color: #333;">مرحباً ${name}</h2>
          <p style="color: #666;">رمز التحقق الخاص بك هو:</p>
          <div style="background: #f4f4f4; padding: 10px; text-align: center; border-radius: 5px; margin: 10px 0;">
            <h1 style="color: #abe206; margin: 0; font-size: 32px;">${otp}</h1>
          </div>
          <p style="color: #666;">هذا الرمز صالح لمدة 15 دقيقة فقط.</p>
          <p style="color: #999999; font-size: 12px;">إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${email}: ${otp}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    console.log(`⚠️ OTP for ${email} (${name}): ${otp}`);
    return false;
  }
};
