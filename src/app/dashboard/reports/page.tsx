'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Breadcrumb from '@/components/Breadcrumb';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [exportingPDF, setExportingPDF] = useState<boolean>(false);

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
      const housesResponse = await fetch(`/app/api/houses?userEmail=${encodeURIComponent(session?.user?.email || '')}`);
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
        const roomsResponse = await fetch(`/app/api/rooms?userEmail=${encodeURIComponent(session?.user?.email || '')}&houseId=${house.id}`);
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
            const itemsResponse = await fetch(`/app/api/items?userEmail=${encodeURIComponent(session?.user?.email || '')}&roomId=${room.id}`);
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
      if (format === 'pdf') {
        setExportingPDF(true);
        await generatePDFReport(reportType);
      } else if (format === 'csv') {
        generateCSVReport(reportType);
      } else {
        // For Excel, show placeholder for now
        alert(`Exporting ${reportType} as ${format.toUpperCase()}... (Feature coming soon)`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  const generatePDFReport = async (reportType: string) => {
    if (!reportData) return;

    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 100));

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    
    // Add header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('HomeContentsListPro V2', margin, 25);
    
    doc.setFontSize(16);
    doc.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, margin, 35);
    
    // Add date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, 45);
    
    // Add filter info
    const filterText = selectedHouse === 'all' ? 'All Houses' : 
      reportData.houseReports.find(h => h.id.toString() === selectedHouse)?.name || 
      `${reportData.houseReports.find(h => h.id.toString() === selectedHouse)?.address1}`;
    doc.text(`Filter: ${filterText}`, margin, 52);

    let yPosition = 65;

    // Add summary statistics
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Summary Statistics', margin, yPosition);
    yPosition += 10;

    const summaryData = [
      ['Total Inventory Value', formatCurrency(reportData.totalValue)],
      ['Total Items', reportData.totalItems.toLocaleString()],
      ['Total Rooms', reportData.totalRooms.toString()],
      ['Total Houses', reportData.totalHouses.toString()]
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Generate content based on report type
    switch (reportType) {
      case 'overview':
        generateOverviewPDF(doc, yPosition, margin);
        break;
      case 'categories':
        generateCategoriesPDF(doc, yPosition, margin);
        break;
      case 'rooms':
        generateRoomsPDF(doc, yPosition, margin);
        break;
      case 'houses':
        generateHousesPDF(doc, yPosition, margin);
        break;
    }

    // Save the PDF
    const filename = `homecontents-${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  const generateOverviewPDF = (doc: jsPDF, startY: number, margin: number) => {
    if (!reportData) return;

    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Additional Metrics', margin, startY);

    const additionalData = [
      ['Average Item Value', formatCurrency(reportData.totalItems > 0 ? reportData.totalValue / reportData.totalItems : 0)],
      ['Average Room Value', formatCurrency(reportData.totalRooms > 0 ? reportData.totalValue / reportData.totalRooms : 0)],
      ['Items per Room', reportData.totalRooms > 0 ? Math.round(reportData.totalItems / reportData.totalRooms).toString() : '0'],
      ['Rooms per House', reportData.totalHouses > 0 ? Math.round(reportData.totalRooms / reportData.totalHouses).toString() : '0']
    ];

    autoTable(doc, {
      startY: startY + 10,
      head: [['Metric', 'Value']],
      body: additionalData,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: margin, right: margin }
    });
  };

  const generateCategoriesPDF = (doc: jsPDF, startY: number, margin: number) => {
    if (!reportData) return;

    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Value by Category', margin, startY);

    const categoryData = reportData.categoryReports.map(cat => [
      cat.category,
      cat.itemCount.toString(),
      formatCurrency(cat.totalValue),
      formatCurrency(cat.averageValue)
    ]);

    autoTable(doc, {
      startY: startY + 10,
      head: [['Category', 'Items', 'Total Value', 'Average Value']],
      body: categoryData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: margin, right: margin }
    });
  };

  const generateRoomsPDF = (doc: jsPDF, startY: number, margin: number) => {
    if (!reportData) return;

    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Room-by-Room Analysis', margin, startY);

    const roomData = reportData.roomReports.map(room => [
      room.name,
      room.houseName,
      room.stats.itemCount.toString(),
      formatCurrency(room.stats.totalValue)
    ]);

    autoTable(doc, {
      startY: startY + 10,
      head: [['Room', 'House', 'Items', 'Total Value']],
      body: roomData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: margin, right: margin }
    });
  };

  const generateHousesPDF = (doc: jsPDF, startY: number, margin: number) => {
    if (!reportData) return;

    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('House Summary', margin, startY);

    const houseData = reportData.houseReports.map(house => [
      house.name || 'Unnamed',
      `${house.address1}, ${house.city}, ${house.state}`,
      house.stats.roomCount.toString(),
      house.stats.itemCount.toString(),
      formatCurrency(house.stats.totalValue)
    ]);

    autoTable(doc, {
      startY: startY + 10,
      head: [['Name', 'Address', 'Rooms', 'Items', 'Total Value']],
      body: houseData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: margin, right: margin }
    });
  };

  const generateCSVReport = (reportType: string) => {
    if (!reportData) return;

    let csvContent = '';
    const timestamp = new Date().toISOString().split('T')[0];
    const filterText = selectedHouse === 'all' ? 'All Houses' : 
      reportData.houseReports.find(h => h.id.toString() === selectedHouse)?.name || 
      `${reportData.houseReports.find(h => h.id.toString() === selectedHouse)?.address1}`;

    // Add header information
    csvContent += `HomeContentsListPro V2 - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report\n`;
    csvContent += `Generated on: ${new Date().toLocaleDateString()}\n`;
    csvContent += `Filter: ${filterText}\n\n`;

    // Add summary statistics
    csvContent += 'Summary Statistics\n';
    csvContent += 'Metric,Value\n';
    csvContent += `Total Inventory Value,"${formatCurrency(reportData.totalValue)}"\n`;
    csvContent += `Total Items,${reportData.totalItems}\n`;
    csvContent += `Total Rooms,${reportData.totalRooms}\n`;
    csvContent += `Total Houses,${reportData.totalHouses}\n\n`;

    // Generate content based on report type
    switch (reportType) {
      case 'overview':
        csvContent += 'Additional Metrics\n';
        csvContent += 'Metric,Value\n';
        csvContent += `Average Item Value,"${formatCurrency(reportData.totalItems > 0 ? reportData.totalValue / reportData.totalItems : 0)}"\n`;
        csvContent += `Average Room Value,"${formatCurrency(reportData.totalRooms > 0 ? reportData.totalValue / reportData.totalRooms : 0)}"\n`;
        csvContent += `Items per Room,${reportData.totalRooms > 0 ? Math.round(reportData.totalItems / reportData.totalRooms) : 0}\n`;
        csvContent += `Rooms per House,${reportData.totalHouses > 0 ? Math.round(reportData.totalRooms / reportData.totalHouses) : 0}\n`;
        break;

      case 'categories':
        csvContent += 'Value by Category\n';
        csvContent += 'Category,Item Count,Total Value,Average Value,% of Total\n';
        reportData.categoryReports.forEach(cat => {
          const percentage = ((cat.totalValue / reportData.totalValue) * 100).toFixed(1);
          csvContent += `"${cat.category}",${cat.itemCount},"${formatCurrency(cat.totalValue)}","${formatCurrency(cat.averageValue)}",${percentage}%\n`;
        });
        break;

      case 'rooms':
        csvContent += 'Room-by-Room Analysis\n';
        csvContent += 'Room,House,Items,Total Value\n';
        reportData.roomReports.forEach(room => {
          csvContent += `"${room.name}","${room.houseName}",${room.stats.itemCount},"${formatCurrency(room.stats.totalValue)}"\n`;
        });
        break;

      case 'houses':
        csvContent += 'House Summary\n';
        csvContent += 'Name,Address,Rooms,Items,Total Value\n';
        reportData.houseReports.forEach(house => {
          const name = house.name || 'Unnamed';
          const address = `${house.address1}, ${house.city}, ${house.state}`;
          csvContent += `"${name}","${address}",${house.stats.roomCount},${house.stats.itemCount},"${formatCurrency(house.stats.totalValue)}"\n`;
        });
        break;
    }

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `homecontents-${reportType}-report-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                  <button 
                    onClick={() => exportReport('pdf', 'overview')} 
                    className={`btn btn-sm btn-outlined ${exportingPDF ? 'loading' : ''}`}
                    disabled={exportingPDF}
                  >
                    {exportingPDF ? 'Generating PDF...' : 'Export PDF'}
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
                <button 
                  onClick={() => exportReport('pdf', 'categories')} 
                  className={`btn btn-sm btn-outlined ${exportingPDF ? 'loading' : ''}`}
                  disabled={exportingPDF}
                >
                  {exportingPDF ? 'Generating PDF...' : 'Export PDF'}
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
                <button 
                  onClick={() => exportReport('pdf', 'rooms')} 
                  className={`btn btn-sm btn-outlined ${exportingPDF ? 'loading' : ''}`}
                  disabled={exportingPDF}
                >
                  {exportingPDF ? 'Generating PDF...' : 'Export PDF'}
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
                <button 
                  onClick={() => exportReport('pdf', 'houses')} 
                  className={`btn btn-sm btn-outlined ${exportingPDF ? 'loading' : ''}`}
                  disabled={exportingPDF}
                >
                  {exportingPDF ? 'Generating PDF...' : 'Export PDF'}
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