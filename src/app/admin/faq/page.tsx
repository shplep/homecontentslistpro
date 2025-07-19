'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaGripVertical, FaEdit, FaTrash } from 'react-icons/fa';

interface FAQEntry {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
}

export default function AdminFAQPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [faqs, setFaqs] = useState<FAQEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [addQuestion, setAddQuestion] = useState('');
  const [addAnswer, setAddAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [reorderSaving, setReorderSaving] = useState(false);

  // Fetch FAQs
  useEffect(() => {
    const fetchFaqs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/app/api/admin/faq');
        if (!res.ok) throw new Error('Failed to fetch FAQ entries');
        const data = await res.json();
        setFaqs(data);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch FAQ entries');
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  // Add FAQ
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addQuestion.trim() || !addAnswer.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/app/api/admin/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: addQuestion, answer: addAnswer }),
      });
      if (!res.ok) throw new Error('Failed to add FAQ');
      setAddQuestion('');
      setAddAnswer('');
      // Refresh list
      const data = await res.json();
      setFaqs((prev) => [...prev, data]);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to add FAQ');
    } finally {
      setSaving(false);
    }
  };

  // Edit FAQ
  const startEdit = (faq: FAQEntry) => {
    setEditingId(faq.id);
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditQuestion('');
    setEditAnswer('');
  };
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQuestion.trim() || !editAnswer.trim() || editingId === null) return;
    setSaving(true);
    try {
      const res = await fetch('/app/api/admin/faq', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, question: editQuestion, answer: editAnswer }),
      });
      if (!res.ok) throw new Error('Failed to update FAQ');
      const updated = await res.json();
      setFaqs((prev) => prev.map(f => f.id === editingId ? updated : f));
      cancelEdit();
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to update FAQ');
    } finally {
      setSaving(false);
    }
  };

  // Delete FAQ
  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this FAQ?')) return;
    setSaving(true);
    try {
      const res = await fetch('/app/api/admin/faq', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete FAQ');
      setFaqs((prev) => prev.filter(f => f.id !== id));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to delete FAQ');
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop reorder
  const handleDragStart = (idx: number) => setDraggedIndex(idx);
  const handleDragOver = (idx: number) => {
    if (draggedIndex === null || draggedIndex === idx) return;
    setFaqs((prev) => {
      const arr = [...prev];
      const [removed] = arr.splice(draggedIndex, 1);
      arr.splice(idx, 0, removed);
      return arr.map((f, i) => ({ ...f, sortOrder: i + 1 }));
    });
    setDraggedIndex(idx);
  };
  const handleDragEnd = async () => {
    setDraggedIndex(null);
    setReorderSaving(true);
    try {
      await fetch('/app/api/admin/faq', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: faqs.map((f, i) => ({ id: f.id, sortOrder: i + 1 })) }),
      });
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to reorder FAQs');
    } finally {
      setReorderSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">FAQ Management</h1>
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
            <FaArrowLeft className="mr-2" /> Back to Dashboard
          </Link>
        </div>
      </header>
      <main className="dashboard-main">
        {error && <div className="message error mb-2">{error}</div>}
        {/* Add FAQ Form */}
        <div className="card mb-3">
          <div className="card-header">
            <span className="section-title">Add FAQ</span>
          </div>
          <div className="card-content">
            <form onSubmit={handleAdd} className="faq-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Question</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Question"
                    value={addQuestion}
                    onChange={e => setAddQuestion(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Answer</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Answer"
                    value={addAnswer}
                    onChange={e => setAddAnswer(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !addQuestion.trim() || !addAnswer.trim()}
                >
                  {saving ? 'Saving...' : 'Add FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
        {/* FAQ List */}
        <div className="card">
          <div className="card-header">
            <span className="section-title">FAQ Entries</span>
            {reorderSaving && <span className="ml-2 text-sm text-gray-500">Saving order...</span>}
          </div>
          <div className="card-content">
            {loading ? (
              <div>Loading...</div>
            ) : faqs.length === 0 ? (
              <div className="text-gray-500 mb-4">No FAQs yet. Add your first FAQ above.</div>
            ) : (
              <ul className="space-y-4">
                {faqs.map((faq, idx) => (
                  <li
                    key={faq.id}
                    className={`relative faq-item flex items-start gap-4 transition-all ${draggedIndex === idx ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}
                    draggable={faqs.length > 1}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={e => { e.preventDefault(); handleDragOver(idx); }}
                    onDragEnd={handleDragEnd}
                    style={{ cursor: faqs.length > 1 ? 'grab' : 'default' }}
                  >
                    {/* Drag handle */}
                    {faqs.length > 1 && (
                      <span className="flex items-center mr-2 text-gray-400 cursor-grab select-none">
                        <FaGripVertical size={18} />
                      </span>
                    )}
                    {editingId === faq.id ? (
                      <form onSubmit={handleEdit} className="flex-1">
                        <div className="form-row">
                          <div className="form-group">
                            <input
                              type="text"
                              className="form-input mb-2"
                              value={editQuestion}
                              onChange={e => setEditQuestion(e.target.value)}
                              disabled={saving}
                            />
                          </div>
                          <div className="form-group">
                            <textarea
                              className="form-textarea mb-2"
                              value={editAnswer}
                              onChange={e => setEditAnswer(e.target.value)}
                              disabled={saving}
                            />
                          </div>
                        </div>
                        <div className="form-actions">
                          <button type="submit" className="btn btn-primary" disabled={saving}>Save</button>
                          <button type="button" className="btn btn-outlined" onClick={cancelEdit} disabled={saving}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex-1">
                        <div className="font-semibold text-lg mb-1">{faq.question}</div>
                        <div className="text-gray-700 whitespace-pre-line mb-2">{faq.answer}</div>
                      </div>
                    )}
                    {editingId !== faq.id && (
                      <div className="flex flex-col gap-2 ml-2 min-w-[60px]">
                        <button
                          className="btn btn-outlined flex items-center gap-1 text-blue-600 text-sm"
                          onClick={() => startEdit(faq)}
                          disabled={saving}
                        ><FaEdit /> Edit</button>
                        <button
                          className="btn btn-outlined flex items-center gap-1 text-red-600 text-sm"
                          onClick={() => handleDelete(faq.id)}
                          disabled={saving}
                        ><FaTrash /> Delete</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 