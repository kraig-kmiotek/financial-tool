import React, { useState, useEffect, useCallback } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import AppHeader from '../components/AppHeader';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../api';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ── Drag handle icon ────────────────────────────────────────────
function DragIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="3" y="3" width="10" height="2" rx="1" />
      <rect x="3" y="7" width="10" height="2" rx="1" />
      <rect x="3" y="11" width="10" height="2" rx="1" />
    </svg>
  );
}

// ── Sortable bill row ───────────────────────────────────────────
function SortableBillRow({ bill, onEdit, onDelete, onToggleAutopay }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bill.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className="template-item">
      <span className="drag-handle" {...attributes} {...listeners}>
        <DragIcon />
      </span>
      <span className="template-name">{bill.name}</span>
      <span className="template-amount">{fmt(bill.amount)}</span>
      {bill.due_day ? (
        <span className="template-due-day">Due {bill.due_day}</span>
      ) : (
        <span className="template-due-day template-due-day--empty">—</span>
      )}
      <button
        className={`template-autopay-btn${bill.autopay ? ' active' : ''}`}
        onClick={() => onToggleAutopay(bill.id)}
        title={bill.autopay ? 'Autopay on — click to turn off' : 'Autopay off — click to turn on'}
      >
        AP
      </button>
      <div className="template-actions">
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onEdit(bill)} title="Edit">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 1.5L12.5 4.5L5 12H2V9L9.5 1.5Z" />
          </svg>
        </button>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onDelete(bill.id)} title="Delete">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="2,3.5 12,3.5" />
            <path d="M4.5 3.5V2.5C4.5 2 4.9 1.5 5.5 1.5H8.5C9.1 1.5 9.5 2 9.5 2.5V3.5" />
            <path d="M3.5 3.5L4 12H10L10.5 3.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Inline edit row ─────────────────────────────────────────────
function EditRow({ bill, onSave, onCancel }) {
  const [name, setName] = useState(bill.name);
  const [amount, setAmount] = useState(bill.amount);
  const [autopay, setAutopay] = useState(!!bill.autopay);
  const [dueDay, setDueDay] = useState(bill.due_day || '');

  const save = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(bill.id, name.trim(), parseFloat(amount) || 0, autopay, parseInt(dueDay) || null);
  };

  return (
    <form className="template-edit-row" onSubmit={save}>
      <input
        type="text"
        className="template-edit-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <input
        className="template-edit-amount"
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
      />
      <input
        className="template-edit-due-day"
        type="number"
        min="1"
        max="31"
        placeholder="Day"
        value={dueDay}
        onChange={(e) => setDueDay(e.target.value)}
        inputMode="numeric"
        title="Due day of month (1–31)"
      />
      <label className="template-edit-autopay">
        <input
          type="checkbox"
          checked={autopay}
          onChange={(e) => setAutopay(e.target.checked)}
        />
        Autopay
      </label>
      <button type="submit" className="btn btn-primary btn-sm">Save</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
    </form>
  );
}

// ── Passkey management panel ────────────────────────────────────
function PasskeyPanel() {
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [password, setPassword] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPasskeys = useCallback(() => {
    api.get('/auth/passkey').then((r) => setPasskeys(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPasskeys(); }, [loadPasskeys]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!password) { setError('Password required'); return; }
    setError(''); setSuccess('');
    setRegistering(true);
    try {
      const optRes = await api.post('/auth/passkey/register/options', { password });
      const credential = await startRegistration({ optionsJSON: optRes.data });
      await api.post('/auth/passkey/register/verify', {
        credential,
        deviceName: deviceName.trim() || 'My device',
      });
      setSuccess('Passkey registered!');
      setPassword(''); setDeviceName('');
      loadPasskeys();
    } catch (err) {
      setError(err?.response?.data?.error || 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove passkey "${name}"? Make sure you have another device registered first.`)) return;
    try {
      await api.delete(`/auth/passkey/${id}`);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete.');
    }
  };

  const fmtDate = (s) => new Date(s + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Security — Passkeys</span>
      </div>

      {loading ? (
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading…</div>
      ) : (
        <>
          {passkeys.length === 0 && (
            <div className="empty-state">No passkeys registered yet.</div>
          )}
          {passkeys.map((p) => (
            <div key={p.id} className="passkey-item">
              <div className="passkey-info">
                <span className="passkey-name">{p.device_name}</span>
                <span className="passkey-date">Added {fmtDate(p.created_at)}</span>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => handleDelete(p.id, p.device_name)}
                title="Remove passkey"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="2,3.5 12,3.5" />
                  <path d="M4.5 3.5V2.5C4.5 2 4.9 1.5 5.5 1.5H8.5C9.1 1.5 9.5 2 9.5 2.5V3.5" />
                  <path d="M3.5 3.5L4 12H10L10.5 3.5" />
                </svg>
              </button>
            </div>
          ))}
        </>
      )}

      <form className="passkey-add-form" onSubmit={handleRegister}>
        <p className="passkey-add-label">Register a new device</p>
        <input
          placeholder="Device name (e.g. iPhone 15)"
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
          autoComplete="off"
        />
        <input
          type="password"
          placeholder="App password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="passkey-msg error">{error}</p>}
        {success && <p className="passkey-msg success">{success}</p>}
        <button type="submit" className="btn btn-primary btn-sm" disabled={registering}>
          {registering ? 'Setting up…' : 'Register Passkey'}
        </button>
      </form>
    </div>
  );
}

// ── Main Settings page ──────────────────────────────────────────
export default function Settings() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDay, setNewDueDay] = useState('');
  const [newAutopay, setNewAutopay] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    api.get('/template')
      .then((r) => setBills(r.data))
      .finally(() => setLoading(false));
  }, []);

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = bills.findIndex((b) => b.id === active.id);
    const newIndex = bills.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(bills, oldIndex, newIndex);
    setBills(reordered);
    try {
      await api.put('/template/reorder', { order: reordered.map((b) => b.id) });
    } catch {
      setBills(bills);
    }
  };

  const handleSaveEdit = async (id, name, amount, autopay, due_day) => {
    try {
      const res = await api.put(`/template/${id}`, { name, amount, autopay, due_day });
      setBills((prev) => prev.map((b) => (b.id === id ? res.data : b)));
      setEditingId(null);
    } catch {
      alert('Failed to save. Please try again.');
    }
  };

  const handleToggleAutopay = async (id) => {
    try {
      const res = await api.patch(`/template/${id}/autopay`);
      setBills((prev) => prev.map((b) => (b.id === id ? res.data : b)));
    } catch {
      alert('Failed to update autopay. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bill from the template?')) return;
    try {
      await api.delete(`/template/${id}`);
      setBills((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.status || err.message || 'Unknown error';
      alert(`Failed to delete (${msg}). Please try again.`);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await api.post('/template', {
        name: newName.trim(),
        amount: parseFloat(newAmount) || 0,
        autopay: newAutopay,
        due_day: parseInt(newDueDay) || null,
      });
      setBills((prev) => [...prev, res.data]);
      setNewName('');
      setNewAmount('');
      setNewDueDay('');
      setNewAutopay(false);
    } catch {
      alert('Failed to add bill. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="settings-page">
      <AppHeader />

      <div className="page">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Template Bills</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {bills.length} bills
            </span>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={bills.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {bills.map((bill) =>
                editingId === bill.id ? (
                  <EditRow
                    key={bill.id}
                    bill={bill}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <SortableBillRow
                    key={bill.id}
                    bill={bill}
                    onEdit={(b) => setEditingId(b.id)}
                    onDelete={handleDelete}
                    onToggleAutopay={handleToggleAutopay}
                  />
                )
              )}
            </SortableContext>
          </DndContext>

          {bills.length === 0 && (
            <div className="empty-state">No bills in template yet. Add one below.</div>
          )}

          <form className="template-add-form" onSubmit={handleAdd}>
            <input
              type="text"
              className="template-add-name"
              placeholder="Bill name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="template-add-amount"
              type="number"
              step="0.01"
              placeholder="Amount"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              inputMode="decimal"
            />
            <input
              className="template-add-due-day"
              type="number"
              min="1"
              max="31"
              placeholder="Due day"
              value={newDueDay}
              onChange={(e) => setNewDueDay(e.target.value)}
              inputMode="numeric"
              title="Due day of month (1–31)"
            />
            <label className="template-add-autopay">
              <input
                type="checkbox"
                checked={newAutopay}
                onChange={(e) => setNewAutopay(e.target.checked)}
              />
              Autopay
            </label>
            <button type="submit" className="btn btn-primary btn-sm">
              Add Bill
            </button>
          </form>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Changes here affect future resets. Current month bills are unaffected until next reset.
        </p>

        <PasskeyPanel />
      </div>
    </div>
  );
}
