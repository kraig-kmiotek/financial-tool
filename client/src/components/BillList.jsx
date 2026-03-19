import React, { useState } from 'react';
import BillItem from './BillItem';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function BillList({ bills, onToggle, onUpdate, onDelete, onAdd }) {
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [adding, setAdding] = useState(false);

  const unpaidTotal = bills
    .filter((b) => !b.paid && !b.skipped)
    .reduce((sum, b) => sum + b.amount, 0);

  const paidCount = bills.filter((b) => b.paid).length;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onAdd(newName.trim(), parseFloat(newAmount) || 0);
      setNewName('');
      setNewAmount('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Bills</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {paidCount}/{bills.length} paid
        </span>
      </div>

      {bills.length === 0 ? (
        <div className="empty-state">No bills — click Reset Month to load from template.</div>
      ) : (
        <ul className="bills-list">
          {bills.map((bill) => (
            <BillItem
              key={bill.id}
              bill={bill}
              onToggle={onToggle}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}

      <form className="bill-add-form" onSubmit={handleAdd}>
        <input
          className="bill-add-name"
          placeholder="Add a bill this month…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          className="bill-add-amount"
          type="number"
          step="0.01"
          placeholder="Amount"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          inputMode="decimal"
        />
        <button type="submit" className="btn btn-secondary btn-sm" disabled={adding}>
          Add
        </button>
      </form>

      <div className="bills-footer">
        <span className="bills-footer-label">Unpaid Total</span>
        <span className="bills-footer-amount">{fmt(unpaidTotal)}</span>
      </div>
    </div>
  );
}
