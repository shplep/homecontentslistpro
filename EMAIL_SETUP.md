# Email Setup for Password Recovery

The password recovery system has been implemented and requires email configuration to work properly.

## Environment Variables Required

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL="mysql://username:password@localhost:3306/database_name"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key-change-in-production"

# Email Configuration (for development - using Gmail SMTP as example)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="HomeContentsListPro <noreply@homecontentslistpro.com>"

# App Configuration
APP_URL="http://localhost:3000"
```

## Gmail Setup (for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password in `SMTP_PASS`

## Production Email Setup

For production, consider using:
- **AWS SES** (Amazon Simple Email Service)
- **SendGrid** - Configure with your SendGrid API key
- **Mailgun** - Configure with your Mailgun SMTP credentials
- **Postmark**

Update the SMTP configuration accordingly.

## Features Implemented

✅ **Forgot Password Page** (`/auth/forgot-password`)
- Email input form
- Security-focused (doesn't reveal if email exists)
- Success/error handling

✅ **Reset Password Page** (`/auth/reset-password`)
- Token validation
- Secure password reset form
- Automatic redirect to login

✅ **API Endpoints**
- `POST /api/auth/forgot-password` - Send reset email
- `GET /api/auth/reset-password?token=...` - Validate token
- `POST /api/auth/reset-password` - Reset password

✅ **Database Changes**
- Added `passwordResetToken` field to User model
- Added `passwordResetExpiresAt` field to User model
- Tokens expire after 1 hour for security

✅ **Email Service**
- Professional HTML email template
- Security best practices
- Error handling and logging

✅ **Admin Email Testing**
- Send Test Email functionality in admin settings
- Support for multiple email providers (SMTP, Mailgun, SendGrid)
- Comprehensive error handling and feedback

## Security Features

- **Secure Token Generation**: Using crypto.randomBytes(32)
- **Token Expiration**: 1-hour expiry for reset tokens
- **No Email Enumeration**: Same response regardless of email existence
- **Password Strength**: Minimum 8 characters required
- **Token Cleanup**: Tokens cleared after successful reset

## Testing the Functionality

1. Set up environment variables
2. Start the development server: `npm run dev`
3. Navigate to `http://localhost:3000/auth/forgot-password`
4. Enter a valid user email
5. Check your email for the reset link
6. Follow the link to reset your password

## Admin Email Testing

1. Go to Admin Settings → Email tab
2. Configure your email provider settings
3. Click "Send Test Email" to verify configuration
4. Check your email for the test message

## Troubleshooting

### Email Not Sending
- Check SMTP credentials
- Verify Gmail app password setup
- Check console logs for error messages
- Use the admin email test functionality

### Database Errors
- Ensure database connection is working
- Run `npx prisma db push` to apply schema changes
- Verify User model has new password reset fields

### Token Issues
- Tokens expire after 1 hour
- Each token can only be used once
- Check that APP_URL matches your domain 