import React from 'react';
import BillItem from './BillItem';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function BillList({ bills, onToggle }) {
  const unpaidTotal = bills
    .filter((b) => !b.paid)
    .reduce((sum, b) => sum + b.amount, 0);

  const paidCount = bills.filter((b) => b.paid).length;

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
            <BillItem key={bill.id} bill={bill} onToggle={onToggle} />
          ))}
        </ul>
      )}

      <div className="bills-footer">
        <span className="bills-footer-label">Unpaid Total</span>
        <span className="bills-footer-amount">{fmt(unpaidTotal)}</span>
      </div>
    </div>
  );
}
