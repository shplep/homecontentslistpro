'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SystemSettings {
  // Email Configuration
  emailProvider: string;
  smtpHost: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  
  // Security Settings
  requireEmailVerification: boolean;
  passwordMinLength: number;
  requireSpecialCharacters: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  
  // Backup Settings
  autoBackupEnabled: boolean;
  backupFrequency: string;
  backupRetentionDays: number;
  
  // General Settings
  siteName: string;
  supportEmail: string;
  defaultTimezone: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  
  // Stripe Configuration
  stripeMode: 'sandbox' | 'live';
  stripeSandboxPublishableKey: string;
  stripeSandboxSecretKey: string;
  stripeLivePublishableKey: string;
  stripeLiveSecretKey: string;
  stripeWebhookSecret: string;
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [stripeTestLoading, setStripeTestLoading] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState<{
    success: boolean;
    message: string;
    accountInfo?: any;
  } | null>(null);

  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const [settings, setSettings] = useState<SystemSettings>({
    // Email Configuration
    emailProvider: 'smtp',
    smtpHost: '',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'HomeContentsListPro',
    
    // Security Settings
    requireEmailVerification: true,
    passwordMinLength: 8,
    requireSpecialCharacters: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    
    // Backup Settings
    autoBackupEnabled: true,
    backupFrequency: 'daily',
    backupRetentionDays: 30,
    
    // General Settings
    siteName: 'HomeContentsListPro',
    supportEmail: '',
    defaultTimezone: 'America/New_York',
    maintenanceMode: false,
    registrationEnabled: true,
    
    // Stripe Configuration
    stripeMode: 'sandbox',
    stripeSandboxPublishableKey: '',
    stripeSandboxSecretKey: '',
    stripeLivePublishableKey: '',
    stripeLiveSecretKey: '',
    stripeWebhookSecret: '',
  });

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

    // Load settings and backup history
    fetchSettings();
    fetchBackupHistory();
  }, [session, status, router]);

  const fetchSettings = async (skipLoadingState = false) => {
    if (!session?.user?.email) return;
    
    try {
      const response = await fetch(`/app/api/admin/settings?userEmail=${encodeURIComponent(session.user.email)}&t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      if (!skipLoadingState) {
        setMessage({ type: 'error', text: 'Failed to load settings' });
      }
    } finally {
      if (!skipLoadingState) {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!session?.user?.email) return;
    
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/app/api/admin/settings?userEmail=${encodeURIComponent(session.user.email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Settings saved successfully!' });
        // Refresh settings from database after successful save
        await fetchSettings(true);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof SystemSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testStripeConnection = async () => {
    if (!session?.user?.email) return;
    
    setStripeTestLoading(true);
    setStripeTestResult(null);
    setMessage(null);

    try {
      const response = await fetch(`/app/api/admin/stripe/test?userEmail=${encodeURIComponent(session.user.email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: settings.stripeMode
        })
      });

      const data = await response.json();
      setStripeTestResult(data);

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.error || 'Connection test failed' });
      }
    } catch (error) {
      setStripeTestResult({
        success: false,
        message: 'Network error during connection test'
      });
      setMessage({ type: 'error', text: 'Failed to test connection. Please try again.' });
    } finally {
      setStripeTestLoading(false);
    }
  };

  const testEmailConfiguration = async () => {
    if (!session?.user?.email) return;
    
    setEmailTestLoading(true);
    setEmailTestResult(null);
    setMessage(null);

    try {
      const response = await fetch(`/app/api/admin/email/test?userEmail=${encodeURIComponent(session.user.email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      setEmailTestResult(data);

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.error || 'Email test failed' });
      }
    } catch (error) {
      setEmailTestResult({
        success: false,
        message: 'Network error during email test'
      });
      setMessage({ type: 'error', text: 'Failed to test email. Please try again.' });
    } finally {
      setEmailTestLoading(false);
    }
  };

  // Backup Management Functions
  const fetchBackupHistory = async () => {
    if (!session?.user?.email) return;
    
    try {
      const response = await fetch(`/app/api/admin/backup?userEmail=${encodeURIComponent(session.user.email)}`);
      if (response.ok) {
        const data = await response.json();
        setBackupHistory(data.backups || []);
      }
    } catch (error) {
      console.error('Error fetching backup history:', error);
    }
  };

  const handleCreateBackup = async () => {
    if (!session?.user?.email) return;
    
    setBackupLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/app/api/admin/backup?userEmail=${encodeURIComponent(session.user.email)}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: `Backup created successfully: ${data.backup?.filename}` });
        fetchBackupHistory(); // Refresh the backup list
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create backup' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create backup. Please try again.' });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!session?.user?.email) return;
    if (!confirm(`Are you sure you want to delete backup: ${filename}?`)) return;

    try {
      const response = await fetch(
        `/app/api/admin/backup?userEmail=${encodeURIComponent(session.user.email)}&filename=${encodeURIComponent(filename)}`,
        { method: 'DELETE' }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: `Backup deleted successfully` });
        fetchBackupHistory(); // Refresh the backup list
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete backup' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete backup. Please try again.' });
    }
  };

  const handleCleanupOldBackups = async () => {
    if (!session?.user?.email) return;
    if (!confirm('Are you sure you want to delete backups older than 30 days?')) return;

    try {
      const response = await fetch(
        `/app/api/admin/backup?userEmail=${encodeURIComponent(session.user.email)}&olderThan=30`,
        { method: 'DELETE' }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: `Cleanup completed: ${data.deletedCount} old backups deleted` });
        fetchBackupHistory(); // Refresh the backup list
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to cleanup old backups' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cleanup old backups. Please try again.' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadBackup = async (filename: string) => {
    if (!session?.user?.email) return;

    try {
      const downloadUrl = `/app/api/admin/backup/download?userEmail=${encodeURIComponent(session.user.email)}&filename=${encodeURIComponent(filename)}`;
      
      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage({ type: 'success', text: `Downloading backup: ${filename}` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to download backup. Please try again.' });
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

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'email', label: 'Email', icon: '📧' },
    { id: 'stripe', label: 'Stripe', icon: '💳' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'backup', label: 'Backup', icon: '💾' },
  ];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">System Settings</h1>
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
        {/* Tab Navigation */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          marginBottom: '20px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e9ecef'
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '16px 24px',
                  border: 'none',
                  backgroundColor: activeTab === tab.id ? '#f8f9fa' : 'transparent',
                  borderBottom: activeTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  color: activeTab === tab.id ? '#007bff' : '#666'
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '20px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message.text}
          </div>
        )}

        {/* Settings Content */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '32px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div>
              <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>General Settings</h2>
              
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => handleInputChange('siteName', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Default Timezone
                  </label>
                  <select
                    value={settings.defaultTimezone}
                    onChange={(e) => handleInputChange('defaultTimezone', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.registrationEnabled}
                      onChange={(e) => handleInputChange('registrationEnabled', e.target.checked)}
                    />
                    <span>Allow new user registration</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.maintenanceMode}
                      onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                    />
                    <span style={{ color: settings.maintenanceMode ? '#dc3545' : 'inherit' }}>
                      Maintenance Mode {settings.maintenanceMode && '(Site will be unavailable to users)'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Email Settings Tab */}
          {activeTab === 'email' && (
            <div>
              <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>Email Configuration</h2>
              
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Email Provider
                  </label>
                  <select
                    value={settings.emailProvider}
                    onChange={(e) => handleInputChange('emailProvider', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="smtp">SMTP</option>
                    <option value="sendgrid">SendGrid</option>
                    <option value="mailgun">Mailgun</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={settings.smtpHost}
                      onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                      placeholder="smtp.gmail.com"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Port
                    </label>
                    <input
                      type="text"
                      value={settings.smtpPort}
                      onChange={(e) => handleInputChange('smtpPort', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={settings.smtpUsername}
                    onChange={(e) => handleInputChange('smtpUsername', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={settings.smtpPassword}
                    onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      From Email
                    </label>
                    <input
                      type="email"
                      value={settings.fromEmail}
                      onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                      placeholder="noreply@yoursite.com"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      From Name
                    </label>
                    <input
                      type="text"
                      value={settings.fromName}
                      onChange={(e) => handleInputChange('fromName', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '16px',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6'
                }}>
                  <button
                    onClick={testEmailConfiguration}
                    disabled={emailTestLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: emailTestLoading ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: emailTestLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: emailTestLoading ? 0.6 : 1
                    }}
                  >
                    {emailTestLoading ? '📧 Sending...' : '📧 Send Test Email'}
                  </button>
                  <span style={{ marginLeft: '12px', fontSize: '14px', color: '#666' }}>
                    Send a test email to verify configuration
                  </span>
                  
                  {emailTestResult && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      borderRadius: '4px',
                      backgroundColor: emailTestResult.success ? '#d4edda' : '#f8d7da',
                      border: `1px solid ${emailTestResult.success ? '#c3e6cb' : '#f5c6cb'}`,
                      color: emailTestResult.success ? '#155724' : '#721c24'
                    }}>
                      <strong>{emailTestResult.success ? '✅ Success!' : '❌ Failed'}</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
                        {emailTestResult.message}
                      </p>
                      {emailTestResult.details && (
                        <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
                          <strong>Details:</strong> {emailTestResult.details.provider?.toUpperCase()} via {emailTestResult.details.host}:{emailTestResult.details.port}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stripe Settings Tab */}
          {activeTab === 'stripe' && (
            <div>
              <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>Stripe Configuration</h2>
              
              <div style={{ display: 'grid', gap: '24px' }}>
                {/* Environment Selection */}
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6'
                }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Environment</h3>
                  
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      cursor: 'pointer',
                      padding: '12px 16px',
                      border: '2px solid',
                      borderColor: settings.stripeMode === 'sandbox' ? '#007bff' : '#dee2e6',
                      borderRadius: '8px',
                      backgroundColor: settings.stripeMode === 'sandbox' ? '#e7f3ff' : 'white'
                    }}>
                      <input
                        type="radio"
                        name="stripeMode"
                        value="sandbox"
                        checked={settings.stripeMode === 'sandbox'}
                        onChange={(e) => handleInputChange('stripeMode', e.target.value)}
                      />
                      <div>
                        <div style={{ fontWeight: '600' }}>🧪 Sandbox Mode</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>For testing and development</div>
                      </div>
                    </label>

                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      cursor: 'pointer',
                      padding: '12px 16px',
                      border: '2px solid',
                      borderColor: settings.stripeMode === 'live' ? '#28a745' : '#dee2e6',
                      borderRadius: '8px',
                      backgroundColor: settings.stripeMode === 'live' ? '#e8f5e8' : 'white'
                    }}>
                      <input
                        type="radio"
                        name="stripeMode"
                        value="live"
                        checked={settings.stripeMode === 'live'}
                        onChange={(e) => handleInputChange('stripeMode', e.target.value)}
                      />
                      <div>
                        <div style={{ fontWeight: '600' }}>🚀 Live Mode</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>For production environment</div>
                      </div>
                    </label>
                  </div>

                  {settings.stripeMode === 'live' && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffeeba',
                      borderRadius: '4px',
                      fontSize: '14px',
                      color: '#856404'
                    }}>
                      ⚠️ <strong>Warning:</strong> Live mode will process real payments. Ensure your keys are correct.
                    </div>
                  )}
                </div>

                {/* Sandbox Keys */}
                <div style={{
                  opacity: settings.stripeMode === 'sandbox' ? 1 : 0.6,
                  pointerEvents: settings.stripeMode === 'sandbox' ? 'auto' : 'none'
                }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
                    🧪 Sandbox Keys
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Publishable Key (Test)
                      </label>
                      <input
                        type="text"
                        value={settings.stripeSandboxPublishableKey}
                        onChange={(e) => handleInputChange('stripeSandboxPublishableKey', e.target.value)}
                        placeholder="pk_test_..."
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Used in your frontend code (safe to expose publicly)
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Secret Key (Test)
                      </label>
                      <input
                        type="password"
                        value={settings.stripeSandboxSecretKey}
                        onChange={(e) => handleInputChange('stripeSandboxSecretKey', e.target.value)}
                        placeholder="sk_test_..."
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Used in your backend code (keep this secure)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Keys */}
                <div style={{
                  opacity: settings.stripeMode === 'live' ? 1 : 0.6,
                  pointerEvents: settings.stripeMode === 'live' ? 'auto' : 'none'
                }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
                    🚀 Live Keys
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Publishable Key (Live)
                      </label>
                      <input
                        type="text"
                        value={settings.stripeLivePublishableKey}
                        onChange={(e) => handleInputChange('stripeLivePublishableKey', e.target.value)}
                        placeholder="pk_live_..."
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Used in your frontend code (safe to expose publicly)
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Secret Key (Live)
                      </label>
                      <input
                        type="password"
                        value={settings.stripeLiveSecretKey}
                        onChange={(e) => handleInputChange('stripeLiveSecretKey', e.target.value)}
                        placeholder="sk_live_..."
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Used in your backend code (keep this secure)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Webhook Configuration */}
                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
                    🔗 Webhook Configuration
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Webhook Endpoint Secret
                      </label>
                      <input
                        type="password"
                        value={settings.stripeWebhookSecret}
                        onChange={(e) => handleInputChange('stripeWebhookSecret', e.target.value)}
                        placeholder="whsec_..."
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Used to verify webhook authenticity
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: '#e8f4fd',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #bee5eb'
                    }}>
                      <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#0c5460' }}>
                        📋 Webhook Endpoint URL
                      </h4>
                      <code style={{
                        display: 'block',
                        padding: '8px',
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '12px',
                        wordBreak: 'break-all'
                      }}>
                        {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/app/api/webhooks/stripe
                      </code>
                      <div style={{ fontSize: '12px', color: '#0c5460', marginTop: '8px' }}>
                        Configure this URL in your Stripe Dashboard → Webhooks
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test Connection */}
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6'
                }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🔧 Connection Test
                  </h3>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <button
                      onClick={testStripeConnection}
                      disabled={stripeTestLoading}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: stripeTestLoading ? '#6c757d' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: stripeTestLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {stripeTestLoading ? '🔄 Testing...' : '🧪 Test Connection'}
                    </button>
                    <span style={{ marginLeft: '12px', fontSize: '14px', color: '#666' }}>
                      Verify your {settings.stripeMode === 'live' ? 'live' : 'sandbox'} API keys are working correctly
                    </span>
                  </div>

                  {/* Test Results */}
                  {stripeTestResult && (
                    <div style={{
                      marginTop: '16px',
                      padding: '16px',
                      borderRadius: '6px',
                      backgroundColor: stripeTestResult.success ? '#d4edda' : '#f8d7da',
                      border: `1px solid ${stripeTestResult.success ? '#c3e6cb' : '#f5c6cb'}`,
                      color: stripeTestResult.success ? '#155724' : '#721c24'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {stripeTestResult.success ? '✅ Success' : '❌ Failed'}
                      </div>
                      <div style={{ marginBottom: stripeTestResult.accountInfo ? '12px' : '0' }}>
                        {stripeTestResult.message}
                      </div>
                      
                      {stripeTestResult.success && stripeTestResult.accountInfo && (
                        <div style={{ 
                          backgroundColor: 'rgba(255,255,255,0.8)', 
                          padding: '12px', 
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}>
                          <strong>Account Information:</strong>
                          <ul style={{ margin: '8px 0 0 20px', paddingLeft: '0' }}>
                            <li><strong>Account ID:</strong> {stripeTestResult.accountInfo.id}</li>
                            <li><strong>Country:</strong> {stripeTestResult.accountInfo.country}</li>
                            <li><strong>Email:</strong> {stripeTestResult.accountInfo.email || 'N/A'}</li>
                            <li><strong>Business Name:</strong> {stripeTestResult.accountInfo.businessName}</li>
                            <li><strong>Charges Enabled:</strong> {stripeTestResult.accountInfo.chargesEnabled ? 'Yes' : 'No'}</li>
                            <li><strong>Payouts Enabled:</strong> {stripeTestResult.accountInfo.payoutsEnabled ? 'Yes' : 'No'}</li>
                            <li><strong>Details Submitted:</strong> {stripeTestResult.accountInfo.detailsSubmitted ? 'Yes' : 'No'}</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Settings Tab */}
          {activeTab === 'security' && (
            <div>
              <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>Security Settings</h2>
              
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.requireEmailVerification}
                      onChange={(e) => handleInputChange('requireEmailVerification', e.target.checked)}
                    />
                    <span>Require email verification for new accounts</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Minimum Password Length
                    </label>
                    <input
                      type="number"
                      min="6"
                      max="50"
                      value={settings.passwordMinLength}
                      onChange={(e) => handleInputChange('passwordMinLength', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={settings.sessionTimeout}
                      onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.requireSpecialCharacters}
                      onChange={(e) => handleInputChange('requireSpecialCharacters', e.target.checked)}
                    />
                    <span>Require special characters in passwords</span>
                  </label>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Maximum Login Attempts
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value))}
                    style={{
                      width: '200px',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    Account will be locked after this many failed attempts
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backup Settings Tab */}
          {activeTab === 'backup' && (
            <div>
              <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>Backup Management</h2>
              
              <div style={{ display: 'grid', gap: '24px' }}>
                {/* Configuration Section */}
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6'
                }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Configuration</h3>
                  
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={settings.autoBackupEnabled}
                          onChange={(e) => handleInputChange('autoBackupEnabled', e.target.checked)}
                        />
                        <span>Enable automatic backups</span>
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Backup Frequency
                        </label>
                        <select
                          value={settings.backupFrequency}
                          onChange={(e) => handleInputChange('backupFrequency', e.target.value)}
                          disabled={!settings.autoBackupEnabled}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            opacity: settings.autoBackupEnabled ? 1 : 0.5
                          }}
                        >
                          <option value="hourly">Every Hour</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Retention (days)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={settings.backupRetentionDays}
                          onChange={(e) => handleInputChange('backupRetentionDays', parseInt(e.target.value))}
                          disabled={!settings.autoBackupEnabled}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            opacity: settings.autoBackupEnabled ? 1 : 0.5
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manual Backup Section */}
                <div style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6'
                }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Manual Backup</h3>
                  
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <button
                      onClick={handleCreateBackup}
                      disabled={backupLoading}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: backupLoading ? '#6c757d' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: backupLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {backupLoading ? 'Creating Backup...' : '💾 Create Backup Now'}
                    </button>
                    
                    <button
                      onClick={handleCleanupOldBackups}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      🗑️ Cleanup Old Backups
                    </button>
                  </div>

                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Manual backups are created immediately and saved to the backup directory.
                  </div>
                </div>

                {/* Backup History Section */}
                <div style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6'
                }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
                    Backup History ({backupHistory.length} backups)
                  </h3>

                  {backupHistory.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      color: '#666',
                      padding: '40px 20px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px'
                    }}>
                      No backups found. Create your first backup above.
                    </div>
                  ) : (
                    <div style={{
                      maxHeight: '300px',
                      overflowY: 'auto',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8f9fa' }}>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '14px', fontWeight: '600' }}>
                              Filename
                            </th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '14px', fontWeight: '600' }}>
                              Size
                            </th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '14px', fontWeight: '600' }}>
                              Created
                            </th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '14px', fontWeight: '600' }}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {backupHistory.map((backup, index) => (
                                                         <tr key={backup.filename} style={{ borderBottom: index < backupHistory.length - 1 ? '1px solid #dee2e6' : 'none' }}>
                               <td style={{ padding: '12px', fontSize: '14px' }}>
                                 <button
                                   onClick={() => handleDownloadBackup(backup.filename)}
                                   style={{
                                     background: 'none',
                                     border: 'none',
                                     color: '#007bff',
                                     textDecoration: 'underline',
                                     cursor: 'pointer',
                                     fontSize: '14px',
                                     padding: '0',
                                     fontFamily: 'inherit'
                                   }}
                                   onMouseOver={(e) => (e.target as HTMLButtonElement).style.color = '#0056b3'}
                                   onMouseOut={(e) => (e.target as HTMLButtonElement).style.color = '#007bff'}
                                   title={`Click to download ${backup.filename}`}
                                 >
                                   📥 {backup.filename}
                                 </button>
                               </td>
                              <td style={{ padding: '12px', fontSize: '14px' }}>
                                {formatFileSize(backup.size)}
                              </td>
                              <td style={{ padding: '12px', fontSize: '14px' }}>
                                {new Date(backup.created).toLocaleString()}
                              </td>
                              <td style={{ padding: '12px' }}>
                                <button
                                  onClick={() => handleDeleteBackup(backup.filename)}
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div style={{ 
            marginTop: '32px', 
            paddingTop: '24px', 
            borderTop: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 24px',
                backgroundColor: saving ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 