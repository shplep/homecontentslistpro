'use client';

import React, { useEffect, useState } from 'react';

interface FAQEntry {
  id: number;
  question: string;
  answer: string;
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQEntry[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/app/api/admin/faq');
        if (!res.ok) throw new Error('Failed to fetch FAQ entries');
        const data = await res.json();
        setFaqs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load FAQ');
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const toggle = (id: number) => {
    setExpanded(expanded === id ? null : id);
  };

  return (
    <div className="faq-container" style={{ maxWidth: 700, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 32 }}>Frequently Asked Questions</h1>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      {!loading && faqs.length === 0 && <div>No FAQ entries found.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {faqs.map((faq) => (
          <div
            key={faq.id}
            style={{
              background: 'white',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => toggle(faq.id)}
              aria-expanded={expanded === faq.id}
              aria-controls={`faq-answer-${faq.id}`}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                padding: '20px 24px',
                fontSize: 18,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                color: '#222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{faq.question}</span>
              <span style={{ fontSize: 22, marginLeft: 12 }}>
                {expanded === faq.id ? '−' : '+'}
              </span>
            </button>
            <div
              id={`faq-answer-${faq.id}`}
              style={{
                maxHeight: expanded === faq.id ? 500 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
                background: '#f9fafb',
                padding: expanded === faq.id ? '20px 24px' : '0 24px',
                fontSize: 16,
                color: '#444',
              }}
              aria-hidden={expanded !== faq.id}
            >
              {expanded === faq.id && <div>{faq.answer}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 