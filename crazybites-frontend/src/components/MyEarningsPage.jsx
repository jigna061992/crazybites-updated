import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Wallet, TrendingUp, ArrowUpCircle, ArrowDownCircle, ArrowUpFromLine, Gift, Crown, Building2, Send } from "lucide-react";
import api from "../api/axios";
import useWalletBalance, { CHAIN_MODE } from "../chain/useWalletBalance";

const TYPE_LABEL = {
  credit: "Wallet Credit",
  upgrade_used: "Used for Upgrade",
  recycle: "Recycle",
  purchase: "Slot Purchase",
  reward: "Reward Wallet",
  rank_reward: "Rank Achievement",
  rank_royalty: "Rank Royalty",       //  NEW
  royalty: "Royalty Wallet",
};
const TYPE_STYLE = {
  credit: "bg-green-100 text-green-700",
  upgrade_used: "bg-brand-100 text-brand-700",
  recycle: "bg-teal-100 text-teal-700",
  purchase: "bg-red-100 text-red-700",
  reward: "bg-gold-100 text-gold-700",
  rank_reward: "bg-gold-200 text-gold-800",
  rank_royalty: "bg-teal-200 text-teal-800",   //  NEW
  royalty: "bg-brand-100 text-brand-700",
};

export default function MyEarningsPage() {
  const { user } = useOutletContext();   // used for the admin check

  // Chain mode: real USDT balance of the linked wallet (auto refresh)
  const useChainBalance = CHAIN_MODE && !Boolean(Number(user.is_admin)) && Boolean(user.wallet_address);
  const chainBal = useWalletBalance(user.wallet_address, useChainBalance);

  const [timeline, setTimeline] = useState([]);
  const [totals, setTotals] = useState({
    wallet_balance: 0,
    reward_wallet: 0,
    reward_breakdown: { from_matrix: 0, from_rank: 0 },
    royalty_wallet: 0,
    total_debit: 0,
    total_credited: 0,
    used_for_upgrade: 0,
    net_earned: 0,
    given_to_sponsor: 0,
    company_wallet: 0,
    sent_to_company_wallet: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/my-earnings")
      .then(({ data }) => {
        setTimeline(data.timeline ?? []);
        setTotals({
          wallet_balance: data.wallet_balance ?? 0,
          reward_wallet: data.reward_wallet ?? 0,
          reward_breakdown: data.reward_breakdown ?? { from_matrix: 0, from_rank: 0 },
          royalty_wallet: data.royalty_wallet ?? 0,
          total_debit: data.total_debit ?? 0,
          total_credited: data.total_credited ?? 0,
          used_for_upgrade: data.used_for_upgrade ?? 0,
          net_earned: data.net_earned ?? 0,
          given_to_sponsor: data.given_to_sponsor ?? 0,
          company_wallet: data.company_wallet ?? 0,
          sent_to_company_wallet: data.sent_to_company_wallet ?? 0,
        });
      })
      .catch(() => setError("Could not load your earnings."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-10 text-center text-sm text-ink-500">Loading earnings...</p>;
  if (error) return <p className="py-10 text-center text-sm text-red-600">{error}</p>;

  const money = (n) => `$${Number(n ?? 0).toLocaleString()}`;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div>
        <p className="text-sm text-ink-500">
          <Link to="/dashboard" className="font-medium text-brand-600 hover:underline">Dashboard</Link> / My Earnings
        </p>
        <h1 className="mt-1 text-2xl font-bold text-brand-600">My Earnings</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-card p-5 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-600">
            <TrendingUp size={20} />
          </span>
          <div>
            <p className="text-xs text-ink-500">Total Credited (gross)</p>
            <p className="text-xl font-bold text-ink-900">{money(totals.total_credited)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-card p-5 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ArrowDownCircle size={20} />
          </span>
          <div>
            <p className="text-xs text-ink-500">My Purchases (Debit)</p>
            <p className="text-xl font-bold text-ink-900">{money(totals.total_debit)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-card p-5 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <ArrowUpCircle size={20} />
          </span>
          <div>
            <p className="text-xs text-ink-500">Used for Upgrades</p>
            <p className="text-xl font-bold text-ink-900">{money(totals.used_for_upgrade)}</p>
          </div>
        </div>

        {/* Reward Wallet — breakdown (matrix / rank) niche */}
        <div className="flex flex-col gap-2 rounded-2xl border border-gold-200 bg-gold-50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-500 text-ink-50">
              <Gift size={20} />
            </span>
            <div>
              <p className="text-xs text-gold-700">Reward Wallet</p>
              <p className="text-xl font-bold text-gold-800">{money(totals.reward_wallet)}</p>
            </div>
          </div>
          <div className="flex justify-between border-t border-gold-200 pt-2 text-xs text-gold-700">
            <span>From Matrix: {money(totals.reward_breakdown.from_matrix)}</span>
            <span>From Rank: {money(totals.reward_breakdown.from_rank)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-5 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-ink-50">
            <Crown size={20} />
          </span>
          <div>
            <p className="text-xs text-brand-700">Royalty Wallet</p>
            <p className="text-xl font-bold text-brand-800">{money(totals.royalty_wallet)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-500 text-ink-50">
            <ArrowUpFromLine size={20} />
          </span>
          <div>
            <p className="text-xs text-teal-700">Given to Sponsor</p>
            <p className="text-xl font-bold text-teal-800">{money(totals.given_to_sponsor)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-5 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-ink-50">
            <Wallet size={20} />
          </span>
          <div>
            <p className="text-xs text-brand-700">Wallet Balance</p>
            <p className="text-xl font-bold text-brand-800">{money(useChainBalance ? (chainBal.usdt ?? 0) : Math.max(0, Number(totals.wallet_balance)))}</p>
          </div>
        </div>

        {/* 👇 Company wallet cards — FAKT ADMIN ne j dekhay */}
        {Boolean(Number(user?.is_admin)) && (
          <>
            {/* Company Wallet — GLOBAL total */}
            <div className="flex items-center gap-3 rounded-2xl border border-ink-300 bg-ink-50 p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-300 text-ink-900">
                <Building2 size={20} />
              </span>
              <div>
                <p className="text-xs text-ink-600">Company Wallet</p>
                <p className="text-xl font-bold text-ink-900">{money(totals.company_wallet)}</p>
              </div>
            </div>

            {/* Sent to Company (by me) — PER-USER */}
            <div className="flex items-center gap-3 rounded-2xl border border-ink-300 bg-ink-100 p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-200 text-ink-800">
                <Send size={20} />
              </span>
              <div>
                <p className="text-xs text-ink-600">Sent to Company (by me)</p>
                <p className="text-xl font-bold text-ink-900">{money(totals.sent_to_company_wallet)}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-ink-900">Earnings History ({timeline.length})</h2>

        <table className="w-full min-w-[650px] text-left text-sm">
          <thead>
            <tr className="border-b border-brand-100 text-xs uppercase text-ink-500">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Detail</th>
              <th className="py-2 pr-3">Slot</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {timeline.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-ink-400">No activity yet.</td></tr>
            )}
            {timeline.map((row, i) => (
              <tr key={i} className="border-b border-brand-50 last:border-0">
                <td className="py-2.5 pr-3 text-ink-500">{i + 1}</td>
                <td className="py-2.5 pr-3 font-medium text-ink-900">{row.label}</td>
                <td className="py-2.5 pr-3 text-ink-600">{row.slot_number > 0 ? `Slot ${row.slot_number}` : "—"}</td>
                <td className={`py-2.5 pr-3 font-semibold ${row.kind === "debit" ? "text-red-600" : "text-green-600"}`}>
                  {row.kind === "debit" ? "-" : "+"}{money(row.amount)}
                </td>
                <td className="py-2.5 pr-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_STYLE[row.type] || "bg-ink-100 text-ink-600"}`}>
                    {TYPE_LABEL[row.type] || row.type}
                    {row.type === "upgrade_used" && row.upgraded_to_slot ? ` → Slot ${row.upgraded_to_slot}` : ""}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-ink-500">{new Date(row.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}