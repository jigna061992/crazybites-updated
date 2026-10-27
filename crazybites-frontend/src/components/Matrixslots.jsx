import { useState, useEffect } from "react";
import { Grid3x3, Lock, CheckCircle2 } from "lucide-react";
import api from "../api/axios";

// 5x5 matrix: position -> label + color (according to image )
const POSITION_META = {
  1: { label: "YOUR", box: "border-green-300 bg-green-50", badge: "bg-green-600" },
  2: { label: "NEXT SLOT", box: "border-brand-300 bg-brand-50", badge: "bg-brand-500" },
  3: { label: "NEXT SLOT", box: "border-brand-300 bg-brand-50", badge: "bg-brand-500" },
  4: { label: "YOUR", box: "border-green-300 bg-green-50", badge: "bg-green-600" },
  5: { label: "RECYCLE", box: "border-gold-300 bg-gold-50", badge: "bg-gold-500" },
};

const TYPE_TEXT = {
  your: "your credit",
  next_slot: "For Next slot ",
  recycle: "Recycle ( to upline)",
};

const money = (n) => `$${Number(n ?? 0).toLocaleString()}`;

function MatrixBoxes({ slot }) {
  // legs of current cycle 
  const legsInCycle = slot.legs.filter((l) => l.cycle === slot.current_cycle);
  const byPosition = Object.fromEntries(legsInCycle.map((l) => [l.position, l]));

  return (
    <div className="grid grid-cols-5 gap-2">
      {[1, 2, 3, 4, 5].map((pos) => {
        const meta = POSITION_META[pos];
        const leg = byPosition[pos];

        return (
          <div
            key={pos}
            className={`flex min-h-[110px] flex-col items-center rounded-xl border-2 p-2 text-center ${meta.box} ${
              leg ? "" : "opacity-60"
            }`}
          >
            <span
              className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-ink-50 ${meta.badge}`}
            >
              {pos}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-600">
              {meta.label}
            </span>

            {leg ? (
              <>
                <span className="mt-1 w-full truncate text-xs font-semibold text-ink-900">
                  {leg.name}
                </span>
                <span className="text-xs font-bold text-green-700">{money(leg.amount)}</span>
              </>
            ) : (
              <span className="mt-2 text-[11px] text-ink-400">Empty</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MatrixSlots() {
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/my-matrix")
      .then(({ data }) => {
        setSlots(data.data);
        // select the highest active slot by default
        const active = data.data.filter((s) => s.activated_at);
        if (active.length) setSelected(active[active.length - 1].slot_number);
      })
      .catch(() => setError("Could not load your slots."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-ink-500">Loading slots...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const current = slots.find((s) => s.slot_number === selected);

  return (
    <div className="rounded-2xl border border-brand-100 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Grid3x3 size={18} className="text-brand-600" />
        <h2 className="text-base font-bold text-ink-900">My Slots &amp; 5×5 Matrix</h2>
      </div>

      {/* Slot chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {slots.map((s) => {
          const isActive = !!s.activated_at;
          const isSelected = s.slot_number === selected;

          return (
            <button
              key={s.slot_number}
              type="button"
              disabled={!isActive}
              onClick={() => setSelected(s.slot_number)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                isSelected
                  ? "border-brand-500 bg-brand-100 text-brand-800"
                  : isActive
                  ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                  : "cursor-not-allowed border-ink-200 bg-ink-50 text-ink-400"
              }`}
            >
              {isActive ? <CheckCircle2 size={14} /> : <Lock size={14} />}
              {money(s.amount)}
            </button>
          );
        })}
      </div>

      {current && current.activated_at && (
        <>
          {/* Summary */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Slot" value={`#${current.slot_number} (${money(current.amount)})`} />
            <Stat label="Cycle" value={current.current_cycle} />
            <Stat label="Legs (total)" value={current.total_legs} />
            <Stat label="Earned" value={money(current.earned)} />
          </div>

          <p className="mb-2 text-xs text-ink-500">
            Slot activated: {new Date(current.activated_at).toLocaleString()}
          </p>

          {/* YOU + 5 boxes */}
          <div className="mb-2 flex justify-center">
            <span className="rounded-lg bg-brand-500 px-6 py-1.5 text-sm font-bold text-ink-50">
              YOU
            </span>
          </div>
          <MatrixBoxes slot={current} />

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-600">
            <Legend color="bg-green-600" text="2 Your (1 & 4)" />
            <Legend color="bg-brand-500" text="2 Next Slot (2 & 3)" />
            <Legend color="bg-gold-500" text="1 Recycle (5)" />
          </div>

          {/* Legs table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-brand-100 bg-brand-50 text-xs uppercase text-ink-500">
                <tr>
                  <th className="px-3 py-2.5">Cycle</th>
                  <th className="px-3 py-2.5">Position</th>
                  <th className="px-3 py-2.5">Referral</th>
                  <th className="px-3 py-2.5">Amount</th>
                  <th className="px-3 py-2.5">Credit</th>
                  <th className="px-3 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {current.legs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-5 text-center text-ink-400">
                      Still not activate this slot by any referral.
                    </td>
                  </tr>
                ) : (
                  current.legs.map((l, i) => (
                    <tr key={i} className="border-b border-brand-50 last:border-0">
                      <td className="px-3 py-2.5 text-ink-600">{l.cycle}</td>
                      <td className="px-3 py-2.5 font-semibold text-ink-800">{l.position}</td>
                      <td className="px-3 py-2.5 font-medium text-ink-900">{l.name}</td>
                      <td className="px-3 py-2.5 font-semibold text-green-700">{money(l.amount)}</td>
                      <td className="px-3 py-2.5 text-ink-600">{TYPE_TEXT[l.type]}</td>
                      <td className="px-3 py-2.5 text-ink-500">
                        {l.purchased_at ? new Date(l.purchased_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!slots.some((s) => s.activated_at) && (
        <p className="text-sm text-ink-500">
          Still not activate youe slot yet.First Activate  $50 slot.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-brand-50 px-3 py-2">
      <p className="text-[11px] uppercase text-ink-500">{label}</p>
      <p className="text-sm font-bold text-ink-900">{value}</p>
    </div>
  );
}

function Legend({ color, text }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {text}
    </span>
  );
}