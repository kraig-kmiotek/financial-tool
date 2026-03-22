import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import AppHeader from '../components/AppHeader';
import BillList from '../components/BillList';
import SummaryPanel from '../components/SummaryPanel';
import DepositsPanel from '../components/DepositsPanel';
import ChartsPanel from '../components/ChartsPanel';

const DEFAULT_SUMMARY = {
  bank_balance: 0,
  paychecks_remaining: 0,
  paycheck_amount: 0,
  move_to_savings: 0,
  savings_balance: 0,
};

export default function Tracker() {
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/bills'), api.get('/summary'), api.get('/deposits')])
      .then(([b, s, d]) => {
        setBills(b.data);
        setSummary(s.data || DEFAULT_SUMMARY);
        setDeposits(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = useCallback(async (id) => {
    setBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, paid: b.paid ? 0 : 1 } : b))
    );
    try {
      const res = await api.patch(`/bills/${id}/toggle`);
      setBills((prev) => prev.map((b) => (b.id === id ? res.data : b)));
    } catch {
      setBills((prev) =>
        prev.map((b) => (b.id === id ? { ...b, paid: b.paid ? 0 : 1 } : b))
      );
    }
  }, []);

  const handleUpdate = useCallback(async (id, fields) => {
    try {
      const res = await api.patch(`/bills/${id}`, fields);
      setBills((prev) => prev.map((b) => (b.id === id ? res.data : b)));
    } catch {
      alert('Failed to save. Please try again.');
    }
  }, []);

  const handleAddBill = useCallback(async (name, amount) => {
    const res = await api.post('/bills', { name, amount });
    setBills((prev) => [...prev, res.data]);
  }, []);

  const handleDeleteBill = useCallback(async (id) => {
    try {
      await api.delete(`/bills/${id}`);
      setBills((prev) => prev.filter((b) => b.id !== id));
    } catch {
      alert('Failed to delete. Please try again.');
    }
  }, []);

  const handleReset = async () => {
    if (!window.confirm('Reset all bills to unpaid for the new month and clear one-off items?\n\nYour financial summary fields (bank balance, paychecks, savings, etc.) will be kept.')) return;
    setResetting(true);
    try {
      const res = await api.post('/bills/reset');
      setBills(res.data);
      setDeposits([]);
    } catch {
      alert('Reset failed. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  const handleExportCSV = () => {
    const rows = [];

    // Section: Bills
    rows.push(['Bills']);
    rows.push(['Name', 'Amount', 'Paid', 'Autopay', 'Due Day', 'Skipped']);
    bills.forEach((b) => {
      rows.push([
        b.name,
        b.amount,
        b.paid ? 'Yes' : 'No',
        b.autopay ? 'Yes' : 'No',
        b.due_day ?? '',
        b.skipped ? 'Yes' : 'No',
      ]);
    });

    rows.push([]); // blank separator

    // Section: Deposits
    rows.push(['Deposits']);
    rows.push(['Label', 'Amount']);
    if (deposits.length === 0) {
      rows.push(['(none)', '']);
    } else {
      deposits.forEach((d) => rows.push([d.label, d.amount]));
    }

    rows.push([]);

    // Section: Summary
    const incomeRemaining = summary.paychecks_remaining * summary.paycheck_amount;
    const netRemaining =
      summary.bank_balance + incomeRemaining - unpaidTotal + depositTotal - summary.move_to_savings;
    const totalSavings = summary.savings_balance + summary.move_to_savings;

    rows.push(['Summary']);
    rows.push(['Field', 'Value']);
    rows.push(['Bank Balance', summary.bank_balance]);
    rows.push(['Paychecks Remaining', summary.paychecks_remaining]);
    rows.push(['Paycheck Amount', summary.paycheck_amount]);
    rows.push(['Income Remaining', incomeRemaining]);
    rows.push(['Unpaid Bill Total', unpaidTotal]);
    rows.push(['Deposit Total', depositTotal]);
    rows.push(['Move to Savings', summary.move_to_savings]);
    rows.push(['Savings Balance', summary.savings_balance]);
    rows.push(['Net Remaining', netRemaining]);
    rows.push(['Total Savings', totalSavings]);

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? '');
            // Quote cells that contain commas, quotes, or newlines
            return s.includes(',') || s.includes('"') || s.includes('\n')
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    a.href = url;
    a.download = `bills-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const unpaidTotal = bills
    .filter((b) => !b.paid && !b.skipped)
    .reduce((sum, b) => sum + b.amount, 0);

  const depositTotal = deposits.reduce((sum, d) => sum + d.amount, 0);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="tracker-page">
      <AppHeader>
        <button className="header-btn" onClick={handleExportCSV}>Export</button>
        <button
          className="header-btn danger"
          onClick={handleReset}
          disabled={resetting}
        >
          {resetting ? 'Resetting…' : 'Reset Month'}
        </button>
      </AppHeader>

      <div className="page">
        <SummaryPanel
          summary={summary}
          onChange={setSummary}
          unpaidTotal={unpaidTotal}
          depositTotal={depositTotal}
        />

        {/* Center column: bills + one-off items (stacked on mobile, grid col on desktop) */}
        <div className="page-center">
          <BillList
            bills={bills}
            onToggle={handleToggle}
            onUpdate={handleUpdate}
            onDelete={handleDeleteBill}
            onAdd={handleAddBill}
          />
          <DepositsPanel
            deposits={deposits}
            onAdd={(d) => setDeposits((prev) => [...prev, d])}
            onDelete={(id) => setDeposits((prev) => prev.filter((d) => d.id !== id))}
          />
        </div>

        {/* Right column: charts — hidden on mobile, shown on desktop */}
        <ChartsPanel
          bills={bills}
          summary={summary}
          deposits={deposits}
          unpaidTotal={unpaidTotal}
          depositTotal={depositTotal}
        />
      </div>
    </div>
  );
}
