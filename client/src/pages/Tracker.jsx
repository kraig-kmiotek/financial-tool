import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import BillList from '../components/BillList';
import SummaryPanel from '../components/SummaryPanel';
import DepositsPanel from '../components/DepositsPanel';

const DEFAULT_SUMMARY = {
  bank_balance: 0,
  paychecks_remaining: 0,
  paycheck_amount: 0,
  move_to_savings: 0,
  savings_balance: 0,
};

export default function Tracker() {
  const navigate = useNavigate();
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
    // Optimistic update
    setBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, paid: b.paid ? 0 : 1 } : b))
    );
    try {
      const res = await api.patch(`/bills/${id}/toggle`);
      setBills((prev) => prev.map((b) => (b.id === id ? res.data : b)));
    } catch {
      // Revert on failure
      setBills((prev) =>
        prev.map((b) => (b.id === id ? { ...b, paid: b.paid ? 0 : 1 } : b))
      );
    }
  }, []);

  const handleReset = async () => {
    if (!window.confirm('Reset all bills to unpaid and clear one-off items? This cannot be undone.')) return;
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

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    window.location.href = '/login';
  };

  const unpaidTotal = bills
    .filter((b) => !b.paid)
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
    <>
      <header className="app-header">
        <h1>Bill Tracker</h1>
        <div className="header-actions">
          <button className="header-btn" onClick={() => navigate('/settings')}>
            Template
          </button>
          <button
            className="header-btn danger"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? 'Resetting…' : 'Reset Month'}
          </button>
          <button className="header-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="page">
        <SummaryPanel
          summary={summary}
          onChange={setSummary}
          unpaidTotal={unpaidTotal}
          depositTotal={depositTotal}
        />
        <BillList bills={bills} onToggle={handleToggle} />
        <DepositsPanel
          deposits={deposits}
          onAdd={(d) => setDeposits((prev) => [...prev, d])}
          onDelete={(id) => setDeposits((prev) => prev.filter((d) => d.id !== id))}
        />
      </div>
    </>
  );
}
