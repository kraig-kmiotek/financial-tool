import React from 'react';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function BillItem({ bill, onToggle }) {
  return (
    <li
      className={`bill-item${bill.paid ? ' paid' : ''}`}
      onClick={() => onToggle(bill.id)}
      role="checkbox"
      aria-checked={!!bill.paid}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? onToggle(bill.id) : null}
    >
      <div className="bill-check">
        {bill.paid && (
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <polyline points="1.5,6 4.5,9 10.5,3" />
          </svg>
        )}
      </div>
      <span className="bill-name">{bill.name}</span>
      <span className="bill-amount">{fmt(bill.amount)}</span>
    </li>
  );
}
