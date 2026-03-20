import React, { useState } from 'react';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDueDate(due_day) {
  if (!due_day) return null;
  const month = MONTHS[new Date().getMonth()];
  return `Due ${month} ${due_day}`;
}

export default function BillItem({ bill, onToggle, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(bill.name);
  const [dueDay, setDueDay] = useState(bill.due_day || '');
  const [autopay, setAutopay] = useState(!!bill.autopay);
  const [skipped, setSkipped] = useState(!!bill.skipped);
  const [amount, setAmount] = useState(bill.amount);

  const handleEditClick = (e) => {
    e.stopPropagation();
    setName(bill.name);
    setDueDay(bill.due_day || '');
    setAutopay(!!bill.autopay);
    setSkipped(!!bill.skipped);
    setAmount(bill.amount);
    setIsEditing(true);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!name.trim()) return;
    await onUpdate(bill.id, {
      name: name.trim(),
      due_day: parseInt(dueDay) || null,
      autopay,
      skipped,
      amount: parseFloat(amount) || 0,
    });
    setIsEditing(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!window.confirm(`Remove "${bill.name}" from this month?`)) return;
    onDelete(bill.id);
  };

  const isSkipped = !!bill.skipped;
  const isOverdue = !bill.paid && !isSkipped && bill.due_day && new Date().getDate() > bill.due_day;

  return (
    <li
      className={`bill-item${bill.paid ? ' paid' : ''}${isSkipped ? ' skipped' : ''}${isOverdue ? ' overdue' : ''}${isEditing ? ' editing' : ''}`}
      onClick={() => !isEditing && !isSkipped && onToggle(bill.id)}
      role="checkbox"
      aria-checked={!!bill.paid}
      tabIndex={0}
      onKeyDown={(e) => !isEditing && !isSkipped && (e.key === 'Enter' || e.key === ' ') ? onToggle(bill.id) : null}
    >
      <div className="bill-check">
        {bill.paid && !isSkipped && (
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <polyline points="1.5,6 4.5,9 10.5,3" />
          </svg>
        )}
        {isSkipped && (
          <svg viewBox="0 0 12 12" aria-hidden="true" style={{ stroke: 'var(--text-secondary)' }}>
            <line x1="2" y1="6" x2="10" y2="6" />
          </svg>
        )}
      </div>
      <div className="bill-info">
        <span className="bill-name">{bill.name}</span>
        {bill.due_day && !isSkipped ? (
          <span className="bill-due">{formatDueDate(bill.due_day)}</span>
        ) : null}
      </div>
      {isSkipped ? (
        <span className="bill-skipped-badge">Skipped</span>
      ) : bill.autopay ? (
        <span className="bill-autopay-badge">Autopay</span>
      ) : null}
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
          <label className="bill-edit-field bill-edit-field--wide">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
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
            <input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} />
            Autopay
          </label>
          <label className="bill-edit-autopay">
            <input type="checkbox" checked={skipped} onChange={(e) => setSkipped(e.target.checked)} />
            Skip month
          </label>
          <div className="bill-edit-actions">
            <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      )}
    </li>
  );
}
