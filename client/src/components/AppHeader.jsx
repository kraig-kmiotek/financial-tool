import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

// Shared header used on every page — keeps nav consistent across Tracker, Template, History.
// Pass page-specific action buttons as children; they appear after the divider, before Logout.
export default function AppHeader({ children }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    window.location.href = '/login';
  };

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <h1>Bill Tracker</h1>
        <div className="header-actions">
          <button className="header-btn" onClick={() => navigate('/')}>Tracker</button>
          <button className="header-btn" onClick={() => navigate('/settings')}>Template</button>
          <button className="header-btn" onClick={() => navigate('/history')}>History</button>
          <span className="header-divider" aria-hidden="true" />
          {children}
          <button className="header-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}
