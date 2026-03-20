import React, { useState } from 'react';
import api from '../api';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', signDisplay: 'always' });

export default function DepositsPanel({ deposits, onAdd, onDelete }) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!label.trim() || amount === '') return;
    setError('');
    try {
      const res = await api.post('/deposits', {
        label: label.trim(),
        amount: parseFloat(amount),
      });
      onAdd(res.data);
      setLabel('');
      setAmount('');
    } catch {
      setError('Failed to add item. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      await api.delete(`/deposits/${id}`);
      onDelete(id);
    } catch {
      setError('Failed to remove item. Please try again.');
    }
  };

  const total = deposits.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">One-Off Items</span>
        {deposits.length > 0 && (
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: total >= 0 ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {fmt(total)}
          </span>
        )}
      </div>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: '0 0 0.5rem' }}>
          {error}
        </p>
      )}

      {deposits.length === 0 && (
        <p className="empty-state" style={{ padding: '1rem', margin: 0 }}>No items added yet</p>
      )}

      {deposits.length > 0 && (
        <ul style={{ listStyle: 'none' }}>
          {deposits.map((d) => (
            <li key={d.id} className="deposit-item">
              <span className="deposit-label">{d.label}</span>
              <span className={`deposit-amount ${d.amount >= 0 ? 'positive' : 'negative'}`}>
                {fmt(d.amount)}
              </span>
              <button
                className="deposit-delete"
                onClick={() => handleDelete(d.id)}
                aria-label="Remove"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="2" y1="2" x2="12" y2="12" />
                  <line x1="12" y1="2" x2="2" y2="12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="deposit-add-form" onSubmit={handleAdd}>
        <input
          className="deposit-label-input"
          placeholder="Description"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ flex: 1, minWidth: 0 }}
        />
        <input
          className="deposit-amount-input"
          type="number"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          style={{ width: 110 }}
        />
        <button type="submit" className="btn btn-primary btn-sm">
          Add
        </button>
      </form>
    </div>
  );
}
