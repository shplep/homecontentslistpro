import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('Error route hit:', request.url);
  
  // Get the error parameter from the URL
  const { searchParams } = new URL(request.url);
  const error = searchParams.get('error');
  
  console.log('Error parameter:', error);
  
  // Construct the redirect URL to our custom error page
  const baseUrl = new URL(request.url).origin;
  const errorPageUrl = new URL('/app/auth/error', baseUrl);
  
  // Pass along the error parameter if it exists, or default to CredentialsSignin
  const errorType = error || 'CredentialsSignin';
  errorPageUrl.searchParams.set('error', errorType);
  
  console.log('Redirecting to:', errorPageUrl.toString());
  
  // Redirect to our custom error page
  return NextResponse.redirect(errorPageUrl.toString());
}

export async function POST(request: NextRequest) {
  // Handle POST requests the same way
  return GET(request);
} 