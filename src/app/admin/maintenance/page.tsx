'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface MaintenanceStats {
  databaseSize: number;
  totalUsers: number;
  inactiveUsers: number;
  orphanedItems: number;
  duplicateItems: number;
  systemUptime: string;
  diskUsage: number;
  memoryUsage: number;
}

interface CleanupResult {
  success: boolean;
  message: string;
  itemsAffected: number;
}

export default function AdminMaintenancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/app/auth/login');
      return;
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchMaintenanceStats();
  }, [session, status, router]);

  const fetchMaintenanceStats = async () => {
    if (!session?.user?.email) return;
    
    try {
      const response = await fetch(`/app/api/admin/maintenance/stats?userEmail=${encodeURIComponent(session.user.email)}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching maintenance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const performCleanup = async (type: string) => {
    if (!session?.user?.email) return;
    
    setCleanupLoading(true);
    setCleanupResult(null);
    setMessage(null);

    try {
      const response = await fetch(`/app/api/admin/maintenance/cleanup?userEmail=${encodeURIComponent(session.user.email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      const data = await response.json();
      
      if (response.ok) {
        setCleanupResult(data);
        setMessage({ type: 'success', text: data.message });
        // Refresh stats after cleanup
        await fetchMaintenanceStats();
      } else {
        setMessage({ type: 'error', text: data.error || 'Cleanup failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to perform cleanup' });
    } finally {
      setCleanupLoading(false);
    }
  };

  const optimizeDatabase = async () => {
    if (!session?.user?.email) return;
    
    setCleanupLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/app/api/admin/maintenance/optimize?userEmail=${encodeURIComponent(session.user.email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        await fetchMaintenanceStats();
      } else {
        setMessage({ type: 'error', text: data.error || 'Database optimization failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to optimize database' });
    } finally {
      setCleanupLoading(false);
    }
  };

  if (status === 'loading' || loading) {
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
          <h1 className="dashboard-title">System Maintenance</h1>
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
        {message && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '4px', 
            marginBottom: '20px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message.text}
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <div style={{ borderBottom: '1px solid #dee2e6', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '0' }}>
              {[
                { id: 'overview', label: 'System Overview' },
                { id: 'cleanup', label: 'Database Cleanup' },
                { id: 'optimization', label: 'Performance' },
                { id: 'health', label: 'Health Check' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
                    color: activeTab === tab.id ? 'white' : '#666',
                    borderBottom: activeTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* System Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>System Statistics</h3>
              
              {stats ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#007bff' }}>Database</h4>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                      <strong>Size:</strong> {(stats.databaseSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                      <strong>Total Users:</strong> {stats.totalUsers.toLocaleString()}
                    </p>
                  </div>

                  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#28a745' }}>Data Quality</h4>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                      <strong>Inactive Users:</strong> {stats.inactiveUsers.toLocaleString()}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                      <strong>Orphaned Items:</strong> {stats.orphanedItems.toLocaleString()}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                      <strong>Duplicate Items:</strong> {stats.duplicateItems.toLocaleString()}
                    </p>
                  </div>

                  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#fd7e14' }}>System Resources</h4>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                      <strong>Uptime:</strong> {stats.systemUptime}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                      <strong>Memory Usage:</strong> {stats.memoryUsage}%
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                      <strong>Disk Usage:</strong> {stats.diskUsage}%
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                  <p>Loading system statistics...</p>
                </div>
              )}

              <div style={{ marginTop: '32px' }}>
                <button
                  onClick={fetchMaintenanceStats}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🔄 Refresh Stats
                </button>
              </div>
            </div>
          )}

          {/* Database Cleanup Tab */}
          {activeTab === 'cleanup' && (
            <div>
              <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Database Cleanup Tools</h3>
              
              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#dc3545' }}>Remove Orphaned Data</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
                    Clean up items that belong to deleted rooms, rooms that belong to deleted houses, and other orphaned data.
                  </p>
                  <button
                    onClick={() => performCleanup('orphaned')}
                    disabled={cleanupLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: cleanupLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: cleanupLoading ? 0.6 : 1
                    }}
                  >
                    {cleanupLoading ? '⏳ Cleaning...' : '🗑️ Clean Orphaned Data'}
                  </button>
                </div>

                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#ffc107' }}>Remove Duplicate Items</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
                    Find and remove duplicate items based on name, serial number, and room.
                  </p>
                  <button
                    onClick={() => performCleanup('duplicates')}
                    disabled={cleanupLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ffc107',
                      color: 'black',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: cleanupLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: cleanupLoading ? 0.6 : 1
                    }}
                  >
                    {cleanupLoading ? '⏳ Scanning...' : '🔍 Remove Duplicates'}
                  </button>
                </div>

                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#6c757d' }}>Clean Inactive Users</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
                    Remove users who haven't logged in for 180+ days and have no data (no houses, items, etc.).
                  </p>
                  <button
                    onClick={() => performCleanup('inactive')}
                    disabled={cleanupLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: cleanupLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: cleanupLoading ? 0.6 : 1
                    }}
                  >
                    {cleanupLoading ? '⏳ Processing...' : '👥 Clean Inactive Users'}
                  </button>
                </div>

                {cleanupResult && (
                  <div style={{ 
                    backgroundColor: cleanupResult.success ? '#d4edda' : '#f8d7da',
                    padding: '16px',
                    borderRadius: '8px',
                    border: `1px solid ${cleanupResult.success ? '#c3e6cb' : '#f5c6cb'}`,
                    color: cleanupResult.success ? '#155724' : '#721c24'
                  }}>
                    <h5 style={{ margin: '0 0 8px 0' }}>Cleanup Results</h5>
                    <p style={{ margin: '0', fontSize: '14px' }}>
                      {cleanupResult.message}
                    </p>
                    {cleanupResult.itemsAffected > 0 && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 'bold' }}>
                        Items affected: {cleanupResult.itemsAffected}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'optimization' && (
            <div>
              <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Performance Optimization</h3>
              
              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#007bff' }}>Database Optimization</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
                    Optimize database tables, rebuild indexes, and analyze query performance.
                  </p>
                  <button
                    onClick={optimizeDatabase}
                    disabled={cleanupLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: cleanupLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: cleanupLoading ? 0.6 : 1
                    }}
                  >
                    {cleanupLoading ? '⏳ Optimizing...' : '⚡ Optimize Database'}
                  </button>
                </div>

                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#28a745' }}>Cache Management</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
                    Clear application cache and temporary files to free up space and improve performance.
                  </p>
                  <button
                    onClick={() => performCleanup('cache')}
                    disabled={cleanupLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: cleanupLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: cleanupLoading ? 0.6 : 1
                    }}
                  >
                    {cleanupLoading ? '⏳ Clearing...' : '🧹 Clear Cache'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Health Check Tab */}
          {activeTab === 'health' && (
            <div>
              <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>System Health Check</h3>
              
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <span style={{ fontSize: '14px' }}>Database Connection</span>
                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>✅ Connected</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <span style={{ fontSize: '14px' }}>Email Service</span>
                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>✅ Active</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <span style={{ fontSize: '14px' }}>Stripe Integration</span>
                    <span style={{ color: '#ffc107', fontWeight: 'bold' }}>⚠️ Configured</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <span style={{ fontSize: '14px' }}>File Storage</span>
                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>✅ Available</span>
                  </div>

                  {stats && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                        <span style={{ fontSize: '14px' }}>Memory Usage</span>
                        <span style={{ 
                          color: stats.memoryUsage > 80 ? '#dc3545' : stats.memoryUsage > 60 ? '#ffc107' : '#28a745', 
                          fontWeight: 'bold' 
                        }}>
                          {stats.memoryUsage > 80 ? '❌' : stats.memoryUsage > 60 ? '⚠️' : '✅'} {stats.memoryUsage}%
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                        <span style={{ fontSize: '14px' }}>Disk Space</span>
                        <span style={{ 
                          color: stats.diskUsage > 90 ? '#dc3545' : stats.diskUsage > 75 ? '#ffc107' : '#28a745', 
                          fontWeight: 'bold' 
                        }}>
                          {stats.diskUsage > 90 ? '❌' : stats.diskUsage > 75 ? '⚠️' : '✅'} {stats.diskUsage}%
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#e7f3ff', borderRadius: '4px', border: '1px solid #b3d7ff' }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#0066cc' }}>Recommendations</h5>
                  <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#666' }}>
                    {stats?.memoryUsage && stats.memoryUsage > 80 && (
                      <li>Consider increasing server memory allocation</li>
                    )}
                    {stats?.diskUsage && stats.diskUsage > 75 && (
                      <li>Disk space is getting low - consider cleanup or expansion</li>
                    )}
                    {stats?.orphanedItems && stats.orphanedItems > 100 && (
                      <li>Run orphaned data cleanup to improve database performance</li>
                    )}
                    {stats?.duplicateItems && stats.duplicateItems > 50 && (
                      <li>Run duplicate removal to clean up redundant data</li>
                    )}
                    <li>Regular database backups are recommended</li>
                    <li>Monitor user activity and system performance regularly</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 