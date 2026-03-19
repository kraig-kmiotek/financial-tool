import React, { useState } from 'react';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDueDate(due_day) {
  if (!due_day) return null;
  const month = MONTHS[new Date().getMonth()];
  return `Due ${month} ${due_day}`;
}

export default function BillItem({ bill, onToggle, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [dueDay, setDueDay] = useState(bill.due_day || '');
  const [autopay, setAutopay] = useState(!!bill.autopay);
  const [amount, setAmount] = useState(bill.amount);

  const handleEditClick = (e) => {
    e.stopPropagation();
    // Reset form to current bill values each time edit opens
    setDueDay(bill.due_day || '');
    setAutopay(!!bill.autopay);
    setAmount(bill.amount);
    setIsEditing(true);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    await onUpdate(bill.id, {
      due_day: parseInt(dueDay) || null,
      autopay,
      amount: parseFloat(amount) || 0,
    });
    setIsEditing(false);
  };

  return (
    <li
      className={`bill-item${bill.paid ? ' paid' : ''}${isEditing ? ' editing' : ''}`}
      onClick={() => !isEditing && onToggle(bill.id)}
      role="checkbox"
      aria-checked={!!bill.paid}
      tabIndex={0}
      onKeyDown={(e) => !isEditing && (e.key === 'Enter' || e.key === ' ') ? onToggle(bill.id) : null}
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
      <button
        className="bill-edit-btn"
        onClick={isEditing ? handleCancel : handleEditClick}
        title={isEditing ? 'Cancel' : 'Edit'}
        aria-label={isEditing ? 'Cancel edit' : 'Edit bill'}
      >
        {isEditing ? (
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 1.5L12.5 4.5L5 12H2V9L9.5 1.5Z"/>
          </svg>
        )}
      </button>

      {isEditing && (
        <div className="bill-edit-strip" onClick={(e) => e.stopPropagation()}>
          <label className="bill-edit-field">
            <span>Amount</span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <label className="bill-edit-field">
            <span>Due Day</span>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="—"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="bill-edit-autopay">
            <input
              type="checkbox"
              checked={autopay}
              onChange={(e) => setAutopay(e.target.checked)}
            />
            Autopay
          </label>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
        </div>
      )}
    </li>
  );
}
