'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';

interface Item {
  id: number;
  roomId: number;
  name: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  condition: string | null;
  createdAt: string;
  room: {
    id: number;
    name: string;
    house: {
      id: number;
      name: string | null;
      address1: string;
      city: string;
      state: string;
    };
  };
}

interface House {
  id: number;
  name: string | null;
  address1: string;
  city: string;
  state: string;
}

export default function AllItemsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [houses, setHouses] = useState<House[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login');
      return;
    }

    fetchAllItems();
  }, [session, status, router]);

  const fetchAllItems = async () => {
    try {
      setLoading(true);
      
      // Fetch all houses first
      const housesResponse = await fetch(`/app/api/houses?userEmail=${encodeURIComponent(session?.user?.email || '')}`);
      if (housesResponse.ok) {
        const housesData = await housesResponse.json();
        const validHousesData = Array.isArray(housesData.houses) ? housesData.houses : [];
        setHouses(validHousesData);

        // Collect all items from all houses
        const allItemsPromises = validHousesData.map(async (house: House) => {
          // Get rooms for this house
          const roomsResponse = await fetch(`/app/api/rooms?userEmail=${encodeURIComponent(session?.user?.email || '')}&houseId=${house.id}`);
          if (roomsResponse.ok) {
            const rooms = await roomsResponse.json();
            
            // Get items for each room
            const roomItemsPromises = rooms.map(async (room: any) => {
              const itemsResponse = await fetch(`/app/api/items?userEmail=${encodeURIComponent(session?.user?.email || '')}&roomId=${room.id}`);
              if (itemsResponse.ok) {
                const items = await itemsResponse.json();
                return items.map((item: any) => ({
                  ...item,
                  room: {
                    id: room.id,
                    name: room.name,
                    house: {
                      id: house.id,
                      name: house.name,
                      address1: house.address1,
                      city: house.city,
                      state: house.state
                    }
                  }
                }));
              }
              return [];
            });
            
            const roomItems = await Promise.all(roomItemsPromises);
            return roomItems.flat();
          }
          return [];
        });

        const houseItems = await Promise.all(allItemsPromises);
        const flatItems = houseItems.flat();
        setAllItems(flatItems);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHouseDisplayName = (house: any) => {
    return house.name || `${house.address1}, ${house.city}, ${house.state}`;
  };

  const filteredItems = allItems.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      item.brand?.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term)
    );
  });

  const totalValue = filteredItems.reduce((total, item) => total + (item.price || 0), 0);

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'All Items', href: '/dashboard/items' }
  ];

  if (status === 'loading' || loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-main">
          <Breadcrumb items={breadcrumbItems} />
          <div className="loading">Loading all items...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        <Breadcrumb items={breadcrumbItems} />
        
        <div className="rooms-header">
          <div>
            <h1 className="page-title">All Items</h1>
            <p className="page-subtitle">
              {filteredItems.length} items • ${totalValue.toLocaleString()} total value
            </p>
          </div>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>{allItems.length === 0 ? 'No items found' : 'No items match your search'}</h3>
            <p>
              {allItems.length === 0 
                ? 'Start by adding items to your rooms.'
                : 'Try a different search term.'
              }
            </p>
            {allItems.length === 0 && (
              <Link href="/dashboard/houses" className="btn btn-primary">
                Go to Houses →
              </Link>
            )}
          </div>
        ) : (
          <div className="items-grid">
            {filteredItems.map((item) => (
              <div key={item.id} className="item-card">
                <div className="item-card-header">
                  <h3 className="item-name">{item.name}</h3>
                  <Link 
                    href={`/dashboard/houses/${item.room.house.id}/rooms/${item.room.id}/items`}
                    className="btn btn-sm btn-outlined"
                  >
                    View →
                  </Link>
                </div>
                
                <div className="item-content">
                  <div className="item-location">
                    <p><strong>House:</strong> {getHouseDisplayName(item.room.house)}</p>
                    <p><strong>Room:</strong> {item.room.name}</p>
                  </div>

                  <div className="item-details">
                    {item.brand && <p><strong>Brand:</strong> {item.brand}</p>}
                    {item.category && <p><strong>Category:</strong> {item.category}</p>}
                    {item.price && <p><strong>Value:</strong> ${item.price.toLocaleString()}</p>}
                    {item.condition && <p><strong>Condition:</strong> {item.condition.replace('_', ' ')}</p>}
                  </div>
                </div>
                
                <div className="item-card-footer">
                  <span className="item-date">
                    Added {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 