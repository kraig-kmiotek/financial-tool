import React, { useEffect, useRef } from 'react';
import api from '../api';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function SummaryField({ label, children }) {
  return (
    <div className="summary-field">
      <span className="summary-label">{label}</span>
      {children}
    </div>
  );
}

export default function SummaryPanel({ summary, onChange, unpaidTotal, depositTotal }) {
  const saveTimer = useRef(null);

  // Debounced auto-save: 600ms after last change
  const handleChange = (field, value) => {
    const updated = { ...summary, [field]: parseFloat(value) || 0 };
    onChange(updated);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.put('/summary', updated);
    }, 600);
  };

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const incomeRemaining = (summary.paychecks_remaining || 0) * (summary.paycheck_amount || 0);
  const netRemaining =
    (summary.bank_balance || 0) +
    incomeRemaining -
    unpaidTotal +
    depositTotal -
    (summary.move_to_savings || 0);
  const totalSavings = (summary.savings_balance || 0) + (summary.move_to_savings || 0);

  const netClass = netRemaining >= 0 ? 'positive' : 'negative';
  const totalSavingsClass = totalSavings >= 0 ? 'positive' : 'negative';

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Financial Summary</span>
      </div>

      {/* Net Remaining — prominent at top */}
      <div className="summary-net">
        <span className="net-label">Net Remaining</span>
        <span className={`net-value ${netClass}`}>{fmt(netRemaining)}</span>
      </div>

      <div className="summary-grid">
        <SummaryField label="Bank Balance">
          <input
            className="summary-input"
            type="number"
            step="0.01"
            value={summary.bank_balance ?? ''}
            onChange={(e) => handleChange('bank_balance', e.target.value)}
            inputMode="decimal"
          />
        </SummaryField>

        <SummaryField label="Paychecks Remaining">
          <input
            className="summary-input"
            type="number"
            step="1"
            min="0"
            value={summary.paychecks_remaining ?? ''}
            onChange={(e) => handleChange('paychecks_remaining', e.target.value)}
            inputMode="numeric"
          />
        </SummaryField>

        <SummaryField label="Paycheck Amount">
          <input
            className="summary-input"
            type="number"
            step="0.01"
            value={summary.paycheck_amount ?? ''}
            onChange={(e) => handleChange('paycheck_amount', e.target.value)}
            inputMode="decimal"
          />
        </SummaryField>

        <SummaryField label="Income Remaining">
          <span className="summary-value positive">{fmt(incomeRemaining)}</span>
        </SummaryField>

        <SummaryField label="Move to Savings">
          <input
            className="summary-input"
            type="number"
            step="0.01"
            value={summary.move_to_savings ?? ''}
            onChange={(e) => handleChange('move_to_savings', e.target.value)}
            inputMode="decimal"
          />
        </SummaryField>

        <SummaryField label="Savings Balance">
          <input
            className="summary-input"
            type="number"
            step="0.01"
            value={summary.savings_balance ?? ''}
            onChange={(e) => handleChange('savings_balance', e.target.value)}
            inputMode="decimal"
          />
        </SummaryField>

        <SummaryField label="Total Savings">
          <span className={`summary-value ${totalSavingsClass}`}>{fmt(totalSavings)}</span>
        </SummaryField>

        <SummaryField label="Unpaid Bills">
          <span className="summary-value negative">{fmt(unpaidTotal)}</span>
        </SummaryField>
      </div>
    </div>
  );
}
