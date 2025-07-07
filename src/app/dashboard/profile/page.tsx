'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
  insuranceCompany: string;
  insuranceAddress1: string;
  insuranceAddress2: string;
  insuranceCity: string;
  insuranceState: string;
  insuranceZipCode: string;
  agentName: string;
  agentPhone: string;
  policyNumber: string;
  claimNumber: string;
  maxCoverage: string;
  insuranceNotes: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    insuranceCompany: '',
    insuranceAddress1: '',
    insuranceAddress2: '',
    insuranceCity: '',
    insuranceState: '',
    insuranceZipCode: '',
    agentName: '',
    agentPhone: '',
    policyNumber: '',
    claimNumber: '',
    maxCoverage: '',
    insuranceNotes: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'personal' | 'insurance'>('personal');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login');
      return;
    }

    // Pre-fill with session data
    setProfileData(prev => ({
      ...prev,
      name: session.user?.name || '',
      email: session.user?.email || '',
    }));

    // TODO: Fetch existing profile data from API
    fetchProfileData();
  }, [session, status, router]);

  const fetchProfileData = async () => {
    try {
      if (session?.user?.email) {
        const response = await fetch(`/app/api/user/profile?email=${encodeURIComponent(session.user.email)}`);
        if (response.ok) {
          const data = await response.json();
          setProfileData(prev => ({ ...prev, ...data }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/app/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        setMessage('Profile updated successfully!');
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      setMessage('An error occurred while updating your profile');
    } finally {
      setLoading(false);
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

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="nav-link">
            <svg className="tool-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"></path>
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="dashboard-title">Profile Settings</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="profile-container">
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              <svg className="tab-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
              </svg>
              Personal Information
            </button>
            <button
              className={`tab-button ${activeTab === 'insurance' ? 'active' : ''}`}
              onClick={() => setActiveTab('insurance')}
            >
              <svg className="tab-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd"></path>
              </svg>
              Insurance Details
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="profile-form">
            {message && (
              <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div className="tab-content">
                <h2 className="section-title">Personal Information</h2>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="name">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={profileData.name}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="email">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                      readOnly
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phone">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <h3 className="subsection-title">Home Address</h3>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="address1">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    id="address1"
                    name="address1"
                    value={profileData.address1}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="address2">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    id="address2"
                    name="address2"
                    value={profileData.address2}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Apartment, suite, unit, building, floor, etc."
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="city">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={profileData.city}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="state">
                      State
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={profileData.state}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="CA"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="zipCode">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={profileData.zipCode}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="12345"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Insurance Details Tab */}
            {activeTab === 'insurance' && (
              <div className="tab-content">
                <h2 className="section-title">Insurance Information</h2>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="insuranceCompany">
                    Insurance Company
                  </label>
                  <input
                    type="text"
                    id="insuranceCompany"
                    name="insuranceCompany"
                    value={profileData.insuranceCompany}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="State Farm, Allstate, etc."
                  />
                </div>

                <h3 className="subsection-title">Insurance Company Address</h3>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="insuranceAddress1">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    id="insuranceAddress1"
                    name="insuranceAddress1"
                    value={profileData.insuranceAddress1}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="insuranceAddress2">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    id="insuranceAddress2"
                    name="insuranceAddress2"
                    value={profileData.insuranceAddress2}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="insuranceCity">
                      City
                    </label>
                    <input
                      type="text"
                      id="insuranceCity"
                      name="insuranceCity"
                      value={profileData.insuranceCity}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="insuranceState">
                      State
                    </label>
                    <input
                      type="text"
                      id="insuranceState"
                      name="insuranceState"
                      value={profileData.insuranceState}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="insuranceZipCode">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      id="insuranceZipCode"
                      name="insuranceZipCode"
                      value={profileData.insuranceZipCode}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <h3 className="subsection-title">Agent & Policy Details</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="agentName">
                      Agent Name
                    </label>
                    <input
                      type="text"
                      id="agentName"
                      name="agentName"
                      value={profileData.agentName}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="agentPhone">
                      Agent Phone
                    </label>
                    <input
                      type="tel"
                      id="agentPhone"
                      name="agentPhone"
                      value={profileData.agentPhone}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="policyNumber">
                      Policy Number
                    </label>
                    <input
                      type="text"
                      id="policyNumber"
                      name="policyNumber"
                      value={profileData.policyNumber}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="claimNumber">
                      Claim Number
                    </label>
                    <input
                      type="text"
                      id="claimNumber"
                      name="claimNumber"
                      value={profileData.claimNumber}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="maxCoverage">
                    Maximum Coverage Amount
                  </label>
                  <input
                    type="text"
                    id="maxCoverage"
                    name="maxCoverage"
                    value={profileData.maxCoverage}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="$500,000"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="insuranceNotes">
                    Additional Notes
                  </label>
                  <textarea
                    id="insuranceNotes"
                    name="insuranceNotes"
                    value={profileData.insuranceNotes}
                    onChange={handleInputChange}
                    className="form-textarea"
                    rows={4}
                    placeholder="Any additional insurance information or special instructions..."
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 