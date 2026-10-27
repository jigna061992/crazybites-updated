import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const money = (n) => `$${Number(n ?? 0).toLocaleString()}`;
const when = (d) => (d ? new Date(d).toLocaleString() : "—");

const TYPE_LABEL = {
  recycle: "Cycle Complete",
  upgrade_used: "Used for Upgrade",
  reward: "Matrix Reward",
  royalty: "Matrix Royalty",
};
const TYPE_STYLE = {
  recycle: "bg-teal-100 text-teal-700",
  upgrade_used: "bg-brand-100 text-brand-700",
  reward: "bg-gold-100 text-gold-700",
  royalty: "bg-green-100 text-green-700",
};

const CONFIG = {
  "reward-royalty": {
    title: "Reward & Royalty Earning",
    sub: "Reward and royalty received on achieving a rank.",
    endpoint: "/my-earnings/reward-royalty",
    columns: ["#", "Rank", "Reward", "Reward Date", "Royalty", "Royalty Date"],
    row: (r, i) => [i + 1, `${r.rank_name} Rank`, money(r.reward_amount), when(r.reward_achieved_at), money(r.royalty_amount), when(r.royalty_achieved_at)],
  },
  matrix: {
    title: "Matrix Earning",
    sub: "Details of upgrades / rewards received when a matrix cycle is completed.",
    endpoint: "/my-earnings/matrix",
    columns: ["#", "From User", "Slot", "Amount", "Type", "Date"],
    row: (r, i) => [
      i + 1,
      `${r.from_user_name}${r.from_sponsor_id && r.from_sponsor_id !== "—" ? ` (${r.from_sponsor_id})` : ""}`,
      `Slot ${r.slot_number}${r.upgraded_to_slot ? ` → ${r.upgraded_to_slot}` : ""}`,
      money(r.amount),
      <span key="t" className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_STYLE[r.type] || "bg-ink-100 text-ink-700"}`}>{TYPE_LABEL[r.type] || r.type}</span>,
      when(r.created_at),
    ],
  },
  referral: {
    title: "Referral Earning",
    sub: "Earnings received when your referral activated their account.",
    endpoint: "/my-earnings/referral",
    columns: ["#", "Referral", "Slot Activated", "Earning", "Date"],
    row: (r, i) => [
      i + 1,
      `${r.from_user_name}${r.from_sponsor_id && r.from_sponsor_id !== "—" ? ` (${r.from_sponsor_id})` : ""}`,
      `Slot ${r.slot_number}`,
      money(r.amount),
      when(r.created_at),
    ],
  },
};

export default function MyEarningDetailPage({ type }) {
  const cfg = CONFIG[type];
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total_amount: 0, cycles: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(cfg.endpoint)
      .then(({ data }) => { setRows(data.data || []); setMeta(data); })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <p className="text-sm text-ink-500">
          <Link to="/dashboard" className="font-medium text-brand-600 hover:underline">Dashboard</Link> / My Earnings / {cfg.title}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">{cfg.title}</h1>
        <p className="text-sm text-ink-500">{cfg.sub}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <span className="cb-tag">Records: {rows.length}</span>
        <span className="cb-tag">Total: {money(meta.total_amount)}</span>
        {type === "matrix" && <span className="cb-tag">Cycles complete: {meta.cycles ?? 0}</span>}
      </div>

      <div className="rounded-2xl border border-ink-200 bg-card p-5">
        {loading ? (
          <p className="py-6 text-center text-sm text-ink-500">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200 text-xs uppercase tracking-wider text-ink-500">
                <tr>{cfg.columns.map((c) => <th key={c} className="py-2.5 pr-4">{c}</th>)}</tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={cfg.columns.length} className="py-8 text-center text-ink-400">No records yet.</td></tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={r.id} className="border-b border-ink-200 last:border-0">
                      {cfg.row(r, i).map((v, j) => <td key={j} className="py-2.5 pr-4 text-ink-700">{v}</td>)}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}