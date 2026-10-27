import { useState, useEffect } from "react";
import api from "../api/axios";

const CONFIG = {
  "reward-royalty": {
    title: "Reward & Royalty Earning",
    endpoint: "/admin/earnings/reward-royalty",
    columns: ["#", "User", "Sponsor ID", "Rank", "Reward", "Reward Date", "Royalty", "Royalty Date"],
    row: (r, i) => [
      i + 1, r.user_name, r.user_sponsor_id, r.rank_name,
      `$${Number(r.reward_amount).toLocaleString()}`,
      r.reward_achieved_at ? new Date(r.reward_achieved_at).toLocaleString() : "—",
      `$${Number(r.royalty_amount || 0).toLocaleString()}`,
      r.royalty_achieved_at ? new Date(r.royalty_achieved_at).toLocaleString() : "—",
    ],
  },
  company: {
    title: "Company Earning",
    endpoint: "/admin/earnings/company",
    columns: ["#", "From User", "Sponsor ID", "Slot", "Amount", "Reason", "Date"],
    row: (r, i) => [
      i + 1, r.from_user_name, r.from_sponsor_id, r.slot_number,
      `$${Number(r.amount).toLocaleString()}`, r.reason, new Date(r.created_at).toLocaleString(),
    ],
  },
  matrix: {
    title: "Matrix Earning",
    endpoint: "/admin/earnings/matrix",
    columns: ["#", "To User", "From User", "Slot", "Amount", "Type", "Date"],
    row: (r, i) => [
      i + 1, r.to_user_name, r.from_user_name, r.slot_number,
      `$${Number(r.amount).toLocaleString()}`, r.type, new Date(r.created_at).toLocaleString(),
    ],
  },
  referral: {
    title: "Referral Earning",
    endpoint: "/admin/earnings/referral",
    columns: ["#", "To User", "From Referral", "Slot", "Amount", "Date"],
    row: (r, i) => [
      i + 1, r.to_user_name, r.from_user_name, r.slot_number,
      `$${Number(r.amount).toLocaleString()}`, new Date(r.created_at).toLocaleString(),
    ],
  },
};

export default function AdminEarningsPage({ type }) {
  const cfg = CONFIG[type];
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get(cfg.endpoint)
      .then(({ data }) => {
        setRows(data.data);
        setTotalAmount(data.total_amount ?? (Number(data.total_reward || 0) + Number(data.total_royalty || 0)));
      })
      .finally(() => setLoading(false));
  }, [type]);

   return (
    <div className="rounded-2xl border border-ink-200 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{cfg.title} ({rows.length})</h2>
        <span className="rounded-full bg-brand-500/20 px-3 py-1 text-sm font-semibold text-brand-500">
          Total: ${Number(totalAmount).toLocaleString()}
        </span>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-ink-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 text-xs uppercase text-ink-500">
              <tr>{cfg.columns.map((c) => <th key={c} className="py-2.5 pr-4">{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={cfg.columns.length} className="py-6 text-center text-ink-400">No records.</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.id} className="border-b border-ink-200 last:border-0">
                    {cfg.row(r, i).map((val, j) => (
                      <td key={j} className="py-2.5 pr-4 text-ink-700">{val}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

}