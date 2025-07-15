import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    // Verify admin role
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      select: { id: true, role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get email settings from database
    const emailSettings = await (prisma as any).systemSettings.findMany({
      where: {
        key: {
          in: ['emailProvider', 'smtpHost', 'smtpPort', 'smtpUsername', 'smtpPassword', 'fromEmail', 'fromName']
        }
      }
    });

    // Convert to object for easier access
    const settings: { [key: string]: string } = {};
    emailSettings.forEach((setting: any) => {
      settings[setting.key] = setting.value;
    });

    // Get email configuration with fallbacks
    const emailProvider = settings.emailProvider || 'smtp';
    const smtpHost = settings.smtpHost || process.env.SMTP_HOST;
    const smtpPort = parseInt(settings.smtpPort || process.env.SMTP_PORT || '587');
    const smtpUsername = settings.smtpUsername || process.env.SMTP_USER;
    const smtpPassword = settings.smtpPassword || process.env.SMTP_PASS;
    const fromEmail = settings.fromEmail || process.env.SMTP_FROM;
    const fromName = settings.fromName || 'HomeContentsListPro';

    // Validate required settings
    if (!smtpHost || !smtpUsername || !smtpPassword || !fromEmail) {
      return NextResponse.json({
        success: false,
        error: 'Email configuration is incomplete. Please ensure all SMTP settings are configured.'
      }, { status: 400 });
    }

    try {
      // Create transporter based on provider
      let transporter;
      
      if (emailProvider === 'mailgun') {
        // Mailgun SMTP configuration
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUsername,
            pass: smtpPassword,
          },
        });
      } else if (emailProvider === 'sendgrid') {
        // SendGrid SMTP configuration
        transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: smtpPassword, // SendGrid API key
          },
        });
      } else {
        // Generic SMTP configuration
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUsername,
            pass: smtpPassword,
          },
        });
      }

      // Test the connection
      await transporter.verify();

      // Send test email
      const testEmailResult = await transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to: userEmail, // Send to admin user
        subject: 'HomeContentsListPro - Email Configuration Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">Email Configuration Test</h2>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p>🎉 <strong>Success!</strong> Your email configuration is working properly.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <h3 style="margin: 0 0 10px 0; color: #2d5a2d;">Configuration Details:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #2d5a2d;">
                  <li><strong>Provider:</strong> ${emailProvider.toUpperCase()}</li>
                  <li><strong>SMTP Host:</strong> ${smtpHost}</li>
                  <li><strong>SMTP Port:</strong> ${smtpPort}</li>
                  <li><strong>From Email:</strong> ${fromEmail}</li>
                  <li><strong>From Name:</strong> ${fromName}</li>
                </ul>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                This test email was sent at: ${new Date().toLocaleString()}
              </p>
              
              <p style="color: #666; font-size: 14px;">
                Your users will now be able to receive password reset emails and other notifications.
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
          Email Configuration Test
          
          Success! Your email configuration is working properly.
          
          Configuration Details:
          - Provider: ${emailProvider.toUpperCase()}
          - SMTP Host: ${smtpHost}
          - SMTP Port: ${smtpPort}
          - From Email: ${fromEmail}
          - From Name: ${fromName}
          
          This test email was sent at: ${new Date().toLocaleString()}
          
          Your users will now be able to receive password reset emails and other notifications.
          
          © 2024 HomeContentsListPro. All rights reserved.
        `,
      });

      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${userEmail}`,
        details: {
          messageId: testEmailResult.messageId,
          provider: emailProvider,
          host: smtpHost,
          port: smtpPort,
          from: fromEmail,
          sentAt: new Date().toISOString()
        }
      });

    } catch (emailError: any) {
      console.error('Email test failed:', emailError);
      
      let errorMessage = 'Failed to send test email';
      
      if (emailError.code) {
        switch (emailError.code) {
          case 'EAUTH':
            errorMessage = 'Authentication failed. Please check your username and password.';
            break;
          case 'ECONNECTION':
            errorMessage = 'Connection failed. Please check your SMTP host and port.';
            break;
          case 'ETIMEOUT':
            errorMessage = 'Connection timeout. Please check your SMTP settings.';
            break;
          case 'ENOTFOUND':
            errorMessage = 'SMTP host not found. Please check your SMTP host setting.';
            break;
          default:
            errorMessage = `Email error: ${emailError.message}`;
        }
      } else if (emailError.message) {
        errorMessage = emailError.message;
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        details: {
          provider: emailProvider,
          host: smtpHost,
          port: smtpPort,
          errorCode: emailError.code || 'unknown'
        }
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 