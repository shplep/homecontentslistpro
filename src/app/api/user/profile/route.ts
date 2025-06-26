import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to get user from session cookie
async function getUserFromRequest(request: NextRequest) {
  try {
    // Get the session token from cookies
    const cookies = request.headers.get('cookie');
    if (!cookies) {
      return null;
    }

    // For now, we'll implement a simplified version
    // TODO: Properly decode NextAuth session token
    
    // As a temporary workaround, we'll use a different approach
    // The user email can be passed via Authorization header for API calls
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const email = authHeader.substring(7); // Remove 'Bearer ' prefix
      return { email };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user from request:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // For testing purposes, let's get user email from query params
    const url = new URL(request.url);
    const userEmail = url.searchParams.get('email');
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse address field if it exists
    let address1 = '', address2 = '', city = '', state = '', zipCode = '';
    if (user.address) {
      // Simple parsing - in real implementation, we'd store these separately
      const addressParts = user.address.split(', ');
      if (addressParts.length >= 3) {
        address1 = addressParts[0] || '';
        city = addressParts[addressParts.length - 2] || '';
        const stateZip = addressParts[addressParts.length - 1] || '';
        const stateZipParts = stateZip.split(' ');
        state = stateZipParts[0] || '';
        zipCode = stateZipParts[1] || '';
      }
    }

    // Return profile data (for now, insurance fields are empty until we add them to the database)
    return NextResponse.json({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address1,
      address2,
      city,
      state,
      zipCode,
      insuranceCompany: '',
      insuranceAddress1: '',
      insuranceAddress2: '',
      insuranceCity: '',
      insuranceState: '',
      insuranceZipCode: '',
      agentName: '',
      agentPhone: '',
      policyNumber: '',
      maxCoverage: '',
      insuranceNotes: '',
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profileData = await request.json();
    
    // Basic validation
    if (!profileData.name || !profileData.email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // For now, we can only update the fields that exist in the current User model
    const updatedUser = await prisma.user.update({
      where: { email: profileData.email },
      data: {
        name: profileData.name,
        phone: profileData.phone || null,
        // Combine address fields into a single address string
        address: profileData.address1 ? 
          `${profileData.address1}${profileData.address2 ? ', ' + profileData.address2 : ''}, ${profileData.city}, ${profileData.state} ${profileData.zipCode}`.trim() 
          : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
      },
    });

    // TODO: Once we add the insurance fields to the database schema,
    // we can store the insurance information as well

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 