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
      const response = await fetch('/api/auth/forgot-password', {
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
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
            Reset Your Password
          </h2>
          <p className='mt-2 text-center text-sm text-gray-600'>
            Enter your email address and we&apos;ll send you a link to reset your password
          </p>
        </div>

        {message ? (
          <div className='rounded-md bg-green-50 p-4'>
            <div className='flex'>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-green-800'>
                  Email Sent
                </h3>
                <div className='mt-2 text-sm text-green-700'>
                  <p>{message}</p>
                </div>
              </div>
            </div>
            <div className='mt-4 text-center'>
              <Link
                href='/auth/login'
                className='font-medium text-green-600 hover:text-green-500'
              >
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor='email'
                className='block text-sm font-medium text-gray-700'
              >
                Email Address
              </label>
              <input
                id='email'
                name='email'
                type='email'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder='Enter your email address'
              />
              {error && (
                <p className='mt-1 text-sm text-red-600'>{error}</p>
              )}
            </div>

            <div>
              <button
                type='submit'
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>

            <div className='text-center space-y-2'>
              <p className='text-sm text-gray-600'>
                Remember your password?{' '}
                <Link
                  href='/auth/login'
                  className='font-medium text-indigo-600 hover:text-indigo-500'
                >
                  Sign in here
                </Link>
              </p>
              <p className='text-sm text-gray-600'>
                Don&apos;t have an account?{' '}
                <Link
                  href='/auth/register'
                  className='font-medium text-indigo-600 hover:text-indigo-500'
                >
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