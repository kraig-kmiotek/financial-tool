import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const fmt = (n) =>
  Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// Format "2026-03" → "March 2026"
function fmtMonth(key) {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

// Format ISO datetime from SQLite (UTC) → local-time string
function fmtDateTime(s) {
  return new Date(s + 'Z').toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function History() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/history')
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  // Group by month_key (already sorted newest-first from server)
  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.month_key]) acc[row.month_key] = [];
    acc[row.month_key].push(row);
    return acc;
  }, {});

  const monthKeys = Object.keys(grouped); // already in newest-first order

  return (
    <div className="settings-page">
      <header className="app-header">
        <h1>Payment History</h1>
        <div className="header-actions">
          <button className="header-btn" onClick={() => navigate('/')}>
            ← Tracker
          </button>
        </div>
      </header>

      <div className="page">
        {monthKeys.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              No payment history yet. Mark bills as paid to start the audit trail.
            </div>
          </div>
        ) : (
          monthKeys.map((mk) => (
            <div key={mk} className="card">
              <div className="card-header">
                <span className="card-title">{fmtMonth(mk)}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {grouped[mk].filter((r) => r.action === 'paid').length} payments
                </span>
              </div>
              <ul className="bills-list">
                {grouped[mk].map((row) => (
                  <li key={row.id} className="history-item">
                    <span className={`history-action-dot history-action-dot--${row.action}`} />
                    <span className="history-bill-name">{row.bill_name}</span>
                    <span className="history-amount">{fmt(row.amount)}</span>
                    <span className={`history-badge history-badge--${row.action}`}>
                      {row.action === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                    <span className="history-date">{fmtDateTime(row.occurred_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
