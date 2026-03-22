import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Tracker from './pages/Tracker';
import Settings from './pages/Settings';
import History from './pages/History';
import api from './api';

export default function App() {
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    api
      .get('/auth/check')
      .then((r) => setAuthenticated(r.data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            authenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLogin={() => setAuthenticated(true)} />
            )
          }
        />
        <Route
          path="/"
          element={authenticated ? <Tracker /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings"
          element={authenticated ? <Settings /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/history"
          element={authenticated ? <History /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
