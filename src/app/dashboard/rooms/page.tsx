'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';

interface House {
  id: number;
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  stats: {
    roomCount: number;
    itemCount: number;
    totalValue: number;
  };
}

export default function RoomsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login');
      return;
    }

    fetchHouses();
  }, [session, status, router]);

  const fetchHouses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/houses?userEmail=${encodeURIComponent(session?.user?.email || '')}`);
      if (!response.ok) {
        throw new Error('Failed to fetch houses');
      }
      const data = await response.json();
      
      // Extract houses array from response and ensure it's an array
      const housesData = data.houses || [];
      const validHousesData = Array.isArray(housesData) ? housesData : [];
      setHouses(validHousesData);

      // If only one house, redirect directly to its rooms
      if (validHousesData.length === 1) {
        setRedirecting(true);
        router.push(`/dashboard/houses/${validHousesData[0].id}/rooms`);
        return;
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching houses:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Room Management', href: '/dashboard/rooms' }
  ];

  if (status === 'loading' || loading || redirecting) {
    return (
      <div className="dashboard-container">
        <Breadcrumb items={breadcrumbItems} />
        <div className="houses-header">
          <h1 className="houses-title">
            {redirecting ? 'Redirecting...' : 'Loading...'}
          </h1>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <Breadcrumb items={breadcrumbItems} />
        <div className="houses-header">
          <h1 className="houses-title">Room Management</h1>
        </div>
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={fetchHouses} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!Array.isArray(houses) || houses.length === 0) {
    return (
      <div className="dashboard-container">
        <Breadcrumb items={breadcrumbItems} />
        <div className="houses-header">
          <h1 className="houses-title">Room Management</h1>
        </div>
        <div className="empty-state">
          <svg className="empty-icon" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
          </svg>
          <h2>No Houses Found</h2>
          <p>You need to add a house before you can manage rooms.</p>
          <Link href="/dashboard/houses" className="btn btn-primary">
            Add Your First House
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Breadcrumb items={breadcrumbItems} />
      
      <div className="houses-header">
        <h1 className="houses-title">Select House to Manage Rooms</h1>
        <p className="houses-subtitle">Choose which house's rooms you'd like to manage</p>
      </div>

      <div className="houses-grid">
        {houses.map((house) => {
          const displayName = house.name || `${house.address1}, ${house.city}`;
          const fullAddress = [
            house.address1,
            house.address2,
            `${house.city}, ${house.state} ${house.zipCode}`
          ].filter(Boolean).join(', ');

          return (
            <div key={house.id} className="house-card">
              <div className="house-header">
                <h3 className="house-name">{displayName}</h3>
                <p className="house-address">{fullAddress}</p>
              </div>

              <div className="house-stats">
                <div className="stat">
                  <span className="stat-number">{house.stats.roomCount}</span>
                  <span className="stat-label">Rooms</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{house.stats.itemCount}</span>
                  <span className="stat-label">Items</span>
                </div>
                <div className="stat">
                  <span className="stat-number">${house.stats.totalValue.toLocaleString()}</span>
                  <span className="stat-label">Total Value</span>
                </div>
              </div>

              <div className="house-footer">
                <Link href={`/dashboard/houses/${house.id}/rooms`} className="btn btn-primary">
                  Manage Rooms →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 