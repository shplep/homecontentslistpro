import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
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

    // Get all settings from the database
    const settingsData = await prisma.systemSettings.findMany();
    
    // Convert settings array to object for easier access
    const dbSettings: { [key: string]: string } = {};
    settingsData.forEach((setting: any) => {
      dbSettings[setting.key] = setting.value;
    });

    // Default settings with database overrides and environment fallbacks
    const settings = {
      // Email Configuration
      emailProvider: dbSettings.emailProvider || process.env.EMAIL_PROVIDER || 'smtp',
      smtpHost: dbSettings.smtpHost || process.env.SMTP_HOST || '',
      smtpPort: dbSettings.smtpPort || process.env.SMTP_PORT || '587',
      smtpUsername: dbSettings.smtpUsername || process.env.SMTP_USERNAME || '',
      smtpPassword: dbSettings.smtpPassword || process.env.SMTP_PASSWORD || '',
      fromEmail: dbSettings.fromEmail || process.env.FROM_EMAIL || '',
      fromName: dbSettings.fromName || process.env.FROM_NAME || 'HomeContentsListPro',
      
      // Security Settings
      requireEmailVerification: dbSettings.requireEmailVerification === 'true' || true,
      passwordMinLength: parseInt(dbSettings.passwordMinLength) || 8,
      requireSpecialCharacters: dbSettings.requireSpecialCharacters === 'true' || true,
      sessionTimeout: parseInt(dbSettings.sessionTimeout) || 30,
      maxLoginAttempts: parseInt(dbSettings.maxLoginAttempts) || 5,
      
      // Backup Settings
      autoBackupEnabled: dbSettings.autoBackupEnabled === 'true' || true,
      backupFrequency: dbSettings.backupFrequency || 'daily',
      backupRetentionDays: parseInt(dbSettings.backupRetentionDays) || 30,
      
      // General Settings
      siteName: dbSettings.siteName || 'HomeContentsListPro',
      supportEmail: dbSettings.supportEmail || process.env.SUPPORT_EMAIL || '',
      defaultTimezone: dbSettings.defaultTimezone || 'America/New_York',
      maintenanceMode: dbSettings.maintenanceMode === 'true' || false,
      registrationEnabled: dbSettings.registrationEnabled !== 'false' || true,
      
      // Stripe Configuration
      stripeMode: dbSettings.stripeMode || process.env.STRIPE_MODE || 'sandbox',
      stripeSandboxPublishableKey: dbSettings.stripeSandboxPublishableKey || process.env.STRIPE_SANDBOX_PUBLISHABLE_KEY || '',
      stripeSandboxSecretKey: dbSettings.stripeSandboxSecretKey || process.env.STRIPE_SANDBOX_SECRET_KEY || '',
      stripeLivePublishableKey: dbSettings.stripeLivePublishableKey || process.env.STRIPE_LIVE_PUBLISHABLE_KEY || '',
      stripeLiveSecretKey: dbSettings.stripeLiveSecretKey || process.env.STRIPE_LIVE_SECRET_KEY || '',
      stripeWebhookSecret: dbSettings.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '',
    };

    // Mask sensitive keys for security
    const safeSettings = {
      ...settings,
      smtpPassword: settings.smtpPassword ? '********' : '',
      stripeSandboxSecretKey: settings.stripeSandboxSecretKey ? settings.stripeSandboxSecretKey.substring(0, 8) + '...' : '',
      stripeLiveSecretKey: settings.stripeLiveSecretKey ? settings.stripeLiveSecretKey.substring(0, 8) + '...' : '',
      stripeWebhookSecret: settings.stripeWebhookSecret ? settings.stripeWebhookSecret.substring(0, 8) + '...' : '',
    };

    return NextResponse.json({ settings: safeSettings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const settings = await request.json();

    // Save settings to database
    const settingKeys = [
      // Email Configuration
      'emailProvider', 'smtpHost', 'smtpPort', 'smtpUsername', 'smtpPassword', 'fromEmail', 'fromName',
      // Security Settings
      'requireEmailVerification', 'passwordMinLength', 'requireSpecialCharacters', 'sessionTimeout', 'maxLoginAttempts',
      // Backup Settings
      'autoBackupEnabled', 'backupFrequency', 'backupRetentionDays',
      // General Settings
      'siteName', 'supportEmail', 'defaultTimezone', 'maintenanceMode', 'registrationEnabled',
      // Stripe Configuration
      'stripeMode', 'stripeSandboxPublishableKey', 'stripeSandboxSecretKey', 
      'stripeLivePublishableKey', 'stripeLiveSecretKey', 'stripeWebhookSecret'
    ];

    // Update settings in database
    for (const key of settingKeys) {
      if (settings.hasOwnProperty(key)) {
        const value = typeof settings[key] === 'boolean' ? settings[key].toString() : settings[key].toString();
        
        await prisma.systemSettings.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Settings saved successfully!' 
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 