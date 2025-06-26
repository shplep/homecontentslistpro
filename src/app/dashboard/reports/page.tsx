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

interface Room {
  id: number;
  name: string;
  houseId: number;
  houseName: string;
  houseAddress: string;
  stats: {
    itemCount: number;
    totalValue: number;
  };
}

interface CategoryReport {
  category: string;
  itemCount: number;
  totalValue: number;
  averageValue: number;
}

interface ReportData {
  totalValue: number;
  totalItems: number;
  totalRooms: number;
  totalHouses: number;
  houseReports: House[];
  roomReports: Room[];
  categoryReports: CategoryReport[];
}

export default function ReportsPage() {
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<string>('overview');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (session?.user?.email) {
      fetchReportData();
    }
  }, [session, selectedHouse]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all data needed for reports
      const housesResponse = await fetch(`/api/houses?userEmail=${encodeURIComponent(session?.user?.email || '')}`);
      if (!housesResponse.ok) throw new Error('Failed to fetch houses');
      const { houses } = await housesResponse.json();

      // Calculate overall statistics
      let totalValue = 0;
      let totalItems = 0;
      let totalRooms = 0;
      const categoryMap = new Map<string, { count: number; value: number }>();
      const houseReports: House[] = [];
      const roomReports: Room[] = [];

      for (const house of houses) {
        const houseReport: House = {
          id: house.id,
          name: house.name,
          address1: house.address1,
          city: house.city,
          state: house.state,
          stats: {
            roomCount: house.stats.roomCount,
            itemCount: house.stats.itemCount,
            totalValue: house.stats.totalValue
          }
        };

        houseReports.push(houseReport);
        totalValue += house.stats.totalValue;
        totalItems += house.stats.itemCount;
        totalRooms += house.stats.roomCount;

        // If we're filtering by a specific house, only include its data
        if (selectedHouse !== 'all' && house.id.toString() !== selectedHouse) {
          continue;
        }

        // Fetch rooms for this house
        const roomsResponse = await fetch(`/api/rooms?userEmail=${encodeURIComponent(session?.user?.email || '')}&houseId=${house.id}`);
        if (roomsResponse.ok) {
          const rooms = await roomsResponse.json();
          
          for (const room of rooms) {
            const houseDisplayName = house.name || `${house.address1}, ${house.city}, ${house.state}`;
            
            roomReports.push({
              id: room.id,
              name: room.name,
              houseId: house.id,
              houseName: houseDisplayName,
              houseAddress: `${house.address1}, ${house.city}, ${house.state}`,
              stats: {
                itemCount: room.stats.itemCount,
                totalValue: room.stats.totalValue
              }
            });

            // Fetch items for category breakdown
            const itemsResponse = await fetch(`/api/items?userEmail=${encodeURIComponent(session?.user?.email || '')}&roomId=${room.id}`);
            if (itemsResponse.ok) {
              const items = await itemsResponse.json();
              
              for (const item of items) {
                const category = item.category || 'Uncategorized';
                const value = parseFloat(item.price) || 0;
                
                const existing = categoryMap.get(category) || { count: 0, value: 0 };
                categoryMap.set(category, {
                  count: existing.count + 1,
                  value: existing.value + value
                });
              }
            }
          }
        }
      }

      // Convert category map to sorted array
      const categoryReports: CategoryReport[] = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          itemCount: data.count,
          totalValue: data.value,
          averageValue: data.count > 0 ? data.value / data.count : 0
        }))
        .sort((a, b) => b.totalValue - a.totalValue);

      setReportData({
        totalValue: selectedHouse === 'all' ? totalValue : houseReports.find(h => h.id.toString() === selectedHouse)?.stats.totalValue || 0,
        totalItems: selectedHouse === 'all' ? totalItems : houseReports.find(h => h.id.toString() === selectedHouse)?.stats.itemCount || 0,
        totalRooms: selectedHouse === 'all' ? totalRooms : houseReports.find(h => h.id.toString() === selectedHouse)?.stats.roomCount || 0,
        totalHouses: selectedHouse === 'all' ? houses.length : 1,
        houseReports: selectedHouse === 'all' ? houseReports : houseReports.filter(h => h.id.toString() === selectedHouse),
        roomReports: selectedHouse === 'all' ? roomReports : roomReports.filter(r => r.houseId.toString() === selectedHouse),
        categoryReports
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'csv' | 'excel' | 'pdf', reportType: string) => {
    try {
      // This would typically call an API endpoint that generates the file
      // For now, we'll show a placeholder
      alert(`Exporting ${reportType} as ${format.toUpperCase()}... (Feature coming soon)`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-main">
          <div className="loading">Loading reports...</div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-main">
          <div className="error">Failed to load report data.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        <Breadcrumb items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports' }
        ]} />

        <div className="reports-header">
          <div>
            <h1 className="page-title">Reports & Analytics</h1>
            <p className="page-subtitle">Comprehensive inventory reports and statistics</p>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {/* Filter Controls */}
        <div className="reports-controls">
          <div className="filter-group">
            <label htmlFor="house-filter">Filter by House:</label>
            <select 
              id="house-filter"
              value={selectedHouse} 
              onChange={(e) => setSelectedHouse(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Houses</option>
              {reportData.houseReports.map((house) => (
                <option key={house.id} value={house.id.toString()}>
                  {house.name || `${house.address1}, ${house.city}, ${house.state}`}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="report-type">Report Type:</label>
            <select 
              id="report-type"
              value={selectedReport} 
              onChange={(e) => setSelectedReport(e.target.value)}
              className="filter-select"
            >
              <option value="overview">Overview</option>
              <option value="categories">Categories</option>
              <option value="rooms">Room-by-Room</option>
              <option value="houses">House Summary</option>
            </select>
          </div>
        </div>

        {/* Overview Stats */}
        {selectedReport === 'overview' && (
          <>
            <div className="stats-grid">
              <div className="stat-card value">
                <div className="stat-number">{formatCurrency(reportData.totalValue)}</div>
                <div className="stat-label">Total Inventory Value</div>
              </div>
              <div className="stat-card items">
                <div className="stat-number">{reportData.totalItems.toLocaleString()}</div>
                <div className="stat-label">Total Items</div>
              </div>
              <div className="stat-card rooms">
                <div className="stat-number">{reportData.totalRooms}</div>
                <div className="stat-label">Total Rooms</div>
              </div>
              <div className="stat-card houses">
                <div className="stat-number">{reportData.totalHouses}</div>
                <div className="stat-label">Total Houses</div>
              </div>
            </div>

            <div className="report-section">
              <div className="report-section-header">
                <h2>Quick Summary</h2>
                <div className="export-buttons">
                  <button onClick={() => exportReport('csv', 'overview')} className="btn btn-sm btn-outlined">
                    Export CSV
                  </button>
                  <button onClick={() => exportReport('excel', 'overview')} className="btn btn-sm btn-outlined">
                    Export Excel
                  </button>
                  <button onClick={() => exportReport('pdf', 'overview')} className="btn btn-sm btn-outlined">
                    Export PDF
                  </button>
                </div>
              </div>
              
              <div className="summary-grid">
                <div className="summary-card">
                  <h4>Average Item Value</h4>
                  <div className="summary-value">
                    {formatCurrency(reportData.totalItems > 0 ? reportData.totalValue / reportData.totalItems : 0)}
                  </div>
                </div>
                <div className="summary-card">
                  <h4>Average Room Value</h4>
                  <div className="summary-value">
                    {formatCurrency(reportData.totalRooms > 0 ? reportData.totalValue / reportData.totalRooms : 0)}
                  </div>
                </div>
                <div className="summary-card">
                  <h4>Items per Room</h4>
                  <div className="summary-value">
                    {reportData.totalRooms > 0 ? Math.round(reportData.totalItems / reportData.totalRooms) : 0}
                  </div>
                </div>
                <div className="summary-card">
                  <h4>Rooms per House</h4>
                  <div className="summary-value">
                    {reportData.totalHouses > 0 ? Math.round(reportData.totalRooms / reportData.totalHouses) : 0}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Category Report */}
        {selectedReport === 'categories' && (
          <div className="report-section">
            <div className="report-section-header">
              <h2>Value by Category</h2>
              <div className="export-buttons">
                <button onClick={() => exportReport('csv', 'categories')} className="btn btn-sm btn-outlined">
                  Export CSV
                </button>
                <button onClick={() => exportReport('excel', 'categories')} className="btn btn-sm btn-outlined">
                  Export Excel
                </button>
                <button onClick={() => exportReport('pdf', 'categories')} className="btn btn-sm btn-outlined">
                  Export PDF
                </button>
              </div>
            </div>
            
            <div className="report-table">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Item Count</th>
                    <th>Total Value</th>
                    <th>Average Value</th>
                    <th>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.categoryReports.map((category) => (
                    <tr key={category.category}>
                      <td>{category.category}</td>
                      <td>{category.itemCount}</td>
                      <td>{formatCurrency(category.totalValue)}</td>
                      <td>{formatCurrency(category.averageValue)}</td>
                      <td>{((category.totalValue / reportData.totalValue) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Room Report */}
        {selectedReport === 'rooms' && (
          <div className="report-section">
            <div className="report-section-header">
              <h2>Room-by-Room Analysis</h2>
              <div className="export-buttons">
                <button onClick={() => exportReport('csv', 'rooms')} className="btn btn-sm btn-outlined">
                  Export CSV
                </button>
                <button onClick={() => exportReport('excel', 'rooms')} className="btn btn-sm btn-outlined">
                  Export Excel
                </button>
                <button onClick={() => exportReport('pdf', 'rooms')} className="btn btn-sm btn-outlined">
                  Export PDF
                </button>
              </div>
            </div>
            
            <div className="report-table">
              <table>
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>House</th>
                    <th>Item Count</th>
                    <th>Total Value</th>
                    <th>Average Item Value</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.roomReports.map((room) => (
                    <tr key={room.id}>
                      <td>{room.name}</td>
                      <td>{room.houseName}</td>
                      <td>{room.stats.itemCount}</td>
                      <td>{formatCurrency(room.stats.totalValue)}</td>
                      <td>{formatCurrency(room.stats.itemCount > 0 ? room.stats.totalValue / room.stats.itemCount : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* House Report */}
        {selectedReport === 'houses' && selectedHouse === 'all' && (
          <div className="report-section">
            <div className="report-section-header">
              <h2>House Summary</h2>
              <div className="export-buttons">
                <button onClick={() => exportReport('csv', 'houses')} className="btn btn-sm btn-outlined">
                  Export CSV
                </button>
                <button onClick={() => exportReport('excel', 'houses')} className="btn btn-sm btn-outlined">
                  Export Excel
                </button>
                <button onClick={() => exportReport('pdf', 'houses')} className="btn btn-sm btn-outlined">
                  Export PDF
                </button>
              </div>
            </div>
            
            <div className="report-table">
              <table>
                <thead>
                  <tr>
                    <th>House</th>
                    <th>Address</th>
                    <th>Rooms</th>
                    <th>Items</th>
                    <th>Total Value</th>
                    <th>Avg. Room Value</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.houseReports.map((house) => (
                    <tr key={house.id}>
                      <td>{house.name || 'Unnamed House'}</td>
                      <td>{`${house.address1}, ${house.city}, ${house.state}`}</td>
                      <td>{house.stats.roomCount}</td>
                      <td>{house.stats.itemCount}</td>
                      <td>{formatCurrency(house.stats.totalValue)}</td>
                      <td>{formatCurrency(house.stats.roomCount > 0 ? house.stats.totalValue / house.stats.roomCount : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportData.categoryReports.length === 0 && reportData.totalItems === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <h3>No data to report</h3>
            <p>Add some items to your inventory to generate meaningful reports.</p>
          </div>
        )}
      </div>
    </div>
  );
}