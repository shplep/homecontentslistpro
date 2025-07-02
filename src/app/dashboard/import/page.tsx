'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Breadcrumb from '@/components/Breadcrumb';

interface House {
  id: number;
  name: string | null;
  address1: string;
  city: string;
  state: string;
}

interface ImportPreview {
  houses: any[];
  rooms: any[];
  items: any[];
  errors: string[];
  warnings: string[];
}

interface ImportOptions {
  createMissingHouses: boolean;
  createMissingRooms: boolean;
  updateExisting: boolean;
  skipDuplicates: boolean;
  targetHouseId?: number;
}

export default function ImportPage() {
  const { data: session } = useSession();
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    createMissingHouses: true,
    createMissingRooms: true,
    updateExisting: false,
    skipDuplicates: true
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (session?.user?.email) {
      fetchHouses();
    }
  }, [session]);

  const fetchHouses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/houses?userEmail=${encodeURIComponent(session?.user?.email || '')}`);
      if (response.ok) {
        const data = await response.json();
        setHouses(data.houses || []);
      }
    } catch (error) {
      console.error('Error fetching houses:', error);
      setErrors({ fetch: 'Failed to load houses' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setFile(selectedFile || null);
    setPreview(null);
    setErrors({});
    
    if (selectedFile) {
      validateFile(selectedFile);
    }
  };

  const validateFile = (file: File) => {
    const validTypes = ['text/csv', 'application/json', 'text/plain'];
    const validExtensions = ['.csv', '.json'];
    
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!hasValidType && !hasValidExtension) {
      setErrors({ file: 'Please select a CSV or JSON file' });
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setErrors({ file: 'File size must be less than 10MB' });
      return false;
    }
    
    return true;
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const items = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const item: any = {};
      
      headers.forEach((header, index) => {
        item[header] = values[index] || '';
      });
      
      items.push(item);
    }
    
    return items;
  };

  const handlePreview = async () => {
    if (!file) return;
    
    try {
      setLoading(true);
      const text = await file.text();
      let data: any[] = [];
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        data = parseCSV(text);
      } else if (file.name.toLowerCase().endsWith('.json')) {
        const jsonData = JSON.parse(text);
        data = Array.isArray(jsonData) ? jsonData : [jsonData];
      }
      
      // Process and validate data
      const preview = await processImportData(data);
      setPreview(preview);
      
    } catch (error) {
      console.error('Preview error:', error);
      setErrors({ preview: 'Failed to parse file. Please check the format.' });
    } finally {
      setLoading(false);
    }
  };

  const processImportData = async (data: any[]): Promise<ImportPreview> => {
    const houses: any[] = [];
    const rooms: any[] = [];
    const items: any[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const seenHouses = new Set();
    const seenRooms = new Set();
    
    data.forEach((row, index) => {
      const rowNum = index + 1;
      
      // Validate required fields
      if (!row['Item Name'] && !row.name) {
        errors.push(`Row ${rowNum}: Item name is required`);
        return;
      }
      
      // Extract house data
      const houseKey = `${row['House Name'] || row.houseName || ''}-${row['House Address'] || row.address1 || ''}`;
      if (houseKey !== '-' && !seenHouses.has(houseKey)) {
        houses.push({
          name: row['House Name'] || row.houseName || null,
          address1: row['House Address'] || row.address1 || '',
          city: row['House City'] || row.city || '',
          state: row['House State'] || row.state || ''
        });
        seenHouses.add(houseKey);
      }
      
      // Extract room data
      const roomKey = `${houseKey}-${row['Room Name'] || row.roomName || ''}`;
      if (roomKey !== '--' && !seenRooms.has(roomKey)) {
        rooms.push({
          name: row['Room Name'] || row.roomName || '',
          notes: row['Room Notes'] || row.roomNotes || null,
          houseKey
        });
        seenRooms.add(roomKey);
      }
      
      // Extract item data
      const item = {
        name: row['Item Name'] || row.name || '',
        category: row['Item Category'] || row.category || '',
        brand: row['Item Brand'] || row.brand || '',
        model: row['Item Model'] || row.model || '',
        serialNumber: row['Item Serial Number'] || row.serialNumber || '',
        price: parseFloat(row['Item Price'] || row.price || '0'),
        status: row['Item Status'] || row.status || 'ACTIVE',
        condition: row['Item Condition'] || row.condition || 'GOOD',
        notes: row['Item Notes'] || row.notes || '',
        roomKey,
        houseKey
      };
      
      // Validate item data
      if (item.price < 0) {
        warnings.push(`Row ${rowNum}: Negative price converted to 0`);
        item.price = 0;
      }
      
      items.push(item);
    });
    
    return { houses, rooms, items, errors, warnings };
  };

  const handleImport = async () => {
    if (!preview) return;
    
    try {
      setImporting(true);
      setErrors({});
      
              const response = await fetch('/app/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: session?.user?.email,
          preview,
          options: importOptions
        })
      });
      
      if (!response.ok) {
        throw new Error('Import failed');
      }
      
      const result = await response.json();
      setSuccessMessage(`Import completed! Created ${result.created.houses} houses, ${result.created.rooms} rooms, ${result.created.items} items.`);
      setFile(null);
      setPreview(null);
      await fetchHouses();
      
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (error) {
      console.error('Import error:', error);
      setErrors({ import: 'Import failed. Please try again.' });
    } finally {
      setImporting(false);
    }
  };

  const handleOptionChange = (key: keyof ImportOptions, value: any) => {
    setImportOptions(prev => ({ ...prev, [key]: value }));
  };

  if (loading && !file) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-main">
          <div className="loading">Loading import options...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        <Breadcrumb items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Import Data' }
        ]} />

        <div className="import-header">
          <div>
            <h1 className="page-title">Import Data</h1>
            <p className="page-subtitle">Upload and import your inventory data from CSV or JSON files</p>
          </div>
        </div>

        {successMessage && (
          <div className="alert alert-success">{successMessage}</div>
        )}

        {Object.values(errors).map((error, index) => (
          <div key={index} className="alert alert-error">{error}</div>
        ))}

        <div className="import-steps">
          <div className="step-section">
            <h3 className="section-title">Step 1: Choose File</h3>
            <div className="file-upload-area">
              <input
                type="file"
                id="fileInput"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="file-input"
              />
              <label htmlFor="fileInput" className="file-upload-label">
                <div className="upload-icon">📁</div>
                <div className="upload-text">
                  <strong>Choose a file</strong> or drag and drop
                  <p>CSV or JSON files up to 10MB</p>
                </div>
              </label>
              {file && (
                <div className="file-info">
                  <span className="file-name">📄 {file.name}</span>
                  <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
          </div>

          {file && (
            <div className="step-section">
              <h3 className="section-title">Step 2: Configure Import Options</h3>
              <div className="import-options">
                <div className="option-group">
                  <h4>Data Handling</h4>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={importOptions.createMissingHouses}
                      onChange={(e) => handleOptionChange('createMissingHouses', e.target.checked)}
                    />
                    <span className="checkbox-label">Create missing houses</span>
                  </label>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={importOptions.createMissingRooms}
                      onChange={(e) => handleOptionChange('createMissingRooms', e.target.checked)}
                    />
                    <span className="checkbox-label">Create missing rooms</span>
                  </label>
                </div>

                <div className="option-group">
                  <h4>Conflict Resolution</h4>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={importOptions.updateExisting}
                      onChange={(e) => handleOptionChange('updateExisting', e.target.checked)}
                    />
                    <span className="checkbox-label">Update existing items</span>
                  </label>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={importOptions.skipDuplicates}
                      onChange={(e) => handleOptionChange('skipDuplicates', e.target.checked)}
                    />
                    <span className="checkbox-label">Skip duplicate items</span>
                  </label>
                </div>

                <div className="option-group">
                  <h4>Target House (Optional)</h4>
                  <select
                    value={importOptions.targetHouseId || ''}
                    onChange={(e) => handleOptionChange('targetHouseId', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="filter-select"
                  >
                    <option value="">Import to houses specified in file</option>
                    {houses.map((house) => (
                      <option key={house.id} value={house.id}>
                        {house.name || `${house.address1}, ${house.city}, ${house.state}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                className="btn btn-outlined"
                onClick={handlePreview}
                disabled={!file || loading}
              >
                {loading ? 'Analyzing...' : 'Preview Import'}
              </button>
            </div>
          )}

          {preview && (
            <div className="step-section">
              <h3 className="section-title">Step 3: Review Preview</h3>
              <div className="preview-summary">
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-number">{preview.houses.length}</span>
                    <span className="stat-label">Houses</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{preview.rooms.length}</span>
                    <span className="stat-label">Rooms</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{preview.items.length}</span>
                    <span className="stat-label">Items</span>
                  </div>
                </div>

                {preview.errors.length > 0 && (
                  <div className="preview-errors">
                    <h4>⚠️ Errors ({preview.errors.length})</h4>
                    {preview.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="error-item">{error}</div>
                    ))}
                    {preview.errors.length > 5 && (
                      <div className="error-item">... and {preview.errors.length - 5} more errors</div>
                    )}
                  </div>
                )}

                {preview.warnings.length > 0 && (
                  <div className="preview-warnings">
                    <h4>⚠️ Warnings ({preview.warnings.length})</h4>
                    {preview.warnings.slice(0, 3).map((warning, index) => (
                      <div key={index} className="warning-item">{warning}</div>
                    ))}
                    {preview.warnings.length > 3 && (
                      <div className="warning-item">... and {preview.warnings.length - 3} more warnings</div>
                    )}
                  </div>
                )}

                <div className="import-actions">
                  <button 
                    className={`btn btn-primary ${importing ? 'loading' : ''}`}
                    onClick={handleImport}
                    disabled={importing || preview.errors.length > 0}
                  >
                    {importing ? 'Importing...' : 'Start Import'}
                  </button>
                  {preview.errors.length > 0 && (
                    <p className="error-note">Please fix errors before importing</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="import-help">
          <h3 className="section-title">Import Format Guide</h3>
          <div className="help-grid">
            <div className="help-card">
              <h4>CSV Format</h4>
              <p>Required columns:</p>
              <ul>
                <li>Item Name</li>
                <li>Room Name</li>
                <li>House Name or House Address</li>
              </ul>
              <p>Optional columns: Item Category, Item Brand, Item Model, Item Price, Item Condition, etc.</p>
            </div>
            <div className="help-card">
              <h4>JSON Format</h4>
              <p>Array of objects with properties:</p>
              <ul>
                <li>name (required)</li>
                <li>roomName (required)</li>
                <li>houseName or address1 (required)</li>
              </ul>
              <p>Additional properties: category, brand, model, price, condition, etc.</p>
            </div>
            <div className="help-card">
              <h4>Tips</h4>
              <ul>
                <li>Export your current data first as a reference</li>
                <li>Use consistent naming for houses and rooms</li>
                <li>Preview before importing to catch errors</li>
                <li>Backup your data before large imports</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 