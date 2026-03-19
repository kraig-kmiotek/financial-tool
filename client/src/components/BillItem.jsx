import React from 'react';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDueDate(due_day) {
  if (!due_day) return null;
  const month = MONTHS[new Date().getMonth()];
  return `Due ${month} ${due_day}`;
}

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
      <div className="bill-info">
        <span className="bill-name">{bill.name}</span>
        {bill.due_day ? (
          <span className="bill-due">{formatDueDate(bill.due_day)}</span>
        ) : null}
      </div>
      {bill.autopay ? <span className="bill-autopay-badge">Autopay</span> : null}
      <span className="bill-amount">{fmt(bill.amount)}</span>
    </li>
  );
}
