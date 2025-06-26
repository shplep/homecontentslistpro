import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="home-container">
      <div className="home-content">
        <div className="home-hero">
          <div className="hero-text">
            <h1 className="hero-title">HomeContentsListPro</h1>
            <p className="hero-subtitle">
              Document your home contents for insurance purposes with ease and confidence
            </p>
            <div className="hero-buttons">
              <Link href="/auth/register" className="btn btn-primary">
                Get Started
              </Link>
              <Link href="/auth/login" className="btn btn-outlined">
                Sign In
              </Link>
            </div>
          </div>
          <div className="hero-features">
            <div className="feature-card">
              <svg className="feature-icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              <h3 className="feature-title">Multiple Properties</h3>
              <p className="feature-description">Manage multiple houses and properties in one place</p>
            </div>
            <div className="feature-card">
              <svg className="feature-icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3h2v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 112 0v1h1a1 1 0 110 2H9a1 1 0 01-1-1V9z" clipRule="evenodd"></path>
              </svg>
              <h3 className="feature-title">Insurance Ready</h3>
              <p className="feature-description">Generate reports formatted for insurance companies</p>
            </div>
            <div className="feature-card">
              <svg className="feature-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
              <h3 className="feature-title">Easy Import/Export</h3>
              <p className="feature-description">Import from spreadsheets and export to various formats</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
