import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

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

    const body = await request.json();
    const { mode } = body;

    if (!mode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Mode is required for testing' 
      }, { status: 400 });
    }

    // Get the actual secret key from the database
    const keyName = mode === 'live' ? 'stripeLiveSecretKey' : 'stripeSandboxSecretKey';
    const settingRecord = await prisma.systemSettings.findFirst({
      where: { key: keyName }
    });

    const apiKey = settingRecord?.value || (mode === 'live' ? process.env.STRIPE_LIVE_SECRET_KEY : process.env.STRIPE_SANDBOX_SECRET_KEY);

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: `No ${mode} secret key configured. Please save your Stripe settings first.` 
      }, { status: 400 });
    }

    // Validate API key format
    const expectedPrefix = mode === 'live' ? 'sk_live_' : 'sk_test_';
    if (!apiKey.startsWith(expectedPrefix)) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid API key format. Expected ${mode} secret key starting with ${expectedPrefix}` 
      }, { status: 400 });
    }

    try {
      // Initialize Stripe with the provided API key
      const stripe = new Stripe(apiKey, {
        apiVersion: '2025-06-30.basil',
      });

      // Test the connection by retrieving account information
      const account = await stripe.accounts.retrieve();
      
      // Test by listing a small number of products to verify read access
      const products = await stripe.products.list({ limit: 1 });

      return NextResponse.json({
        success: true,
        message: `Successfully connected to Stripe ${mode} environment`,
        accountInfo: {
          id: account.id,
          country: account.country,
          email: account.email,
          businessName: account.business_profile?.name || account.settings?.dashboard?.display_name || 'N/A',
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        }
      });

    } catch (stripeError: any) {
      console.error('Stripe connection test failed:', stripeError);
      
      let errorMessage = 'Failed to connect to Stripe';
      
      if (stripeError.code) {
        switch (stripeError.code) {
          case 'invalid_api_key':
            errorMessage = 'Invalid API key. Please check your Stripe secret key.';
            break;
          case 'missing':
            errorMessage = 'API key not found. Please verify your Stripe secret key.';
            break;
          case 'account_invalid':
            errorMessage = 'Stripe account is invalid or restricted.';
            break;
          default:
            errorMessage = `Stripe error: ${stripeError.message}`;
        }
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        stripeErrorCode: stripeError.code || 'unknown'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error testing Stripe connection:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error during connection test' 
    }, { status: 500 });
  }
} 