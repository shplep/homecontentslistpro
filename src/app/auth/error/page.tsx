'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'EmailSignin':
        return 'Unable to send email. Please check your email address.';
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
      case 'EmailCreateAccount':
      case 'Callback':
        return 'There was a problem with the authentication service. Please try again.';
      case 'OAuthAccountNotLinked':
        return 'This account is already linked with a different provider.';
      case 'SessionRequired':
        return 'You must be signed in to access this page.';
      case 'AccessDenied':
        return 'Access denied. You do not have permission to access this resource.';
      default:
        return 'An unexpected authentication error occurred. Please try again.';
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Authentication Error</h1>
          <p className="auth-subtitle">We encountered a problem signing you in</p>
        </div>

        <div className="error-message">
          <strong>Error Details</strong>
          <p>{getErrorMessage(error)}</p>
          {error && (
            <p className="text-sm text-gray-600 mt-2">
              Error code: {error}
            </p>
          )}
        </div>

        <div className="auth-form">
          <Link href="/auth/login" className="btn btn-primary btn-full">
            Try Again
          </Link>
          
          <div className="auth-links">
            <p>
              Need help?{' '}
              <Link href="/auth/forgot-password" className="auth-link">
                Reset your password
              </Link>
            </p>
            <p>
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="auth-link">
                Create one here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Loading...</h1>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthErrorContent />
    </Suspense>
  );
} 