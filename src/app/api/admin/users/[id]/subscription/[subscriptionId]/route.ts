import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to check if user is admin
async function checkAdminAccess(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    
    if (!userEmail) {
      return { isAdmin: false, error: 'User email required' };
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { role: true }
    });

    return { 
      isAdmin: user?.role === 'ADMIN',
      error: user ? null : 'User not found'
    };
  } catch (error) {
    return { isAdmin: false, error: 'Authentication error' };
  }
}

// DELETE /api/admin/users/[id]/subscription/[subscriptionId] - Cancel a subscription
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; subscriptionId: string } }
) {
  try {
    const { isAdmin, error } = await checkAdminAccess(request);
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 });
    }

    const userId = parseInt(params.id);
    const subscriptionId = parseInt(params.subscriptionId);

    // Verify subscription exists and belongs to the user
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId: userId
      },
      include: {
        plan: {
          select: {
            displayName: true
          }
        }
      }
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Cancel the subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELED',
        cancelAtPeriodEnd: true
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            displayName: true,
            price: true
          }
        }
      }
    });

    return NextResponse.json({ 
      message: 'Subscription canceled successfully',
      subscription: updatedSubscription
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 