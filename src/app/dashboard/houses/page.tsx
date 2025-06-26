'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';

interface House {
  id: number;
  name: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zipCode: string;
  createdAt: string;
  stats: {
    roomCount: number;
    itemCount: number;
    totalValue: number;
  };
}

interface HouseFormData {
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function HousesPage() {
  const { data: session } = useSession();
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [formData, setFormData] = useState<HouseFormData>({
    name: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchHouses = async () => {
    if (!session?.user?.email) return;

    try {
      const response = await fetch(`/api/houses?userEmail=${encodeURIComponent(session.user.email)}`);
      const data = await response.json();

      if (response.ok) {
        setHouses(data.houses);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to fetch houses' });
      }
    } catch (error) {
      console.error('Error fetching houses:', error);
      setMessage({ type: 'error', text: 'Failed to fetch houses' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      fetchHouses();
    }
  }, [session]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.email) return;

    try {
      const url = editingHouse ? `/api/houses/${editingHouse.id}` : '/api/houses';
      const method = editingHouse ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: session.user.email,
          ...formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: editingHouse ? 'House updated successfully!' : 'House created successfully!' 
        });
        setShowForm(false);
        setEditingHouse(null);
        resetForm();
        fetchHouses();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save house' });
      }
    } catch (error) {
      console.error('Error saving house:', error);
      setMessage({ type: 'error', text: 'Failed to save house' });
    }
  };

  const handleEdit = (house: House) => {
    setEditingHouse(house);
    setFormData({
      name: house.name || '',
      address1: house.address1,
      address2: house.address2 || '',
      city: house.city,
      state: house.state,
      zipCode: house.zipCode,
    });
    setShowForm(true);
  };

  const handleDelete = async (house: House) => {
    if (!session?.user?.email) return;

    if (!confirm(`Are you sure you want to delete "${house.name || house.address1}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/houses/${house.id}?userEmail=${encodeURIComponent(session.user.email)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'House deleted successfully!' });
        fetchHouses();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete house' });
      }
    } catch (error) {
      console.error('Error deleting house:', error);
      setMessage({ type: 'error', text: 'Failed to delete house' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zipCode: '',
    });
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingHouse(null);
    resetForm();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-main">
          <div className="loading-spinner">Loading houses...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        <Breadcrumb items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Houses' }
        ]} />

        <div className="houses-header">
          <h1 className="page-title">My Houses</h1>
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            Add New House
          </button>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{editingHouse ? 'Edit House' : 'Add New House'}</h2>
                <button 
                  className="modal-close"
                  onClick={handleFormCancel}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="house-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">
                      House Name (Optional)
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="form-input"
                      placeholder="e.g., Main House, Vacation Home"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="address1" className="form-label">
                      Address Line 1 *
                    </label>
                    <input
                      id="address1"
                      type="text"
                      value={formData.address1}
                      onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                      className="form-input"
                      placeholder="Street address"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="address2" className="form-label">
                      Address Line 2
                    </label>
                    <input
                      id="address2"
                      type="text"
                      value={formData.address2}
                      onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                      className="form-input"
                      placeholder="Apartment, suite, etc."
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city" className="form-label">
                      City *
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="state" className="form-label">
                      State *
                    </label>
                    <input
                      id="state"
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="form-input"
                      placeholder="e.g., CA, NY"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="zipCode" className="form-label">
                      ZIP Code *
                    </label>
                    <input
                      id="zipCode"
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn btn-outlined"
                    onClick={handleFormCancel}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingHouse ? 'Update House' : 'Add House'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="houses-grid">
          {houses.length === 0 ? (
            <div className="empty-state">
              <h3>No houses found</h3>
              <p>Get started by adding your first house.</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                Add Your First House
              </button>
            </div>
          ) : (
            houses.map((house) => (
              <div key={house.id} className="house-card">
                <div className="house-header">
                  <h3 className="house-name">
                    {house.name || house.address1}
                  </h3>
                  <div className="house-actions">
                    <button 
                      className="btn-icon"
                      onClick={() => handleEdit(house)}
                      title="Edit house"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-icon btn-danger"
                      onClick={() => handleDelete(house)}
                      title="Delete house"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="house-address">
                  <p>{house.address1}</p>
                  {house.address2 && <p>{house.address2}</p>}
                  <p>{house.city}, {house.state} {house.zipCode}</p>
                </div>

                <div className="house-stats">
                  <div className="stat-item">
                    <span className="stat-label">Rooms:</span>
                    <span className="stat-value">{house.stats.roomCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Items:</span>
                    <span className="stat-value">{house.stats.itemCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Value:</span>
                    <span className="stat-value">{formatCurrency(house.stats.totalValue)}</span>
                  </div>
                </div>

                <div className="house-footer">
                  <small>Added {new Date(house.createdAt).toLocaleDateString()}</small>
                  <Link 
                    href={`/dashboard/houses/${house.id}/rooms`}
                    className="btn btn-sm btn-primary"
                  >
                    View Rooms →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 