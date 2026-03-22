import React from 'react';

const fmtK = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n < 0 ? '-' : '') + '$' + (abs / 1000).toFixed(1) + 'k';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
};

const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ── Donut chart: bills paid vs skipped vs unpaid ──────────────
function DonutChart({ bills }) {
  const total = bills.length;
  if (total === 0) {
    return <p className="chart-empty">No bills this month</p>;
  }

  const paid = bills.filter((b) => b.paid).length;
  const skipped = bills.filter((b) => b.skipped && !b.paid).length;
  const unpaid = total - paid - skipped;

  const r = 48;
  const cx = 60;
  const cy = 60;
  const C = 2 * Math.PI * r;

  const segments = [
    { value: paid, color: '#15803d' },
    { value: skipped, color: '#d97706' },
    { value: unpaid, color: '#e2e8f0' },
  ];

  let offset = 0;
  const arcs = segments.map((seg, i) => {
    if (seg.value <= 0) return null;
    const frac = seg.value / total;
    const arc = (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth="13"
        strokeDasharray={`${frac * C} ${C}`}
        strokeDashoffset={`${-(offset * C)}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    );
    offset += frac;
    return arc;
  });

  return (
    <div className="donut-wrap">
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
        {/* background track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="13" />
        {arcs}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="800" fill="#111827">
          {paid}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="#6b7280">
          of {total} paid
        </text>
      </svg>
      <div className="chart-legend">
        {paid > 0 && (
          <div className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: '#15803d' }} />
            {paid} paid
          </div>
        )}
        {skipped > 0 && (
          <div className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: '#d97706' }} />
            {skipped} skipped
          </div>
        )}
        {unpaid > 0 && (
          <div className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: '#94a3b8' }} />
            {unpaid} unpaid
          </div>
        )}
      </div>
    </div>
  );
}

// ── Budget breakdown: segmented bar showing where money goes ──
function BudgetBar({ summary, unpaidTotal, depositTotal }) {
  const income = (summary.paychecks_remaining || 0) * (summary.paycheck_amount || 0);
  const bank = summary.bank_balance || 0;
  const savings = summary.move_to_savings || 0;
  const net = bank + income + depositTotal - unpaidTotal - savings;
  const total = bank + income + Math.max(0, depositTotal);

  if (total <= 0) return <p className="chart-empty">Enter your bank balance to see a breakdown</p>;

  const billsPct = Math.min((unpaidTotal / total) * 100, 100);
  const savingsPct = Math.min((savings / total) * 100, Math.max(0, 100 - billsPct));
  const netPct = Math.max(0, Math.min((net / total) * 100, 100 - billsPct - savingsPct));

  return (
    <div>
      <div className="budget-bar-track">
        {billsPct > 0 && (
          <div
            className="budget-bar-seg"
            style={{ width: `${billsPct}%`, background: '#dc2626' }}
            title={`Bills: ${fmt(unpaidTotal)}`}
          />
        )}
        {savingsPct > 0 && (
          <div
            className="budget-bar-seg"
            style={{ width: `${savingsPct}%`, background: '#1e40af' }}
            title={`Savings: ${fmt(savings)}`}
          />
        )}
        {netPct > 0 && (
          <div
            className="budget-bar-seg"
            style={{ width: `${netPct}%`, background: '#15803d' }}
            title={`Net: ${fmt(net)}`}
          />
        )}
      </div>
      <div className="chart-legend" style={{ marginTop: '0.6rem' }}>
        <div className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: '#dc2626' }} />
          Bills {fmtK(unpaidTotal)}
        </div>
        {savings > 0 && (
          <div className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: '#1e40af' }} />
            Savings {fmtK(savings)}
          </div>
        )}
        <div className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: net >= 0 ? '#15803d' : '#dc2626' }} />
          Net {fmtK(net)}
        </div>
      </div>
    </div>
  );
}

// ── Horizontal bar chart: top bills by amount ─────────────────
function BillsBars({ bills }) {
  const active = bills
    .filter((b) => !b.skipped && b.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  if (active.length === 0) return <p className="chart-empty">No bills to display</p>;

  const max = active[0].amount;

  return (
    <div className="bill-bars">
      {active.map((bill) => (
        <div key={bill.id} className="bill-bar-row">
          <div className="bill-bar-name" title={bill.name}>
            {bill.name}
          </div>
          <div className="bill-bar-track">
            <div
              className="bill-bar-fill"
              style={{
                width: `${(bill.amount / max) * 100}%`,
                background: '#1e40af',
              }}
            />
          </div>
          <div className="bill-bar-value">{fmtK(bill.amount)}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────
export default function ChartsPanel({ bills, summary, deposits, unpaidTotal, depositTotal }) {
  return (
    <div className="card charts-panel">
      <div className="card-header">
        <span className="card-title">Insights</span>
      </div>

      <div className="chart-section">
        <div className="chart-section-label">Bills Progress</div>
        <DonutChart bills={bills} />
      </div>

      <div className="chart-section chart-section--bordered">
        <div className="chart-section-label">Budget Breakdown</div>
        <BudgetBar summary={summary} unpaidTotal={unpaidTotal} depositTotal={depositTotal} />
      </div>

      <div className="chart-section chart-section--bordered">
        <div className="chart-section-label">Top Bills</div>
        <BillsBars bills={bills} />
      </div>
    </div>
  );
}
