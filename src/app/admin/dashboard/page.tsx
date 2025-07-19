'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AdminStats {
  totalUsers: number;
  totalSubscriptions: number;
  totalPlans: number;
  totalRevenue: number;
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalSubscriptions: 0,
    totalPlans: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!session?.user?.email) return;
    
    try {
      const response = await fetch(`/app/api/admin/stats?userEmail=${encodeURIComponent(session.user.email)}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to fetch admin stats');
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/app/auth/login');
      return;
    }

    // Check if user is admin
    const userRole = (session.user as any)?.role;
    if (userRole !== 'ADMIN') {
      router.push('/dashboard'); // Redirect non-admins to regular dashboard
      return;
    }

    // Fetch stats if user is admin
    fetchStats();
  }, [session, status, router]);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/app/auth/login' });
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

  const userInitials = session.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'A';

  return (
    <div className="dashboard-container">
      {/* Header with Admin Badge */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Admin Dashboard</h1>
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
          <span>Welcome, {session.user?.name || 'Admin'}</span>
          <Link href="/dashboard/profile" className="user-avatar-link">
            <div className="user-avatar">{userInitials}</div>
          </Link>
          <button className="btn btn-outlined" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Stats Overview */}
        <section className="stats-grid">
          <div className="stat-card houses">
            <svg className="stat-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
            </svg>
            <div className="stat-number">
              {loading ? '...' : stats.totalUsers.toLocaleString()}
            </div>
            <div className="stat-label">Total Users</div>
          </div>

          <div className="stat-card rooms">
            <svg className="stat-icon" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z"></path>
            </svg>
            <div className="stat-number">
              {loading ? '...' : stats.totalSubscriptions.toLocaleString()}
            </div>
            <div className="stat-label">Active Subscriptions</div>
          </div>

          <div className="stat-card items">
            <svg className="stat-icon" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"></path>
            </svg>
            <div className="stat-number">
              {loading ? '...' : stats.totalPlans.toLocaleString()}
            </div>
            <div className="stat-label">Subscription Plans</div>
          </div>

          <div className="stat-card value">
            <svg className="stat-icon" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"></path>
            </svg>
            <div className="stat-number">
              {loading ? '...' : (stats.totalRevenue / 100).toLocaleString('en-US', { 
                style: 'currency', 
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
            <div className="stat-label">Monthly Revenue</div>
          </div>
        </section>

        {/* Admin Actions */}
        <section className="quick-actions">
          <h2 className="section-title">Administration</h2>
          <div className="actions-grid">
            <Link href="/admin/subscription-plans" className="action-card">
              <svg className="action-icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"></path>
              </svg>
              <div className="action-title">Subscription Plans</div>
              <div className="action-description">
                Configure subscription plans, pricing, and usage limits.
              </div>
            </Link>

            <Link href="/admin/users" className="action-card">
              <svg className="action-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
              </svg>
              <div className="action-title">User Management</div>
              <div className="action-description">
                View and manage user accounts and subscriptions.
              </div>
            </Link>

            <Link href="/admin/settings" className="action-card">
              <svg className="action-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"></path>
              </svg>
              <div className="action-title">System Settings</div>
              <div className="action-description">
                Configure application settings and integrations.
              </div>
            </Link>

            {/* FAQ Management Action Card */}
            <Link href="/admin/faq" className="action-card">
              <svg className="action-icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 10c0 3.866-3.582 7-8 7s-8-3.134-8-7 3.582-7 8-7 8 3.134 8 7zm-8 5c3.314 0 6-2.239 6-5s-2.686-5-6-5-6 2.239-6 5 2.686 5 6 5zm-1-4h2v2h-2v-2zm0-6h2v4h-2V5z" />
              </svg>
              <div className="action-title">FAQ Management</div>
              <div className="action-description">
                Add, edit, and organize Frequently Asked Questions for users.
              </div>
            </Link>

            <Link href="/admin/reports" className="action-card">
              <svg className="action-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
              <div className="action-title">Analytics & Reports</div>
              <div className="action-description">
                View system analytics, usage reports, and metrics.
              </div>
            </Link>
          </div>
        </section>

        {/* Tools & Utilities */}
        <section>
          <h2 className="section-title">System Tools</h2>
          <div className="tools-grid">
            <Link href="/admin/logs" className="tool-card">
              <svg className="tool-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path>
              </svg>
              <div className="tool-title">System Logs</div>
            </Link>

            <Link href="/admin/backups" className="tool-card">
              <svg className="tool-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
              <div className="tool-title">Database Backups</div>
            </Link>

            <Link href="/admin/maintenance" className="tool-card">
              <svg className="tool-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"></path>
              </svg>
              <div className="tool-title">Maintenance</div>
            </Link>

            <Link href="/dashboard" className="tool-card">
              <svg className="tool-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path>
              </svg>
              <div className="tool-title">User View</div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
} 