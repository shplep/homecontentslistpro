'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BackupFile {
  filename: string;
  size: number;
  created: string;
  modified: string;
}

interface BackupData {
  backups: BackupFile[];
  backupDirectory: string;
  totalBackups: number;
  totalSize: number;
}

export default function AdminBackupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [backups, setBackups] = useState<BackupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

    fetchBackups();
  }, [session, status, router]);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      setError(null);
      const userEmail = (session?.user as any)?.email;
      const response = await fetch(`/api/admin/backup?userEmail=${encodeURIComponent(userEmail)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch backups');
      }

      const data = await response.json();
      setBackups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch backups');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      setCreating(true);
      setError(null);
      setSuccess(null);
      const userEmail = (session?.user as any)?.email;
      
      const response = await fetch(`/api/admin/backup?userEmail=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create backup');
      }

      const result = await response.json();
      setSuccess(`Backup created successfully: ${result.backup.filename}`);
      fetchBackups(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = async (filename: string) => {
    try {
      const userEmail = (session?.user as any)?.email;
      const url = `/api/admin/backup/download?userEmail=${encodeURIComponent(userEmail)}&filename=${encodeURIComponent(filename)}`;
      
      // Create a temporary link and click it to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download backup');
    }
  };

  const deleteBackup = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete backup "${filename}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(filename);
      setError(null);
      setSuccess(null);
      const userEmail = (session?.user as any)?.email;
      
      const response = await fetch(`/api/admin/backup?userEmail=${encodeURIComponent(userEmail)}&filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete backup');
      }

      setSuccess(`Backup "${filename}" deleted successfully`);
      fetchBackups(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete backup');
    } finally {
      setDeleting(null);
    }
  };

  const deleteOldBackups = async (days: number) => {
    if (!confirm(`Are you sure you want to delete all backups older than ${days} days? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const userEmail = (session?.user as any)?.email;
      
      const response = await fetch(`/api/admin/backup?userEmail=${encodeURIComponent(userEmail)}&olderThan=${days}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete old backups');
      }

      const result = await response.json();
      setSuccess(`Deleted ${result.deletedCount} old backup(s)`);
      fetchBackups(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete old backups');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
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
          <h1 className="dashboard-title">Database Backups</h1>
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
        {/* Backup Summary */}
        {backups && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>{backups.totalBackups}</div>
              <div style={{ color: '#666', fontSize: '14px' }}>Total Backups</div>
            </div>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{formatFileSize(backups.totalSize)}</div>
              <div style={{ color: '#666', fontSize: '14px' }}>Total Size</div>
            </div>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#17a2b8' }}>
                {backups.backups.length > 0 ? formatDate(backups.backups[0].created) : 'N/A'}
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>Latest Backup</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>Backup Actions</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={createBackup}
              disabled={creating}
              className="btn btn-primary"
              style={{ minWidth: '140px' }}
            >
              {creating ? 'Creating...' : '+ Create Backup'}
            </button>
            <button 
              onClick={() => deleteOldBackups(30)}
              disabled={loading}
              className="btn btn-danger"
              style={{ minWidth: '140px' }}
            >
              Delete Old (30d+)
            </button>
            <button 
              onClick={() => deleteOldBackups(7)}
              disabled={loading}
              className="btn btn-warning"
              style={{ minWidth: '140px' }}
            >
              Delete Old (7d+)
            </button>
            <button 
              onClick={fetchBackups}
              disabled={loading}
              className="btn btn-outlined"
              style={{ minWidth: '140px' }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '12px', 
            borderRadius: '4px', 
            marginBottom: '20px',
            border: '1px solid #f5c6cb'
          }}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={{ 
            backgroundColor: '#d4edda', 
            color: '#155724', 
            padding: '12px', 
            borderRadius: '4px', 
            marginBottom: '20px',
            border: '1px solid #c3e6cb'
          }}>
            ✅ {success}
          </div>
        )}

        {/* Backup Files List */}
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>Backup Files</h3>
          
          {backups && backups.backups.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Filename</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Size</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Created</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Modified</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.backups.map((backup) => (
                    <tr key={backup.filename} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '14px' }}>
                        {backup.filename}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {formatFileSize(backup.size)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {formatDate(backup.created)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {formatDate(backup.modified)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => downloadBackup(backup.filename)}
                            className="btn btn-sm btn-primary"
                            title="Download backup"
                          >
                            📥 Download
                          </button>
                          <button
                            onClick={() => deleteBackup(backup.filename)}
                            disabled={deleting === backup.filename}
                            className="btn btn-sm btn-danger"
                            title="Delete backup"
                          >
                            {deleting === backup.filename ? '...' : '🗑️ Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#666' 
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💾</div>
              <h4 style={{ marginBottom: '8px' }}>No Backups Found</h4>
              <p>Create your first backup to get started.</p>
            </div>
          )}
        </div>

        {/* Backup Information */}
        <div style={{ 
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '20px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ marginBottom: '12px', fontSize: '16px' }}>💡 Backup Information</h4>
          <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.6' }}>
            <li>Backups are stored in the <code>/backups</code> directory</li>
            <li>MySQL backups use <code>mysqldump</code> for full database exports</li>
            <li>Development backups use Prisma export format when mysqldump is unavailable</li>
            <li>Regular backups are recommended for data protection</li>
            <li>Downloaded backup files can be used for database restoration</li>
          </ul>
        </div>
      </main>
    </div>
  );
} 