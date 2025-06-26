'use client';

import { useState } from 'react';
import Breadcrumb from '@/components/Breadcrumb';

interface HelpSection {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState<string>('getting-started');

  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: '🚀',
      content: (
        <div className="help-content">
          <h3>Welcome to HomeContentsListPro V2!</h3>
          <p>Your comprehensive home inventory management solution. Here's how to get started:</p>
          
          <div className="step-list">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Add Your First House</h4>
                <p>Navigate to Houses and click "Add New House" to create your first property entry.</p>
              </div>
            </div>
            
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Create Rooms</h4>
                <p>Inside your house, add rooms like "Living Room", "Kitchen", "Master Bedroom", etc.</p>
              </div>
            </div>
            
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Add Items</h4>
                <p>Start cataloging your belongings in each room with details like brand, model, and value.</p>
              </div>
            </div>
            
            <div className="step-item">
              <div className="step-number">4</div>
              <div className="step-content">
                <h4>Generate Reports</h4>
                <p>Use the Reports section to view analytics and export data for insurance purposes.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'managing-houses',
      title: 'Managing Houses',
      icon: '🏠',
      content: (
        <div className="help-content">
          <h3>House Management</h3>
          <p>Learn how to effectively manage your properties:</p>
          
          <div className="help-subsection">
            <h4>Adding a House</h4>
            <ul>
              <li>Click "Add New House" from the Houses page</li>
              <li>Fill in the address details (required)</li>
              <li>Add a custom name (optional) like "Main House" or "Vacation Home"</li>
              <li>Include any additional notes about the property</li>
            </ul>
          </div>
          
          <div className="help-subsection">
            <h4>Editing House Information</h4>
            <ul>
              <li>Click the "Edit" button on any house card</li>
              <li>Update address, name, or notes as needed</li>
              <li>Changes are saved automatically</li>
            </ul>
          </div>
          
          <div className="help-subsection">
            <h4>House Statistics</h4>
            <p>Each house displays:</p>
            <ul>
              <li>Total number of rooms</li>
              <li>Total number of items</li>
              <li>Combined value of all items</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'organizing-rooms',
      title: 'Organizing Rooms',
      icon: '🚪',
      content: (
        <div className="help-content">
          <h3>Room Organization</h3>
          <p>Best practices for organizing your rooms:</p>
          
          <div className="help-subsection">
            <h4>Room Naming Conventions</h4>
            <ul>
              <li>Use descriptive names: "Master Bedroom", "Guest Bathroom", "Kitchen"</li>
              <li>Be consistent across properties</li>
              <li>Consider numbering similar rooms: "Bedroom 1", "Bedroom 2"</li>
            </ul>
          </div>
          
          <div className="help-subsection">
            <h4>Adding Room Notes</h4>
            <ul>
              <li>Include details like room size or special features</li>
              <li>Note any renovation dates or important details</li>
              <li>Add location context: "Upstairs front room"</li>
            </ul>
          </div>
          
          <div className="help-subsection">
            <h4>Room Management Tips</h4>
            <ul>
              <li>Start with major rooms first (kitchen, living room, bedrooms)</li>
              <li>Consider creating separate entries for large areas</li>
              <li>Use the room statistics to track inventory progress</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'cataloging-items',
      title: 'Cataloging Items',
      icon: '📦',
      content: (
        <div className="help-content">
          <h3>Item Cataloging</h3>
          <p>How to effectively catalog your belongings:</p>
          
          <div className="help-subsection">
            <h4>Essential Item Information</h4>
            <ul>
              <li><strong>Name:</strong> Clear, descriptive item name</li>
              <li><strong>Category:</strong> Select from predefined categories</li>
              <li><strong>Brand & Model:</strong> For warranty and insurance purposes</li>
              <li><strong>Serial Number:</strong> Critical for electronics and appliances</li>
              <li><strong>Purchase Price:</strong> Original or estimated current value</li>
            </ul>
          </div>
          
          <div className="help-subsection">
            <h4>Item Categories</h4>
            <p>Available categories include:</p>
            <div className="category-grid">
              <span>Electronics</span>
              <span>Furniture</span>
              <span>Appliances</span>
              <span>Jewelry</span>
              <span>Art & Decor</span>
              <span>Clothing</span>
              <span>Books</span>
              <span>Collectibles</span>
              <span>Tools</span>
              <span>And more...</span>
            </div>
          </div>
          
          <div className="help-subsection">
            <h4>Item Condition Ratings</h4>
            <ul>
              <li><strong>Excellent:</strong> Like new condition</li>
              <li><strong>Above Average:</strong> Minor signs of use</li>
              <li><strong>Good:</strong> Normal wear and tear</li>
              <li><strong>Fair:</strong> Noticeable wear but functional</li>
              <li><strong>Poor:</strong> Significant wear or damage</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'reports-analytics',
      title: 'Reports & Analytics',
      icon: '📊',
      content: (
        <div className="help-content">
          <h3>Reports & Analytics</h3>
          <p>Understanding your inventory data:</p>
          
          <div className="help-subsection">
            <h4>Available Report Types</h4>
            <ul>
              <li><strong>Overview:</strong> High-level statistics across all properties</li>
              <li><strong>Categories:</strong> Value breakdown by item categories</li>
              <li><strong>Room-by-Room:</strong> Detailed analysis of each room</li>
              <li><strong>House Summary:</strong> Property-level statistics</li>
            </ul>
          </div>
          
          <div className="help-subsection">
            <h4>Filtering Options</h4>
            <ul>
              <li>View all houses or filter by specific property</li>
              <li>Switch between different report types</li>
              <li>Real-time data updates</li>
            </ul>
          </div>
          
          <div className="help-subsection">
            <h4>Using Reports for Insurance</h4>
            <ul>
              <li>Generate comprehensive inventory lists</li>
              <li>Export data in multiple formats</li>
              <li>Track total coverage needed</li>
              <li>Maintain detailed records for claims</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'import-export',
      title: 'Import & Export',
      icon: '📁',
      content: (
        <div className="help-content">
          <h3>Data Import & Export</h3>
          <p>Managing your data with import and export features:</p>
          
          <div className="help-subsection">
            <h4>Exporting Data</h4>
            <ul>
              <li><strong>Formats:</strong> CSV, JSON, and Excel</li>
              <li><strong>Scope Options:</strong> All data, specific house, or category</li>
              <li><strong>Customization:</strong> Include/exclude statistics and images</li>
            </ul>
          </div>
          
          <div className="help-subsection">
            <h4>Importing Data</h4>
            <ul>
              <li><strong>Supported Formats:</strong> CSV and JSON files</li>
              <li><strong>Preview Feature:</strong> Review data before importing</li>
              <li><strong>Conflict Resolution:</strong> Handle duplicates and missing data</li>
              <li><strong>Validation:</strong> Automatic error detection and warnings</li>
            </ul>
          </div>
          
          <div className="help-subsection">
            <h4>Best Practices</h4>
            <ul>
              <li>Export your data regularly as backup</li>
              <li>Use consistent naming conventions</li>
              <li>Preview imports before committing changes</li>
              <li>Test with small files first</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'account-settings',
      title: 'Account & Settings',
      icon: '⚙️',
      content: (
        <div className="help-content">
          <h3>Account Management</h3>
          <p>Managing your account and preferences:</p>
          
          <div className="help-subsection">
            <h4>Profile Settings</h4>
            <ul>
              <li>Update your name and contact information</li>
              <li>Change your email address</li>
              <li>Manage password and security settings</li>
            </ul>
          </div>
          
          <div className="help-subsection">
            <h4>Data Security</h4>
            <ul>
              <li>All data is encrypted and securely stored</li>
              <li>Regular automated backups</li>
              <li>Access controls and authentication</li>
              <li>Privacy protection measures</li>
            </ul>
          </div>
          
          <div className="help-subsection">
            <h4>Account Features</h4>
            <ul>
              <li>Unlimited houses and rooms</li>
              <li>Unlimited item cataloging</li>
              <li>Full export capabilities</li>
              <li>Comprehensive reporting</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: '🔧',
      content: (
        <div className="help-content">
          <h3>Common Issues & Solutions</h3>
          <p>Quick fixes for common problems:</p>
          
          <div className="help-subsection">
            <h4>Import/Export Issues</h4>
            <div className="faq-item">
              <h5>Q: My CSV file won't import</h5>
              <p>A: Ensure your CSV has the required columns: "Item Name", "Room Name", and either "House Name" or "House Address". Check that the file is under 10MB.</p>
            </div>
            
            <div className="faq-item">
              <h5>Q: Export is missing data</h5>
              <p>A: Verify your filter settings and scope selection. Make sure you have the necessary permissions for the data you're trying to export.</p>
            </div>
          </div>
          
          <div className="help-subsection">
            <h4>Performance Issues</h4>
            <div className="faq-item">
              <h5>Q: Pages are loading slowly</h5>
              <p>A: This may occur with very large inventories. Try filtering your view or refreshing the page. Contact support if issues persist.</p>
            </div>
          </div>
          
          <div className="help-subsection">
            <h4>Data Issues</h4>
            <div className="faq-item">
              <h5>Q: I can't find an item I added</h5>
              <p>A: Check that you're viewing the correct house and room. Use the search feature on the Items page to search across all locations.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'contact-support',
      title: 'Contact & Support',
      icon: '💬',
      content: (
        <div className="help-content">
          <h3>Get Support</h3>
          <p>Need additional help? Here's how to reach us:</p>
          
          <div className="contact-options">
            <div className="contact-card">
              <div className="contact-icon">📧</div>
              <h4>Email Support</h4>
              <p>support@homecontentslist.com</p>
              <p className="contact-note">Response within 24 hours</p>
            </div>
            
            <div className="contact-card">
              <div className="contact-icon">📖</div>
              <h4>Documentation</h4>
              <p>Comprehensive guides and tutorials</p>
              <p className="contact-note">Updated regularly</p>
            </div>
            
            <div className="contact-card">
              <div className="contact-icon">🎥</div>
              <h4>Video Tutorials</h4>
              <p>Step-by-step video guides</p>
              <p className="contact-note">Coming soon</p>
            </div>
          </div>
          
          <div className="help-subsection">
            <h4>Before Contacting Support</h4>
            <ul>
              <li>Check this help section for answers</li>
              <li>Try refreshing the page or logging out and back in</li>
              <li>Note any error messages you're seeing</li>
              <li>Describe the steps you took before the issue occurred</li>
            </ul>
          </div>
          
          <div className="help-subsection">
            <h4>Feature Requests</h4>
            <p>Have an idea for improving HomeContentsListPro? We'd love to hear from you! Send your suggestions to <strong>feedback@homecontentslist.com</strong></p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        <Breadcrumb items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Help & Support' }
        ]} />

        <div className="help-header">
          <div>
            <h1 className="page-title">Help & Support</h1>
            <p className="page-subtitle">Find answers and learn how to make the most of HomeContentsListPro</p>
          </div>
        </div>

        <div className="help-layout">
          <div className="help-sidebar">
            <nav className="help-nav">
              {helpSections.map((section) => (
                <button
                  key={section.id}
                  className={`help-nav-item ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className="nav-icon">{section.icon}</span>
                  <span className="nav-text">{section.title}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="help-main">
            <div className="help-section">
              {helpSections.find(section => section.id === activeSection)?.content}
            </div>
          </div>
        </div>

        <div className="help-footer">
          <div className="help-footer-content">
            <h3>Still need help?</h3>
            <p>Can't find what you're looking for? Our support team is here to help.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setActiveSection('contact-support')}
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 