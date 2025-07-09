'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  subscriptions?: {
    id: number;
    status: string;
    stripeSubscriptionId: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
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

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login');
      return;
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchUsers();
    fetchPlans();
  }, [session, status, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/app/api/admin/users?userEmail=${encodeURIComponent(session?.user?.email || '')}&includeSubscriptions=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch(`/app/api/admin/subscription-plans?userEmail=${encodeURIComponent(session?.user?.email || '')}`);
      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }
      const data = await response.json();
      setPlans(data.plans?.filter((plan: any) => plan.isActive) || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const response = await fetch(`/app/api/admin/users/${userId}?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user role');
      }

      await fetchUsers();
    } catch (err) {
      console.error('Error updating user role:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleAssignPlan = async (planId: number) => {
    if (!selectedUser) return;
    
    try {
      setModalLoading(true);
      const response = await fetch(`/app/api/admin/users/${selectedUser.id}/subscription?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign plan');
      }

      await fetchUsers();
      setShowSubscriptionModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error assigning plan:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setModalLoading(false);
    }
  };

  const handleGrantTrial = async (days: number) => {
    if (!selectedUser) return;
    
    try {
      setModalLoading(true);
      const response = await fetch(`/app/api/admin/users/${selectedUser.id}/trial?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant trial');
      }

      await fetchUsers();
      setShowTrialModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error granting trial:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: number, userId: number) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    try {
      const response = await fetch(`/app/api/admin/users/${userId}/subscription/${subscriptionId}?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      await fetchUsers();
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

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

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">User Management</h1>
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
          <Link href="/admin/dashboard" className="btn btn-outlined">
            ← Back to Admin Dashboard
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

        {/* Filters */}
        <section style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  minWidth: '250px'
                }}
              />
            </div>
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="ALL">All Roles</option>
                <option value="USER">Users</option>
                <option value="ADMIN">Admins</option>
              </select>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>
                {filteredUsers.length} of {users.length} users
              </span>
            </div>
          </div>
        </section>

        {/* Users Table */}
        <section>
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8f9fa' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>User</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Role</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Subscription</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Trial Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Usage</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Joined</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '14px' }}>
                          {user.name || 'No name'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {user.email}
                        </div>
                        {user.phone && (
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: user.role === 'ADMIN' ? '#dc3545' : '#007bff',
                          color: 'white'
                        }}
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {user.subscriptions && user.subscriptions.length > 0 ? (
                        <div>
                          {user.subscriptions
                            .filter(sub => sub.status === 'ACTIVE' || sub.status === 'TRIAL')
                            .slice(0, 1) // Show only the most recent active subscription
                            .map((sub) => (
                            <div key={sub.id} style={{ marginBottom: '4px' }}>
                              <div style={{ 
                                backgroundColor: sub.status === 'ACTIVE' ? '#28a745' : 
                                                sub.status === 'TRIAL' ? '#17a2b8' : '#6c757d',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                display: 'inline-block'
                              }}>
                                {sub.status === 'TRIAL' ? (
                                  `${Math.ceil((new Date(sub.currentPeriodEnd!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}-Day Trial`
                                ) : (
                                  sub.plan.displayName
                                )}
                              </div>
                              {sub.currentPeriodEnd && (
                                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                                  {sub.status === 'TRIAL' ? 'Expires:' : 'Renews:'} {formatDate(sub.currentPeriodEnd)}
                                </div>
                              )}
                              {(sub.status === 'ACTIVE' || sub.status === 'TRIAL') && (
                                <button
                                  onClick={() => handleCancelSubscription(sub.id, user.id)}
                                  style={{
                                    marginLeft: '4px',
                                    padding: '2px 6px',
                                    border: 'none',
                                    borderRadius: '3px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    fontSize: '10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    const target = e.target as HTMLButtonElement;
                                    target.style.backgroundColor = '#c82333';
                                    target.style.transform = 'scale(1.05)';
                                  }}
                                  onMouseLeave={(e) => {
                                    const target = e.target as HTMLButtonElement;
                                    target.style.backgroundColor = '#dc3545';
                                    target.style.transform = 'scale(1)';
                                  }}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          ))}
                          {user.subscriptions.filter(sub => sub.status === 'ACTIVE' || sub.status === 'TRIAL').length === 0 && (
                            <span style={{ 
                              backgroundColor: '#6c757d',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}>
                              No Active Plan
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ 
                          backgroundColor: '#6c757d',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          No Plan
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {user.hasUsedTrial ? (
                        <span style={{ 
                          backgroundColor: '#ffc107',
                          color: '#000',
                          padding: '2px 6px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          Trial Used
                        </span>
                      ) : user.trialStartedAt ? (
                        <div>
                          <span style={{ 
                            backgroundColor: '#28a745',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}>
                            In Trial
                          </span>
                          {user.trialEndsAt && (
                            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                              Ends: {formatDate(user.trialEndsAt)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ 
                          backgroundColor: '#6c757d',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          No Trial
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        backgroundColor: '#e9ecef',
                        padding: '2px 6px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {user._count.houses} houses
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                      {formatDate(user.createdAt)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowSubscriptionModal(true);
                          }}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #28a745',
                            borderRadius: '4px',
                            backgroundColor: 'transparent',
                            color: '#28a745',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Assign Plan
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowTrialModal(true);
                          }}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #ffc107',
                            borderRadius: '4px',
                            backgroundColor: 'transparent',
                            color: '#ffc107',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Grant Trial
                        </button>
                        <button
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #007bff',
                            borderRadius: '4px',
                            backgroundColor: 'transparent',
                            color: '#007bff',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: '#666' 
              }}>
                {searchTerm || roleFilter !== 'ALL' 
                  ? 'No users found matching your filters.' 
                  : 'No users found.'
                }
              </div>
            )}
          </div>
        </section>

        {/* Subscription Assignment Modal */}
        {showSubscriptionModal && selectedUser && (
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
              padding: '24px',
              borderRadius: '8px',
              width: '400px',
              maxWidth: '90vw'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
                Assign Plan to {selectedUser.name || selectedUser.email}
              </h3>
              <div style={{ marginBottom: '16px' }}>
                {plans.map((plan) => (
                  <div key={plan.id} style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '12px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                  onClick={() => handleAssignPlan(plan.id)}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#007bff'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#ddd'}
                  >
                    <div style={{ fontWeight: '500' }}>{plan.displayName}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {formatCurrency(plan.price)}/year
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowSubscriptionModal(false);
                    setSelectedUser(null);
                  }}
                  disabled={modalLoading}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trial Grant Modal */}
        {showTrialModal && selectedUser && (
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
              padding: '24px',
              borderRadius: '8px',
              width: '400px',
              maxWidth: '90vw'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
                Grant Trial to {selectedUser.name || selectedUser.email}
              </h3>
              <div style={{ marginBottom: '16px' }}>
                {[7, 14, 30].map((days) => (
                  <div key={days} style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '12px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                  onClick={() => handleGrantTrial(days)}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ffc107'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#ddd'}
                  >
                    <div style={{ fontWeight: '500' }}>{days} Day Trial</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {selectedUser.hasUsedTrial ? 'Extend existing trial' : 'Grant new trial'}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowTrialModal(false);
                    setSelectedUser(null);
                  }}
                  disabled={modalLoading}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    cursor: 'pointer'
                  }}
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