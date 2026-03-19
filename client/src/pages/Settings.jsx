import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
function SortableBillRow({ bill, onEdit, onDelete }) {
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

  const save = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(bill.id, name.trim(), parseFloat(amount) || 0);
  };

  return (
    <form className="template-edit-row" onSubmit={save}>
      <input
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
      <button type="submit" className="btn btn-primary btn-sm">Save</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
    </form>
  );
}

// ── Main Settings page ──────────────────────────────────────────
export default function Settings() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');

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
      // Revert on failure
      setBills(bills);
    }
  };

  const handleSaveEdit = async (id, name, amount) => {
    try {
      const res = await api.put(`/template/${id}`, { name, amount });
      setBills((prev) => prev.map((b) => (b.id === id ? res.data : b)));
      setEditingId(null);
    } catch {
      alert('Failed to save. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bill from the template?')) return;
    try {
      await api.delete(`/template/${id}`);
      setBills((prev) => prev.filter((b) => b.id !== id));
    } catch {
      alert('Failed to delete. Please try again.');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await api.post('/template', {
        name: newName.trim(),
        amount: parseFloat(newAmount) || 0,
      });
      setBills((prev) => [...prev, res.data]);
      setNewName('');
      setNewAmount('');
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
      <header className="app-header">
        <h1>Bill Template</h1>
        <div className="header-actions">
          <button className="header-btn" onClick={() => navigate('/')}>
            ← Tracker
          </button>
        </div>
      </header>

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
            <button type="submit" className="btn btn-primary btn-sm">
              Add Bill
            </button>
          </form>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Changes here affect future resets. Current month bills are unaffected until next reset.
        </p>
      </div>
    </div>
  );
}
