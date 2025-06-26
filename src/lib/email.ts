import nodemailer from 'nodemailer';

// Email service configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'HomeContentsListPro <noreply@localhost>',
      to: email,
      subject: 'Password Reset Request - HomeContentsListPro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>Hello,</p>
            
            <p>We received a request to reset your password for your HomeContentsListPro account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #4f46e5; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;
                        font-weight: bold;">
                Reset Your Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #4f46e5;">${resetUrl}</a>
            </p>
            
            <p style="color: #666; font-size: 14px;">
              This link will expire in 1 hour for security reasons.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px;">
              © 2024 HomeContentsListPro. All rights reserved.
            </p>
          </div>
        </div>
      `,
      text: `
        Password Reset Request
        
        Hello,
        
        We received a request to reset your password for your HomeContentsListPro account.
        
        Please click the following link to reset your password:
        ${resetUrl}
        
        This link will expire in 1 hour for security reasons.
        
        If you didn't request a password reset, you can safely ignore this email.
        
        © 2024 HomeContentsListPro. All rights reserved.
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Test email configuration
export const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return { success: true };
  } catch (error) {
    console.error('Email configuration error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}; 