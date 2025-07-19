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
  brand: string | null;
  model: string | null;
  price: number | null;
  quantity: number;
  purchaseDate: string | null;
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
  brand: string;
  model: string;
  price: string;
  quantity: string;
  ageInput: string;
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
    brand: '',
    model: '',
    price: '',
    quantity: '1',
    ageInput: '',
    status: '',
    condition: '',
    notes: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ageInputMode, setAgeInputMode] = useState<'age' | 'date'>('age');

  useEffect(() => {
    if (session?.user?.email && roomId && houseId) {
      fetchData();
    }
  }, [session, roomId, houseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch house details
      const houseResponse = await fetch(`/app/api/houses/${houseId}?userEmail=${encodeURIComponent(session?.user?.email || '')}`);
      if (houseResponse.ok) {
        const houseData = await houseResponse.json();
        setHouse(houseData.house);
      }

      // Fetch room details from rooms API  
      const roomsResponse = await fetch(`/app/api/rooms?userEmail=${encodeURIComponent(session?.user?.email || '')}&houseId=${houseId}`);
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
      const itemsResponse = await fetch(`/app/api/items?userEmail=${encodeURIComponent(session?.user?.email || '')}&roomId=${roomId}`);
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

  const validateFile = (file: File) => {
    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];
    
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!hasValidType && !hasValidExtension) {
      return 'Please select JPG, PNG, PDF, DOC, or DOCX files only';
    }
    
    if (file.size > 6 * 1024 * 1024) { // 6MB limit
      return 'File size must be less than 6MB';
    }
    
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newErrors: { [key: string]: string } = {};
    const validFiles: File[] = [];

    files.forEach((file, index) => {
      const error = validateFile(file);
      if (error) {
        newErrors[`file_${index}`] = error;
      } else {
        validFiles.push(file);
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
    } else {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      setErrors(prev => {
        const filtered = { ...prev };
        Object.keys(filtered).forEach(key => {
          if (key.startsWith('file_')) delete filtered[key];
        });
        return filtered;
      });
    }

    // Reset the input
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const parseAgeInput = (input: string): Date | null => {
    if (!input.trim()) return null;

    if (ageInputMode === 'date') {
      // Handle date input
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    } else {
      // Handle age input (e.g., "2 years 3 months", "5 years", "6 months")
      // Improved regex to better handle standalone months/years
      const ageRegex = /(?:(\d+)\s*(?:years?|yrs?|y))?(?:\s*(\d+)\s*(?:months?|mos?|m))?/i;
      const match = input.trim().match(ageRegex);
      
      if (!match) {
        // Try alternative patterns for just numbers with units
        const simpleMonthsMatch = input.trim().match(/^(\d+)\s*(?:months?|mos?|m)$/i);
        const simpleYearsMatch = input.trim().match(/^(\d+)\s*(?:years?|yrs?|y)$/i);
        
        if (simpleMonthsMatch) {
          const months = parseInt(simpleMonthsMatch[1]);
          const purchaseDate = new Date();
          purchaseDate.setMonth(purchaseDate.getMonth() - months);
          return purchaseDate;
        } else if (simpleYearsMatch) {
          const years = parseInt(simpleYearsMatch[1]);
          const purchaseDate = new Date();
          purchaseDate.setFullYear(purchaseDate.getFullYear() - years);
          return purchaseDate;
        }
        return null;
      }
      
      const years = parseInt(match[1] || '0');
      const months = parseInt(match[2] || '0');
      
      if (years === 0 && months === 0) return null;
      
      // Calculate purchase date by subtracting age from current date
      const purchaseDate = new Date();
      purchaseDate.setFullYear(purchaseDate.getFullYear() - years);
      purchaseDate.setMonth(purchaseDate.getMonth() - months);
      
      return purchaseDate;
    }
  };

  const formatAgeDisplay = (purchaseDate: string | null): string => {
    if (!purchaseDate) return '';
    
    const purchase = new Date(purchaseDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - purchase.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years === 0) {
      return months === 1 ? '1 month old' : `${months} months old`;
    } else if (months === 0) {
      return years === 1 ? '1 year old' : `${years} years old`;
    } else {
      return `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''} old`;
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
      
      const parsedPurchaseDate = parseAgeInput(formData.ageInput);
      
      const submitData = {
        ...formData,
        roomId: parseInt(roomId),
        price: formData.price ? parseFloat(formData.price) : null,
        quantity: parseInt(formData.quantity) || 1,
        purchaseDate: parsedPurchaseDate ? parsedPurchaseDate.toISOString() : null,
        status: formData.status || null,
        condition: formData.condition || null
      };
      
      if (editingItem) {
        response = await fetch(`/app/api/items/${editingItem.id}?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
      } else {
        response = await fetch(`/app/api/items?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
      }

      if (response.ok) {
        const newItem = await response.json();
        
        // Upload files if any
        if (uploadedFiles.length > 0 && newItem.id) {
          setUploading(true);
          try {
            const uploadFormData = new FormData();
            uploadedFiles.forEach(file => {
              uploadFormData.append('files', file);
            });

            const uploadResponse = await fetch(
              `/app/api/items/${newItem.id}/upload?userEmail=${encodeURIComponent(session?.user?.email || '')}`,
              {
                method: 'POST',
                body: uploadFormData
              }
            );

            if (!uploadResponse.ok) {
              console.error('File upload failed');
              setErrors({ submit: 'Item created but file upload failed. You can add files later by editing the item.' });
            }
          } catch (uploadError) {
            console.error('File upload error:', uploadError);
            setErrors({ submit: 'Item created but file upload failed. You can add files later by editing the item.' });
          } finally {
            setUploading(false);
          }
        }

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
      brand: item.brand || '',
      model: item.model || '',
      price: item.price ? item.price.toFixed(2) : '',
      quantity: item.quantity?.toString() || '1',
      ageInput: item.purchaseDate || '',
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
      const response = await fetch(`/app/api/items/${item.id}?userEmail=${encodeURIComponent(session?.user?.email || '')}`, {
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
      brand: '',
      model: '',
      price: '',
      quantity: '1',
      ageInput: '',
      status: '',
      condition: '',
      notes: ''
    });
    setUploadedFiles([]);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    resetForm();
    setErrors({});
    setUploadedFiles([]);
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
                <div className="form-row">
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
                  
                  <div className="form-group">
                    <label htmlFor="quantity">Quantity *</label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      min="1"
                      max="9999"
                      step="1"
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="form-row">
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

                  <div className="form-group">
                    <label htmlFor="model">Model</label>
                    <input
                      type="text"
                      id="model"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      placeholder="Model number or name"
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

                <div className="form-row">
                  <div className="form-group">
                    <div className="age-input-header">
                      <label htmlFor="ageInput">
                        {ageInputMode === 'age' ? 'Item Age' : 'Purchase Date'}
                      </label>
                      <button
                        type="button"
                        className="btn-toggle-age"
                        onClick={() => {
                          setAgeInputMode(prev => prev === 'age' ? 'date' : 'age');
                          setFormData(prev => ({ ...prev, ageInput: '' }));
                        }}
                        title={`Switch to ${ageInputMode === 'age' ? 'Purchase Date' : 'Item Age'} input`}
                      >
                        📅
                      </button>
                    </div>
                    
                    {ageInputMode === 'age' ? (
                      <input
                        type="text"
                        id="ageInput"
                        name="ageInput"
                        value={formData.ageInput}
                        onChange={handleInputChange}
                        placeholder="e.g., 2 years 3 months, 5 years, 6 months"
                        className="form-input"
                      />
                    ) : (
                      <input
                        type="date"
                        id="ageInput"
                        name="ageInput"
                        value={formData.ageInput}
                        onChange={handleInputChange}
                        className="form-input"
                      />
                    )}
                    
                    <p className="form-help-text">
                      {ageInputMode === 'age' 
                        ? 'Enter how old the item is (e.g., "2 years", "6 months", "1 year 3 months")'
                        : 'Select when you purchased this item'
                      }
                    </p>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="serialNumber">Serial Number (Optional)</label>
                    <input
                      type="text"
                      id="serialNumber"
                      name="serialNumber"
                      value={formData.serialNumber}
                      onChange={handleInputChange}
                      placeholder="e.g., ABC123456789"
                      className="form-input"
                    />
                    <p className="form-help-text">
                      Enter the serial number if available for warranty/insurance purposes
                    </p>
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

                <div className="form-group">
                  <label htmlFor="documentation">Documentation (Optional)</label>
                  <p className="form-help-text">Upload receipts, photos, or documents (JPG, PNG, PDF, DOC - max 6MB each)</p>
                  
                  <div className="file-upload-area">
                    <input
                      type="file"
                      id="documentation"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="file-input"
                    />
                    <label htmlFor="documentation" className="file-upload-label">
                      <div className="upload-icon">📎</div>
                      <div className="upload-text">
                        <strong>Choose files</strong> or drag and drop
                        <p>JPG, PNG, PDF, DOC files up to 6MB each</p>
                      </div>
                    </label>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="uploaded-files">
                      <h4>Selected Files:</h4>
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="file-item">
                          <span className="file-name">
                            {file.type.startsWith('image/') ? '📷' : file.name.endsWith('.pdf') ? '📄' : '📝'} 
                            {file.name}
                          </span>
                          <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="btn-remove-file"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {Object.keys(errors).some(key => key.startsWith('file_')) && (
                    <div className="error-message">
                      {Object.entries(errors)
                        .filter(([key]) => key.startsWith('file_'))
                        .map(([key, error]) => (
                          <div key={key}>{error}</div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outlined" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? 'Uploading...' : editingItem ? 'Update Item' : 'Create Item'}
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
                    {item.model && <p><strong>Model:</strong> {item.model}</p>}
                    <p><strong>Quantity:</strong> {item.quantity}</p>
                    {item.price && <p><strong>Value:</strong> {item.price.toLocaleString('en-US', { 
                      style: 'currency', 
                      currency: 'USD'
                    })}</p>}
                    {item.purchaseDate && <p><strong>Age:</strong> {formatAgeDisplay(item.purchaseDate)}</p>}
                    {item.condition && <p><strong>Condition:</strong> {item.condition.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</p>}
                  </div>

                  {item.notes && (
                    <p className="item-notes">{item.notes}</p>
                  )}
                  
                  {item.images && item.images.length > 0 && (
                    <div className="item-documentation">
                      <p><strong>Documentation:</strong> {item.images.length} file{item.images.length !== 1 ? 's' : ''}</p>
                      <div className="documentation-list">
                        {item.images.map((image) => (
                          <span key={image.id} className="doc-item">
                            {image.filename.endsWith('.pdf') ? '📄' : 
                             image.filename.endsWith('.doc') || image.filename.endsWith('.docx') ? '📝' : '📷'} 
                            {image.filename}
                          </span>
                        ))}
                      </div>
                    </div>
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