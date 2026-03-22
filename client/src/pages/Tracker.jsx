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

  const unpaidTotal = bills
    .filter((b) => !b.paid && !b.skipped)
    .reduce((sum, b) => sum + b.amount, 0);

  const depositTotal = deposits.reduce((sum, d) => sum + d.amount, 0);

  // Display order: unpaid by due_day → skipped by due_day → paid by due_day.
  // Bills without a due date sort after those with one within each group.
  const sortedBills = [...bills].sort((a, b) => {
    const aGroup = a.paid ? 2 : a.skipped ? 1 : 0;
    const bGroup = b.paid ? 2 : b.skipped ? 1 : 0;
    if (aGroup !== bGroup) return aGroup - bGroup;
    return (a.due_day ?? 32) - (b.due_day ?? 32);
  });

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="tracker-page">
      <AppHeader />

      <div className="page">
        {/* Left column: summary + insights (stacked on mobile, grid col on desktop) */}
        <div className="page-left">
          <SummaryPanel
            summary={summary}
            onChange={setSummary}
            unpaidTotal={unpaidTotal}
            depositTotal={depositTotal}
          />
          <ChartsPanel
            bills={bills}
            summary={summary}
            deposits={deposits}
            unpaidTotal={unpaidTotal}
            depositTotal={depositTotal}
          />
        </div>

        {/* Center column: bills */}
        <BillList
          bills={sortedBills}
          onToggle={handleToggle}
          onUpdate={handleUpdate}
          onDelete={handleDeleteBill}
          onAdd={handleAddBill}
        />

        {/* Right column: one-off items */}
        <DepositsPanel
          deposits={deposits}
          onAdd={(d) => setDeposits((prev) => [...prev, d])}
          onDelete={(id) => setDeposits((prev) => prev.filter((d) => d.id !== id))}
        />
      </div>
    </div>
  );
}
