'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SubscriptionPlan {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  maxHouses: number;
  maxRoomsPerHouse: number | null;
  maxItemsPerRoom: number | null;
  isActive: boolean;
  allowTrial: boolean;
  sortOrder: number;
  subscriberCount: number;
  activeSubscriberCount: number;
}

interface FormData {
  name: string;
  displayName: string;
  description: string;
  price: string;
  stripeProductId: string;
  stripePriceId: string;
  maxHouses: string;
  maxRoomsPerHouse: string;
  maxItemsPerRoom: string;
  isActive: boolean;
  allowTrial: boolean;
  sortOrder: string;
}

export default function SubscriptionPlansPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    displayName: '',
    description: '',
    price: '',
    stripeProductId: '',
    stripePriceId: '',
    maxHouses: '',
    maxRoomsPerHouse: '',
    maxItemsPerRoom: '',
    isActive: true,
    allowTrial: false,
    sortOrder: '0'
  });
  const [formLoading, setFormLoading] = useState(false);

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

    fetchPlans();
  }, [session, status, router]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/app/api/admin/subscription-plans?userEmail=${encodeURIComponent(session?.user?.email || '')}`);
      if (!response.ok) {
        throw new Error('Failed to fetch subscription plans');
      }
      const data = await response.json();
      setPlans(data.plans || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description || undefined,
        price: parseInt(formData.price) || 0,
        stripeProductId: formData.stripeProductId || undefined,
        stripePriceId: formData.stripePriceId || undefined,
        maxHouses: parseInt(formData.maxHouses) || 1,
        maxRoomsPerHouse: formData.maxRoomsPerHouse ? parseInt(formData.maxRoomsPerHouse) : undefined,
        maxItemsPerRoom: formData.maxItemsPerRoom ? parseInt(formData.maxItemsPerRoom) : undefined,
        isActive: formData.isActive,
        allowTrial: formData.allowTrial,
        sortOrder: parseInt(formData.sortOrder) || 0
      };

      const url = editingPlan 
        ? `/app/api/admin/subscription-plans/${editingPlan.id}?userEmail=${encodeURIComponent(session?.user?.email || '')}`
        : `/app/api/admin/subscription-plans?userEmail=${encodeURIComponent(session?.user?.email || '')}`;
      
      const method = editingPlan ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save plan');
      }

      await fetchPlans();
      setShowForm(false);
      setEditingPlan(null);
      resetForm();
    } catch (err) {
      console.error('Error saving plan:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description || '',
      price: plan.price.toString(),
      stripeProductId: plan.stripeProductId || '',
      stripePriceId: plan.stripePriceId || '',
      maxHouses: plan.maxHouses.toString(),
      maxRoomsPerHouse: plan.maxRoomsPerHouse?.toString() || '',
      maxItemsPerRoom: plan.maxItemsPerRoom?.toString() || '',
      isActive: plan.isActive,
      allowTrial: plan.allowTrial,
      sortOrder: plan.sortOrder.toString()
    });
    setShowForm(true);
  };

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!confirm(`Are you sure you want to delete the "${plan.displayName}" plan? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/app/api/admin/subscription-plans/${plan.id}?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete plan');
      }

      await fetchPlans();
    } catch (err) {
      console.error('Error deleting plan:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      price: '',
      stripeProductId: '',
      stripePriceId: '',
      maxHouses: '',
      maxRoomsPerHouse: '',
      maxItemsPerRoom: '',
      isActive: true,
      allowTrial: false,
      sortOrder: '0'
    });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingPlan(null);
    resetForm();
    setError(null);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1 className="dashboard-title">Loading...</h1>
        </header>
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
          <h1 className="dashboard-title">Subscription Plans</h1>
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
            Back to Admin
          </Link>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowForm(true)}
            disabled={showForm}
          >
            Add New Plan
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '24px' }}>
            {error}
            <button 
              onClick={() => setError(null)} 
              style={{ 
                marginLeft: '12px', 
                background: 'none', 
                border: 'none', 
                color: 'inherit', 
                cursor: 'pointer' 
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h2 style={{ margin: 0 }}>
                {editingPlan ? `Edit Plan: ${editingPlan.displayName}` : 'Add New Subscription Plan'}
              </h2>
            </div>
            <div className="card-content">
              <form onSubmit={handleFormSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label htmlFor="name" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Plan Name (Internal) *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="e.g., basic_yearly"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="displayName" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Display Name *
                    </label>
                    <input
                      type="text"
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      required
                      placeholder="e.g., Basic Plan"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="price" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Price (in cents) *
                    </label>
                    <input
                      type="number"
                      id="price"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      required
                      min="0"
                      placeholder="e.g., 24900 for $249.00"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="maxHouses" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Max Houses *
                    </label>
                    <input
                      type="number"
                      id="maxHouses"
                      value={formData.maxHouses}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxHouses: e.target.value }))}
                      required
                      min="1"
                      placeholder="e.g., 1"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="maxRoomsPerHouse" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Max Rooms per House
                    </label>
                    <input
                      type="number"
                      id="maxRoomsPerHouse"
                      value={formData.maxRoomsPerHouse}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxRoomsPerHouse: e.target.value }))}
                      min="1"
                      placeholder="Leave empty for unlimited"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="maxItemsPerRoom" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Max Items per Room
                    </label>
                    <input
                      type="number"
                      id="maxItemsPerRoom"
                      value={formData.maxItemsPerRoom}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxItemsPerRoom: e.target.value }))}
                      min="1"
                      placeholder="Leave empty for unlimited"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="stripeProductId" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Stripe Product ID
                    </label>
                    <input
                      type="text"
                      id="stripeProductId"
                      value={formData.stripeProductId}
                      onChange={(e) => setFormData(prev => ({ ...prev, stripeProductId: e.target.value }))}
                      placeholder="prod_xxx"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="stripePriceId" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Stripe Price ID
                    </label>
                    <input
                      type="text"
                      id="stripePriceId"
                      value={formData.stripePriceId}
                      onChange={(e) => setFormData(prev => ({ ...prev, stripePriceId: e.target.value }))}
                      placeholder="price_xxx"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="sortOrder" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Sort Order
                    </label>
                    <input
                      type="number"
                      id="sortOrder"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: e.target.value }))}
                      placeholder="0"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="description" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    placeholder="Plan description for customers"
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '16px', marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    />
                    Active Plan
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.allowTrial}
                      onChange={(e) => setFormData(prev => ({ ...prev, allowTrial: e.target.checked }))}
                    />
                    Allow Trial
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="submit"
                    className={`btn btn-primary ${formLoading ? 'loading' : ''}`}
                    disabled={formLoading}
                  >
                    {formLoading ? 'Saving...' : (editingPlan ? 'Update Plan' : 'Create Plan')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outlined"
                    onClick={cancelForm}
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Plans List */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0 }}>Subscription Plans ({plans.length})</h2>
          </div>
          <div className="card-content">
            {plans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: '#666' }}>
                <p>No subscription plans found.</p>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowForm(true)}
                  style={{ marginTop: '16px' }}
                >
                  Create Your First Plan
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Plan</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Price</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Limits</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Subscribers</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => (
                      <tr key={plan.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>{plan.displayName}</div>
                            <div style={{ fontSize: '14px', color: '#666' }}>{plan.name}</div>
                            {plan.description && (
                              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                                {plan.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 500 }}>
                            ${(plan.price / 100).toFixed(2)}
                          </div>
                          {plan.stripePriceId && (
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              {plan.stripePriceId}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontSize: '14px' }}>
                            <div>{plan.maxHouses} {plan.maxHouses === 1 ? 'house' : 'houses'}</div>
                            <div>{plan.maxRoomsPerHouse ?? '∞'} rooms/house</div>
                            <div>{plan.maxItemsPerRoom ?? '∞'} items/room</div>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontSize: '14px' }}>
                            <div style={{ fontWeight: 500 }}>{plan.activeSubscriberCount} active</div>
                            <div style={{ color: '#666' }}>{plan.subscriberCount} total</div>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ 
                              fontSize: '12px', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              backgroundColor: plan.isActive ? '#d4edda' : '#f8d7da',
                              color: plan.isActive ? '#155724' : '#721c24',
                              width: 'fit-content'
                            }}>
                              {plan.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {plan.allowTrial && (
                              <span style={{ 
                                fontSize: '12px', 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                backgroundColor: '#d1ecf1',
                                color: '#0c5460',
                                width: 'fit-content'
                              }}>
                                Trial
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-outlined"
                              onClick={() => handleEdit(plan)}
                              style={{ fontSize: '12px', padding: '4px 8px' }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-outlined"
                              onClick={() => handleDelete(plan)}
                              style={{ 
                                fontSize: '12px', 
                                padding: '4px 8px',
                                borderColor: '#dc3545',
                                color: '#dc3545'
                              }}
                              disabled={plan.activeSubscriberCount > 0}
                              title={plan.activeSubscriberCount > 0 ? 'Cannot delete plan with active subscribers' : 'Delete plan'}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 