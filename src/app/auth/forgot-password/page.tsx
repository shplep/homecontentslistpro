'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    // Basic validation
    if (!email) {
      setError('Email is required');
      setIsLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/app/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setEmail(''); // Clear the form
      } else {
        setError(data.error || 'An error occurred');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Reset Your Password</h1>
          <p className="auth-subtitle">
            Enter your email address and we&apos;ll send you a link to reset your password
          </p>
        </div>

        {message ? (
          <div className="success-message">
            <strong>Email Sent</strong>
            <p>{message}</p>
            <div className="auth-links">
              <Link href="/app/auth/login" className="auth-link">
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`form-input ${error ? 'error' : ''}`}
                placeholder="Enter your email address"
              />
              {error && (
                <span className="error-text">{error}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`btn btn-primary btn-full ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="auth-links">
              <p>
                Remember your password?{' '}
                <Link href="/app/auth/login" className="auth-link">
                  Sign in here
                </Link>
              </p>
              <p>
                Don&apos;t have an account?{' '}
                <Link href="/app/auth/register" className="auth-link">
                  Create one here
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 