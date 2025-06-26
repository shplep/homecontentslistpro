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
  stats: {
    roomCount: number;
    itemCount: number;
    totalValue: number;
  };
}

interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  scope: 'all' | 'house' | 'category';
  houseId?: number;
  category?: string;
  includeImages: boolean;
  includeStats: boolean;
}

const CATEGORIES = [
  'Appliances', 'Art & Decor', 'Automotive', 'Books', 'Clothing',
  'Collectibles', 'Documents', 'Electronics', 'Furniture', 'Health & Beauty',
  'Jewelry', 'Kitchenware', 'Musical Instruments', 'Office Supplies',
  'Other', 'Outdoor & Garden', 'Sports & Recreation', 'Tools', 'Toys & Games'
];

export default function ExportPage() {
  const { data: session } = useSession();
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    scope: 'all',
    includeImages: false,
    includeStats: true
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

  const handleExport = async () => {
    try {
      setExporting(true);
      setErrors({});

      const params = new URLSearchParams({
        userEmail: session?.user?.email || '',
        format: exportOptions.format,
        scope: exportOptions.scope,
        includeImages: exportOptions.includeImages.toString(),
        includeStats: exportOptions.includeStats.toString()
      });

      if (exportOptions.scope === 'house' && exportOptions.houseId) {
        params.append('houseId', exportOptions.houseId.toString());
      }

      if (exportOptions.scope === 'category' && exportOptions.category) {
        params.append('category', exportOptions.category);
      }

      const response = await fetch(`/api/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `inventory-export-${Date.now()}.${exportOptions.format}`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMessage('Export completed successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error) {
      console.error('Export error:', error);
      setErrors({ export: 'Export failed. Please try again.' });
    } finally {
      setExporting(false);
    }
  };

  const handleOptionChange = (key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-main">
          <div className="loading">Loading export options...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        <Breadcrumb items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export Data' }
        ]} />

        <div className="export-header">
          <div>
            <h1 className="page-title">Export Data</h1>
            <p className="page-subtitle">Download your inventory data in various formats</p>
          </div>
          <button 
            className={`btn btn-primary ${exporting ? 'loading' : ''}`}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>

        {successMessage && (
          <div className="alert alert-success">{successMessage}</div>
        )}

        {errors.export && (
          <div className="alert alert-error">{errors.export}</div>
        )}

        <div className="export-options">
          <div className="option-section">
            <h3 className="section-title">Export Format</h3>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  value="csv"
                  checked={exportOptions.format === 'csv'}
                  onChange={(e) => handleOptionChange('format', e.target.value)}
                />
                <span className="radio-label">
                  <strong>CSV</strong> - Comma-separated values, compatible with Excel and Google Sheets
                </span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  value="json"
                  checked={exportOptions.format === 'json'}
                  onChange={(e) => handleOptionChange('format', e.target.value)}
                />
                <span className="radio-label">
                  <strong>JSON</strong> - Machine-readable format for developers and applications
                </span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  value="excel"
                  checked={exportOptions.format === 'excel'}
                  onChange={(e) => handleOptionChange('format', e.target.value)}
                />
                <span className="radio-label">
                  <strong>Excel</strong> - Native Excel format with formatting and multiple sheets
                </span>
              </label>
            </div>
          </div>

          <div className="option-section">
            <h3 className="section-title">Export Scope</h3>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  value="all"
                  checked={exportOptions.scope === 'all'}
                  onChange={(e) => handleOptionChange('scope', e.target.value)}
                />
                <span className="radio-label">
                  <strong>All Data</strong> - Export everything (all houses, rooms, and items)
                </span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  value="house"
                  checked={exportOptions.scope === 'house'}
                  onChange={(e) => handleOptionChange('scope', e.target.value)}
                />
                <span className="radio-label">
                  <strong>Specific House</strong> - Export data for one house only
                </span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  value="category"
                  checked={exportOptions.scope === 'category'}
                  onChange={(e) => handleOptionChange('scope', e.target.value)}
                />
                <span className="radio-label">
                  <strong>By Category</strong> - Export items from a specific category
                </span>
              </label>
            </div>

            {exportOptions.scope === 'house' && (
              <div className="sub-option">
                <label htmlFor="houseSelect">Select House:</label>
                <select
                  id="houseSelect"
                  value={exportOptions.houseId || ''}
                  onChange={(e) => handleOptionChange('houseId', parseInt(e.target.value))}
                  className="filter-select"
                >
                  <option value="">Choose a house...</option>
                  {houses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name || `${house.address1}, ${house.city}, ${house.state}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {exportOptions.scope === 'category' && (
              <div className="sub-option">
                <label htmlFor="categorySelect">Select Category:</label>
                <select
                  id="categorySelect"
                  value={exportOptions.category || ''}
                  onChange={(e) => handleOptionChange('category', e.target.value)}
                  className="filter-select"
                >
                  <option value="">Choose a category...</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="option-section">
            <h3 className="section-title">Additional Options</h3>
            <div className="checkbox-group">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={exportOptions.includeStats}
                  onChange={(e) => handleOptionChange('includeStats', e.target.checked)}
                />
                <span className="checkbox-label">
                  Include statistics and calculated values
                </span>
              </label>
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={exportOptions.includeImages}
                  onChange={(e) => handleOptionChange('includeImages', e.target.checked)}
                />
                <span className="checkbox-label">
                  Include image references (file paths and URLs)
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="export-preview">
          <h3 className="section-title">Export Preview</h3>
          <div className="preview-card">
            <div className="preview-details">
              <div className="preview-item">
                <span className="preview-label">Format:</span>
                <span className="preview-value">{exportOptions.format.toUpperCase()}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Scope:</span>
                <span className="preview-value">
                  {exportOptions.scope === 'all' && 'All inventory data'}
                  {exportOptions.scope === 'house' && exportOptions.houseId && 
                    houses.find(h => h.id === exportOptions.houseId)?.name || 
                    houses.find(h => h.id === exportOptions.houseId)?.address1 || 
                    'Selected house'
                  }
                  {exportOptions.scope === 'house' && !exportOptions.houseId && 'No house selected'}
                  {exportOptions.scope === 'category' && exportOptions.category && `${exportOptions.category} items`}
                  {exportOptions.scope === 'category' && !exportOptions.category && 'No category selected'}
                </span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Includes:</span>
                <span className="preview-value">
                  Items, rooms, houses
                  {exportOptions.includeStats && ', statistics'}
                  {exportOptions.includeImages && ', image references'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="export-info">
          <h3 className="section-title">Export Information</h3>
          <div className="info-grid">
            <div className="info-card">
              <h4>CSV Format</h4>
              <p>Best for spreadsheet applications like Excel, Google Sheets, or data analysis. Creates separate files for houses, rooms, and items.</p>
            </div>
            <div className="info-card">
              <h4>JSON Format</h4>
              <p>Ideal for developers and applications. Maintains data relationships and structure. Can be imported into databases or other applications.</p>
            </div>
            <div className="info-card">
              <h4>Excel Format</h4>
              <p>Native Excel file with multiple worksheets, formatting, and formulas. Includes charts and pivot tables for data analysis.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 