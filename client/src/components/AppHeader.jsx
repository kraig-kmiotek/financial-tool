import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

// Shared header on every page. Export and Reset Month always visible so the
// header stays identical regardless of which view is active.
// Pass page-specific extras (e.g. Clear History) as children — they appear
// between the divider and Logout.
export default function AppHeader({ children }) {
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    window.location.href = '/login';
  };

  const handleExportCSV = async () => {
    try {
      const [billsRes, summaryRes, depositsRes] = await Promise.all([
        api.get('/bills'),
        api.get('/summary'),
        api.get('/deposits'),
      ]);
      const bills = billsRes.data;
      const summary = summaryRes.data || {};
      const deposits = depositsRes.data;

      const incomeRemaining = (summary.paychecks_remaining || 0) * (summary.paycheck_amount || 0);
      const unpaidTotal = bills.filter((b) => !b.paid && !b.skipped).reduce((s, b) => s + b.amount, 0);
      const depositTotal = deposits.reduce((s, d) => s + d.amount, 0);
      const netRemaining = (summary.bank_balance || 0) + incomeRemaining - unpaidTotal + depositTotal - (summary.move_to_savings || 0);
      const totalSavings = (summary.savings_balance || 0) + (summary.move_to_savings || 0);

      const escape = (v) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const rows = [
        ['Bills'],
        ['Name', 'Amount', 'Paid', 'Autopay', 'Due Day', 'Skipped'],
        ...bills.map((b) => [b.name, b.amount, b.paid ? 'Yes' : 'No', b.autopay ? 'Yes' : 'No', b.due_day ?? '', b.skipped ? 'Yes' : 'No']),
        [],
        ['Deposits'],
        ['Label', 'Amount'],
        ...(deposits.length === 0 ? [['(none)', '']] : deposits.map((d) => [d.label, d.amount])),
        [],
        ['Summary'],
        ['Field', 'Value'],
        ['Bank Balance', summary.bank_balance || 0],
        ['Paychecks Remaining', summary.paychecks_remaining || 0],
        ['Paycheck Amount', summary.paycheck_amount || 0],
        ['Income Remaining', incomeRemaining],
        ['Unpaid Bill Total', unpaidTotal],
        ['Deposit Total', depositTotal],
        ['Move to Savings', summary.move_to_savings || 0],
        ['Savings Balance', summary.savings_balance || 0],
        ['Net Remaining', netRemaining],
        ['Total Savings', totalSavings],
      ];

      const csv = rows.map((r) => r.map(escape).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bills-${new Date().toISOString().slice(0, 7)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Please try again.');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all bills to unpaid for the new month and clear one-off items?\n\nYour financial summary fields (bank balance, paychecks, savings, etc.) will be kept.')) return;
    setResetting(true);
    try {
      await api.post('/bills/reset');
      // Reload so Tracker re-fetches fresh state from the server
      window.location.href = '/';
    } catch {
      alert('Reset failed. Please try again.');
      setResetting(false);
    }
  };

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <h1>Bill Tracker <span style={{ fontWeight: 400, fontSize: '0.85em', opacity: 0.8 }}>(v1.0)</span></h1>
        <div className="header-actions">
          <button className="header-btn" onClick={() => navigate('/')}>Tracker</button>
          <button className="header-btn" onClick={() => navigate('/settings')}>Template</button>
          <button className="header-btn" onClick={() => navigate('/history')}>History</button>
          <span className="header-divider" aria-hidden="true" />
          <button className="header-btn" onClick={handleExportCSV}>Export</button>
          <button className="header-btn danger" onClick={handleReset} disabled={resetting}>
            {resetting ? 'Resetting…' : 'Reset Month'}
          </button>
          {children}
          <button className="header-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}
