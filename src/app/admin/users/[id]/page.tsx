'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';

interface User {
  id: number;
  email: string;
  name: string | null;
  role: string;
  phone: string | null;
  address: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  hasUsedTrial: boolean;
  requiresUpgrade: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    houses: number;
    subscriptions: number;
  };
  houses?: {
    id: number;
    name: string;
    createdAt: string;
    _count: {
      rooms: number;
    };
  }[];
  subscriptions?: {
    id: number;
    status: string;
    stripeSubscriptionId: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
    createdAt: string;
    updatedAt: string;
    plan: {
      id: number;
      name: string;
      displayName: string;
      price: number;
    };
  }[];
}

interface SubscriptionPlan {
  id: number;
  name: string;
  displayName: string;
  price: number;
  isActive: boolean;
}

export default function AdminUserDetailPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/app/api/admin/users/${userId}?userEmail=${encodeURIComponent(session?.user?.email || '')}&includeSubscriptions=true&includeHouses=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch(`/app/api/admin/subscription-plans?userEmail=${encodeURIComponent(session?.user?.email || '')}`);
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/app/api/admin/users/${user.id}?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update role');
      }

      await fetchUser();
    } catch (err) {
      console.error('Error updating role:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleAssignPlan = async (planId: number) => {
    if (!user) return;

    try {
      setModalLoading(true);
      const response = await fetch(`/app/api/admin/users/${user.id}/subscription?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign plan');
      }

      setShowSubscriptionModal(false);
      await fetchUser();
    } catch (err) {
      console.error('Error assigning plan:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setModalLoading(false);
    }
  };

  const handleGrantTrial = async (days: number) => {
    if (!user) return;

    try {
      setModalLoading(true);
      const response = await fetch(`/app/api/admin/users/${user.id}/trial?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant trial');
      }

      setShowTrialModal(false);
      await fetchUser();
    } catch (err) {
      console.error('Error granting trial:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: number) => {
    if (!user) return;

    if (!confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    try {
      const response = await fetch(`/app/api/admin/users/${user.id}/subscription/${subscriptionId}?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      await fetchUser();
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      fetchUser();
      fetchPlans();
    }
  }, [session?.user?.email, userId]);

  if (status === 'loading' || loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== 'ADMIN') {
    return null;
  }

  if (!user) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">User Not Found</h1>
        </div>
        <main className="dashboard-main">
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <p>The requested user could not be found.</p>
            <Link href="/admin/users" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              ← Back to Users
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const activeSubscriptions = user.subscriptions?.filter(sub => sub.status === 'ACTIVE' || sub.status === 'TRIAL') || [];
  const subscriptionHistory = user.subscriptions?.filter(sub => sub.status !== 'ACTIVE' && sub.status !== 'TRIAL') || [];

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Admin', href: '/admin' },
    { label: 'Users', href: '/admin/users' },
    { label: user.name || user.email, href: `/admin/users/${user.id}` }
  ];

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <Breadcrumb items={breadcrumbs} />
          <h1 className="dashboard-title">User Details</h1>
          <div style={{ 
            display: 'inline-block', 
            backgroundColor: '#dc3545', 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: '4px', 
            fontSize: '12px', 
            fontWeight: 'bold', 
            marginLeft: '12px' 
          }}>
            ADMIN MODE
          </div>
        </div>
        <div className="user-info">
          <Link href="/admin/users" className="btn btn-outlined">
            ← Back to Users
          </Link>
        </div>
      </header>

      <main className="dashboard-main">
        {error && (
          <div style={{
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {/* User Information Card */}
        <section style={{ marginBottom: '2rem' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {user.name || 'No name provided'}
                </h2>
                <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '1.1rem' }}>
                  {user.email}
                </p>
                {user.phone && (
                  <p style={{ margin: '0 0 0.5rem 0', color: '#666' }}>
                    📞 {user.phone}
                  </p>
                )}
                {user.address && (
                  <p style={{ margin: '0', color: '#666' }}>
                    📍 {user.address}
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Role:</label>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: user.role === 'ADMIN' ? '#dc3545' : '#007bff',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  <div>Joined: {formatDate(user.createdAt)}</div>
                  <div>Last Updated: {formatDate(user.updatedAt)}</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '1rem',
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid #eee'
            }}>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>
                  {user._count.houses}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Houses</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
                  {user._count.subscriptions}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Subscriptions</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: user.hasUsedTrial ? '#ffc107' : '#6c757d' }}>
                  {user.hasUsedTrial ? 'Yes' : 'No'}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Used Trial</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: activeSubscriptions.length > 0 ? '#28a745' : '#dc3545' }}>
                  {activeSubscriptions.length}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Active Plans</div>
              </div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowSubscriptionModal(true)}
              className="btn btn-primary"
            >
              Assign Subscription Plan
            </button>
            <button
              onClick={() => setShowTrialModal(true)}
              className="btn btn-outlined"
            >
              Grant Trial
            </button>
          </div>
        </section>

        {/* Active Subscriptions */}
        {activeSubscriptions.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.3rem', fontWeight: 'bold' }}>Active Subscriptions</h3>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              {activeSubscriptions.map((subscription) => (
                <div key={subscription.id} style={{
                  padding: '1.5rem',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <span style={{ 
                        backgroundColor: subscription.status === 'ACTIVE' ? '#28a745' : '#17a2b8',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {subscription.plan.displayName}
                      </span>
                      <span style={{ 
                        backgroundColor: subscription.status === 'ACTIVE' ? '#28a745' : '#17a2b8',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}>
                        {subscription.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      {subscription.status === 'TRIAL' ? (
                        <>
                          <div>Trial expires: {subscription.trialEndsAt ? formatDate(subscription.trialEndsAt) : 'N/A'}</div>
                          <div>Days remaining: {subscription.trialEndsAt ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 'N/A'}</div>
                        </>
                      ) : (
                        <>
                          <div>Period: {subscription.currentPeriodStart ? formatDate(subscription.currentPeriodStart) : 'N/A'} - {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A'}</div>
                          <div>Price: {formatCurrency(subscription.plan.price)}/year</div>
                        </>
                      )}
                      <div>Created: {formatDate(subscription.createdAt)}</div>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => handleCancelSubscription(subscription.id)}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Houses */}
        {user.houses && user.houses.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.3rem', fontWeight: 'bold' }}>Houses ({user.houses.length})</h3>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              {user.houses.map((house) => (
                <div key={house.id} style={{
                  padding: '1rem',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {house.name}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      {house._count.rooms} rooms • Created {formatDate(house.createdAt)}
                    </div>
                  </div>
                  <Link 
                    href={`/dashboard/houses/${house.id}`}
                    className="btn btn-outlined"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Subscription History */}
        {subscriptionHistory.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.3rem', fontWeight: 'bold' }}>Subscription History</h3>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              {subscriptionHistory.map((subscription) => (
                <div key={subscription.id} style={{
                  padding: '1rem',
                  borderBottom: '1px solid #eee',
                  opacity: 0.7
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold' }}>
                      {subscription.plan.displayName}
                    </span>
                    <span style={{ 
                      backgroundColor: '#6c757d',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}>
                      {subscription.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    <div>Period: {subscription.currentPeriodStart ? formatDate(subscription.currentPeriodStart) : 'N/A'} - {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A'}</div>
                    <div>Last Updated: {formatDate(subscription.updatedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trial Information */}
        {user.trialStartedAt && (
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.3rem', fontWeight: 'bold' }}>Trial Information</h3>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Trial Started</div>
                  <div style={{ color: '#666' }}>{formatDate(user.trialStartedAt)}</div>
                </div>
                {user.trialEndsAt && (
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Trial Ends</div>
                    <div style={{ color: '#666' }}>{formatDate(user.trialEndsAt)}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Has Used Trial</div>
                  <div style={{ color: user.hasUsedTrial ? '#28a745' : '#6c757d' }}>
                    {user.hasUsedTrial ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Subscription Assignment Modal */}
        {showSubscriptionModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <h3 style={{ marginBottom: '1rem' }}>Assign Subscription Plan</h3>
              <p style={{ marginBottom: '1.5rem', color: '#666' }}>
                Select a plan to assign to {user.name || user.email}:
              </p>
              <div style={{ marginBottom: '1.5rem' }}>
                {plans.filter(plan => plan.isActive).map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => handleAssignPlan(plan.id)}
                    disabled={modalLoading}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '1rem',
                      marginBottom: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: modalLoading ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!modalLoading) {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.borderColor = '#007bff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {plan.displayName}
                    </div>
                    <div style={{ color: '#666', fontSize: '0.9rem' }}>
                      {formatCurrency(plan.price)}/year
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  disabled={modalLoading}
                  className="btn btn-outlined"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trial Grant Modal */}
        {showTrialModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '400px',
              width: '90%'
            }}>
              <h3 style={{ marginBottom: '1rem' }}>Grant Trial Access</h3>
              <p style={{ marginBottom: '1.5rem', color: '#666' }}>
                {user.hasUsedTrial 
                  ? `Extend trial for ${user.name || user.email}:`
                  : `Grant trial access to ${user.name || user.email}:`
                }
              </p>
              <div style={{ marginBottom: '1.5rem' }}>
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => handleGrantTrial(days)}
                    disabled={modalLoading}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '1rem',
                      marginBottom: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: modalLoading ? 'not-allowed' : 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{days} Days</div>
                    <div style={{ color: '#666', fontSize: '0.9rem' }}>
                      {days === 7 && 'Short trial period'}
                      {days === 14 && 'Standard trial period'}
                      {days === 30 && 'Extended trial period'}
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowTrialModal(false)}
                  disabled={modalLoading}
                  className="btn btn-outlined"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 