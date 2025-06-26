'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';

interface Room {
  id: number;
  houseId: number;
  name: string;
  notes: string | null;
  createdAt: string;
  stats: {
    itemCount: number;
    totalValue: number;
  };
}

interface House {
  id: number;
  name: string | null;
  address1: string;
  city: string;
  state: string;
}

interface RoomFormData {
  name: string;
  notes: string;
}

export default function RoomsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const houseId = params.id as string;

  const [house, setHouse] = useState<House | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<RoomFormData>({
    name: '',
    notes: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (session?.user?.email && houseId) {
      fetchHouseAndRooms();
    }
  }, [session, houseId]);

  const fetchHouseAndRooms = async () => {
    try {
      setLoading(true);
      
      // Fetch house details
      const houseResponse = await fetch(`/api/houses/${houseId}?userEmail=${encodeURIComponent(session?.user?.email || '')}`);
      if (houseResponse.ok) {
        const houseData = await houseResponse.json();
        setHouse(houseData.house); // Extract the house object from the response
      } else {
        console.error('Failed to fetch house:', houseResponse.status);
        setErrors({ submit: 'Failed to load house details' });
      }

      // Fetch rooms for this house
      const roomsResponse = await fetch(`/api/rooms?userEmail=${encodeURIComponent(session?.user?.email || '')}&houseId=${houseId}`);
      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json();
        setRooms(roomsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Room name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      let response;
      
      if (editingRoom) {
        // Update existing room
        response = await fetch(`/api/rooms/${editingRoom.id}?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        // Create new room
        response = await fetch(`/api/rooms?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            houseId: parseInt(houseId)
          })
        });
      }

      if (response.ok) {
        setSuccessMessage(editingRoom ? 'Room updated successfully!' : 'Room created successfully!');
        setShowForm(false);
        setEditingRoom(null);
        setFormData({ name: '', notes: '' });
        await fetchHouseAndRooms();
        
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

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      notes: room.notes || ''
    });
    setShowForm(true);
    setErrors({});
  };

  const handleDelete = async (room: Room) => {
    if (!confirm(`Are you sure you want to delete "${room.name}"?`)) return;

    try {
      const response = await fetch(`/api/rooms/${room.id}?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccessMessage('Room deleted successfully!');
        await fetchHouseAndRooms();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.error || 'Failed to delete room' });
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      setErrors({ submit: 'An error occurred' });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRoom(null);
    setFormData({ name: '', notes: '' });
    setErrors({});
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-main">
          <div className="loading">Loading rooms...</div>
        </div>
      </div>
    );
  }

  const houseDisplayName = house?.name || 
    (house?.address1 && house?.city && house?.state 
      ? `${house.address1}, ${house.city}, ${house.state}` 
      : 'Loading...');

  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        <Breadcrumb items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Houses', href: '/dashboard/houses' },
          { label: houseDisplayName || 'House' }
        ]} />

        <div className="rooms-header">
          <div>
            <h1 className="page-title">Rooms</h1>
            <p className="page-subtitle">{houseDisplayName}</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            Add New Room
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
                <h2>{editingRoom ? 'Edit Room' : 'Add New Room'}</h2>
                <button className="btn-close" onClick={handleCancel}>×</button>
              </div>
              
              <form onSubmit={handleSubmit} className="room-form">
                <div className="form-group">
                  <label htmlFor="name">Room Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={errors.name ? 'error' : ''}
                    placeholder="e.g., Living Room, Kitchen, Master Bedroom"
                  />
                  {errors.name && <div className="error-message">{errors.name}</div>}
                </div>

                <div className="form-group">
                  <label htmlFor="notes">Notes (Optional)</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Any additional notes about this room"
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outlined" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingRoom ? 'Update Room' : 'Create Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {rooms.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏠</div>
            <h3>No rooms yet</h3>
            <p>Add your first room to start organizing your home contents.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Add First Room
            </button>
          </div>
        ) : (
          <div className="rooms-grid">
            {rooms.map((room) => (
              <div key={room.id} className="room-card">
                <div className="room-card-header">
                  <h3 className="room-name">{room.name}</h3>
                  <div className="room-actions">
                    <button 
                      className="btn btn-sm btn-outlined"
                      onClick={() => handleEdit(room)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(room)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="room-content">
                  {room.notes && (
                    <p className="room-notes">{room.notes}</p>
                  )}
                  
                  <div className="room-stats">
                    <div className="stat">
                      <span className="stat-value">{room.stats.itemCount}</span>
                      <span className="stat-label">Items</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">${room.stats.totalValue.toLocaleString()}</span>
                      <span className="stat-label">Total Value</span>
                    </div>
                  </div>
                </div>
                
                <div className="room-card-footer">
                  <span className="room-date">
                    Created {new Date(room.createdAt).toLocaleDateString()}
                  </span>
                  <Link href={`/dashboard/houses/${houseId}/rooms/${room.id}/items`} className="btn btn-sm btn-primary">
                    View Items →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 