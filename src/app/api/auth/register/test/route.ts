import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Registration API is accessible',
    timestamp: new Date().toISOString(),
    path: '/api/auth/register',
  });
}

export async function POST() {
  return NextResponse.json({
    message: 'Registration API POST endpoint is accessible',
    timestamp: new Date().toISOString(),
  });
} 