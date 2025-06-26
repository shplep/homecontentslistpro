'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';

interface Item {
  id: number;
  roomId: number;
  name: string;
  serialNumber: string | null;
  category: string | null;
  brand: string | null;
  model: string | null;
  price: number | null;
  dateAcquired: string | null;
  status: string | null;
  condition: string | null;
  notes: string | null;
  isImported: boolean;
  createdAt: string;
  images: Array<{
    id: number;
    filename: string;
    path: string;
  }>;
}

interface ItemFormData {
  name: string;
  serialNumber: string;
  category: string;
  brand: string;
  model: string;
  price: string;
  dateAcquired: string;
  status: string;
  condition: string;
  notes: string;
}

interface Room {
  id: number;
  name: string;
  houseId: number;
}

interface House {
  id: number;
  name: string | null;
  address1: string;
  city: string;
  state: string;
}

export default function ItemsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const houseId = params.id as string;
  const roomId = params.roomId as string;

  const [items, setItems] = useState<Item[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [house, setHouse] = useState<House | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<ItemFormData>({
    name: '',
    serialNumber: '',
    category: '',
    brand: '',
    model: '',
    price: '',
    dateAcquired: '',
    status: '',
    condition: '',
    notes: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (session?.user?.email && roomId && houseId) {
      fetchData();
    }
  }, [session, roomId, houseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch house details
      const houseResponse = await fetch(`/api/houses/${houseId}?userEmail=${encodeURIComponent(session?.user?.email || '')}`);
      if (houseResponse.ok) {
        const houseData = await houseResponse.json();
        setHouse(houseData.house);
      }

      // Fetch room details from rooms API  
      const roomsResponse = await fetch(`/api/rooms?userEmail=${encodeURIComponent(session?.user?.email || '')}&houseId=${houseId}`);
      if (roomsResponse.ok) {
        const rooms = await roomsResponse.json();
        const currentRoom = rooms.find((r: any) => r.id.toString() === roomId);
        if (currentRoom) {
          setRoom({
            id: currentRoom.id,
            name: currentRoom.name,
            houseId: currentRoom.houseId
          });
        }
      }

      // Fetch items
      const itemsResponse = await fetch(`/api/items?userEmail=${encodeURIComponent(session?.user?.email || '')}&roomId=${roomId}`);
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        setItems(itemsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      let response;
      
      const submitData = {
        ...formData,
        roomId: parseInt(roomId),
        price: formData.price ? parseFloat(formData.price) : null,
        dateAcquired: formData.dateAcquired || null,
        status: formData.status || null,
        condition: formData.condition || null
      };
      
      if (editingItem) {
        response = await fetch(`/api/items/${editingItem.id}?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
      } else {
        response = await fetch(`/api/items?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
      }

      if (response.ok) {
        setSuccessMessage(editingItem ? 'Item updated successfully!' : 'Item created successfully!');
        setShowForm(false);
        setEditingItem(null);
        resetForm();
        await fetchData();
        
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.error || 'An error occurred' });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'An error occurred' });
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      serialNumber: item.serialNumber || '',
      category: item.category || '',
      brand: item.brand || '',
      model: item.model || '',
      price: item.price?.toString() || '',
      dateAcquired: item.dateAcquired || '',
      status: item.status || '',
      condition: item.condition || '',
      notes: item.notes || ''
    });
    setShowForm(true);
    setErrors({});
  };

  const handleDelete = async (item: Item) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      const response = await fetch(`/api/items/${item.id}?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccessMessage('Item deleted successfully!');
        await fetchData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.error || 'Failed to delete item' });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      setErrors({ submit: 'An error occurred' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      serialNumber: '',
      category: '',
      brand: '',
      model: '',
      price: '',
      dateAcquired: '',
      status: '',
      condition: '',
      notes: ''
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    resetForm();
    setErrors({});
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-main">
          <div className="loading">Loading items...</div>
        </div>
      </div>
    );
  }

  const houseDisplayName = house?.name || 
    (house?.address1 && house?.city && house?.state 
      ? `${house.address1}, ${house.city}, ${house.state}` 
      : 'House');

  const roomDisplayName = room?.name || 'Room';

  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        <Breadcrumb items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Houses', href: '/dashboard/houses' },
          { label: houseDisplayName, href: `/dashboard/houses/${houseId}/rooms` },
          { label: `${roomDisplayName} Items` }
        ]} />

        <div className="rooms-header">
          <div>
            <h1 className="page-title">{roomDisplayName} Items</h1>
            <p className="page-subtitle">{houseDisplayName}</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            Add New Item
          </button>
        </div>

        {successMessage && (
          <div className="alert alert-success">{successMessage}</div>
        )}

        {errors.submit && (
          <div className="alert alert-error">{errors.submit}</div>
        )}

        {showForm && (
          <div className="form-modal">
            <div className="form-modal-content">
              <div className="form-modal-header">
                <h2>{editingItem ? 'Edit Item' : `Add New Item to ${roomDisplayName}`}</h2>
                <button className="btn-close" onClick={handleCancel}>×</button>
              </div>
              
              <form onSubmit={handleSubmit} className="item-form">
                <div className="form-group">
                  <label htmlFor="name">Item Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={errors.name ? 'error' : ''}
                    placeholder="e.g., Samsung 65-inch TV"
                  />
                  {errors.name && <div className="error-message">{errors.name}</div>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="category">Category</label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      <option value="">Select a category</option>
                      <option value="Appliances">Appliances</option>
                      <option value="Art & Decor">Art & Decor</option>
                      <option value="Automotive">Automotive</option>
                      <option value="Books">Books</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Collectibles">Collectibles</option>
                      <option value="Documents">Documents</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Health & Beauty">Health & Beauty</option>
                      <option value="Jewelry">Jewelry</option>
                      <option value="Kitchenware">Kitchenware</option>
                      <option value="Musical Instruments">Musical Instruments</option>
                      <option value="Office Supplies">Office Supplies</option>
                      <option value="Other">Other</option>
                      <option value="Outdoor & Garden">Outdoor & Garden</option>
                      <option value="Sports & Recreation">Sports & Recreation</option>
                      <option value="Tools">Tools</option>
                      <option value="Toys & Games">Toys & Games</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="brand">Brand</label>
                    <input
                      type="text"
                      id="brand"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      placeholder="Samsung, Apple, etc."
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="price">Price ($)</label>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="condition">Condition</label>
                    <select
                      id="condition"
                      name="condition"
                      value={formData.condition}
                      onChange={handleInputChange}
                    >
                      <option value="">Select condition</option>
                      <option value="NEW">New</option>
                      <option value="ABOVE_AVERAGE">Above Average</option>
                      <option value="AVERAGE">Average</option>
                      <option value="BELOW_AVERAGE">Below Average</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="notes">Notes (Optional)</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Any additional notes about this item"
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outlined" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingItem ? 'Update Item' : 'Create Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No items in {roomDisplayName} yet</h3>
            <p>Add your first item to start building your {roomDisplayName.toLowerCase()} inventory.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Add First Item
            </button>
          </div>
        ) : (
          <div className="items-grid">
            {items.map((item) => (
              <div key={item.id} className="item-card">
                <div className="item-card-header">
                  <h3 className="item-name">{item.name}</h3>
                  <div className="item-actions">
                    <button 
                      className="btn btn-sm btn-outlined"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(item)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="item-content">
                  <div className="item-details">
                    {item.brand && <p><strong>Brand:</strong> {item.brand}</p>}
                    {item.category && <p><strong>Category:</strong> {item.category}</p>}
                    {item.price && <p><strong>Value:</strong> ${item.price.toLocaleString()}</p>}
                    {item.condition && <p><strong>Condition:</strong> {item.condition.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</p>}
                  </div>

                  {item.notes && (
                    <p className="item-notes">{item.notes}</p>
                  )}
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