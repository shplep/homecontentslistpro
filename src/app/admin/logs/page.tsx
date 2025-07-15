'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface LogEntry {
  id: string | number;
  action: string;
  timestamp: string;
  admin: {
    name: string;
    email: string;
  } | null;
  user: {
    name: string;
    email: string;
  };
  type: 'admin_action' | 'system_event';
}

interface LogsData {
  logs: LogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    adminActions: number;
    systemEvents: number;
    totalLogs: number;
  };
}

export default function AdminLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<LogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [logType, setLogType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login');
      return;
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchLogs();
  }, [session, status, router, currentPage, logType, startDate, endDate]);

  const fetchLogs = async () => {
    if (!session?.user?.email) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userEmail: session.user.email,
        page: currentPage.toString(),
        limit: '25',
        type: logType,
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      });

      const response = await fetch(`/app/api/admin/logs?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'admin_action':
        return '#dc3545';
      case 'system_event':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const getLogTypeLabel = (type: string) => {
    switch (type) {
      case 'admin_action':
        return 'Admin Action';
      case 'system_event':
        return 'System Event';
      default:
        return 'Unknown';
    }
  };

  if (status === 'loading') {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== 'ADMIN') {
    return null;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">System Logs</h1>
          <div style={{ 
            display: 'inline-block', 
            backgroundColor: '#dc3545', 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: '4px', 
            fontSize: '12px', 
            fontWeight: 'bold', 
            marginLeft: '12px' 
          }}>
            ADMIN MODE
          </div>
        </div>
        <div className="user-info">
          <Link href="/admin/dashboard" className="btn btn-outlined">
            ← Back to Admin Dashboard
          </Link>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Summary Cards */}
        {logs && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Total Logs</h3>
              <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
                {logs.summary.totalLogs}
              </p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Admin Actions</h3>
              <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                {logs.summary.adminActions}
              </p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>System Events</h3>
              <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                {logs.summary.systemEvents}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600' }}>Filters</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Log Type</label>
              <select
                value={logType}
                onChange={(e) => setLogType(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="all">All Types</option>
                <option value="admin_action">Admin Actions</option>
                <option value="system_event">System Events</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'end', gap: '10px' }}>
              <button
                onClick={() => {
                  setLogType('all');
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
            <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600' }}>System Logs</h3>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', color: '#666' }}>Loading logs...</div>
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ color: '#dc3545', fontSize: '16px' }}>Error: {error}</div>
              <button
                onClick={fetchLogs}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          ) : logs && logs.logs.length > 0 ? (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '14px', fontWeight: '600' }}>Type</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '14px', fontWeight: '600' }}>Action</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '14px', fontWeight: '600' }}>User</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '14px', fontWeight: '600' }}>Admin</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '14px', fontWeight: '600' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.logs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: getLogTypeColor(log.type),
                            color: 'white'
                          }}>
                            {getLogTypeLabel(log.type)}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>{log.action}</td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          <div>{log.user.name}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{log.user.email}</div>
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          {log.admin ? (
                            <div>
                              <div>{log.admin.name}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>{log.admin.email}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#999', fontStyle: 'italic' }}>System</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                          {formatTimestamp(log.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {logs.pagination.totalPages > 1 && (
                <div style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: currentPage === 1 ? '#f8f9fa' : '#007bff',
                      color: currentPage === 1 ? '#6c757d' : 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Previous
                  </button>
                  
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    Page {logs.pagination.page} of {logs.pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(logs.pagination.totalPages, currentPage + 1))}
                    disabled={currentPage === logs.pagination.totalPages}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: currentPage === logs.pagination.totalPages ? '#f8f9fa' : '#007bff',
                      color: currentPage === logs.pagination.totalPages ? '#6c757d' : 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: currentPage === logs.pagination.totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📝</div>
              <h3 style={{ marginBottom: '10px', color: '#666' }}>No logs found</h3>
              <p style={{ color: '#999', marginBottom: '20px' }}>
                No system logs match your current filters.
              </p>
              <button
                onClick={() => {
                  setLogType('all');
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 