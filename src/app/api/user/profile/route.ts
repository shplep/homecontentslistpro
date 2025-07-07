import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

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
    const userEmail = request.nextUrl.searchParams.get('email');
    
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

    // Get insurance information from the user's profile (user-level insurance)
    const userInsurance = await prisma.insuranceInfo.findFirst({
      where: { userId: user.id },
    });

    // Return profile data
    return NextResponse.json({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address1,
      address2,
      city,
      state,
      zipCode,
              insuranceCompany: userInsurance?.company || '',
        insuranceAddress1: userInsurance?.address1 || '',
        insuranceAddress2: userInsurance?.address2 || '',
        insuranceCity: userInsurance?.city || '',
        insuranceState: userInsurance?.state || '',
        insuranceZipCode: userInsurance?.zipCode || '',
        agentName: userInsurance?.agentName || '',
        agentPhone: userInsurance?.phoneNumber || '',
        policyNumber: userInsurance?.policyNumber || '',
        claimNumber: userInsurance?.claimNumber || '',
        maxCoverage: userInsurance?.maxCoverage?.toString() || '',
        insuranceNotes: userInsurance?.notes || '',
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

    // Update user information
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

    // Handle insurance information at user level
    if (profileData.insuranceCompany || profileData.policyNumber || profileData.claimNumber) {
      // Find existing user-level insurance info
      const existingInsurance = await prisma.insuranceInfo.findFirst({
        where: { userId: updatedUser.id },
      });

      const insuranceData = {
        company: profileData.insuranceCompany || '',
        address1: profileData.insuranceAddress1 || '',
        address2: profileData.insuranceAddress2 || null,
        city: profileData.insuranceCity || '',
        state: profileData.insuranceState || '',
        zipCode: profileData.insuranceZipCode || '',
        agentName: profileData.agentName || null,
        phoneNumber: profileData.agentPhone || null,
        policyNumber: profileData.policyNumber || null,
        claimNumber: profileData.claimNumber || null,
        maxCoverage: profileData.maxCoverage ? parseFloat(profileData.maxCoverage.replace(/[^0-9.]/g, '')) : null,
        notes: profileData.insuranceNotes || null,
      };

      if (existingInsurance) {
        // Update existing insurance info
        await prisma.insuranceInfo.update({
          where: { id: existingInsurance.id },
          data: insuranceData,
        });
      } else {
        // Create new insurance info linked to user
        await prisma.insuranceInfo.create({
          data: {
            userId: updatedUser.id,
            ...insuranceData,
          },
        });
      }
    }

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