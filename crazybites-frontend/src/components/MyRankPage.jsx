import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Award, Lock, CheckCircle2 } from "lucide-react";
import api from "../api/axios";
import RankBadge from "./RankBadge";

const money = (n) => `$${Number(n ?? 0).toLocaleString()}`;
const cap = (have, need) => Math.min(Number(have ?? 0), Number(need ?? 0)); // 15/5 -> 5/5
const pct = (have, need) => (Number(need) > 0 ? Math.min(100, Math.round((Number(have) / Number(need)) * 100)) : 100);

function Progress({ label, text, value }) {
  return (
    <div>
      <div className="rc-row">
        <span>{label}</span>
        <b>{text}</b>
      </div>
      <div className="rc-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function RankCard({ r, index }) {
  const tier = String(r.name).toLowerCase(); // Silver -> "silver"

  return (
    <article className={`rank-card cb-flow tier-${tier}`}>
      <div className="rc-head">
        <span className="rc-num">{index + 1}</span>
        <h3 className="rc-name">{r.name}</h3>
      </div>

      <div className="rc-stage">
        <div className="rc-status flex flex-col items-end gap-1">
          {r.achieved ? (
            <span className="flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-semibold text-ink-50">
              <CheckCircle2 size={12} /> Achieved
            </span>
          ) : !r.still_eligible ? (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
              <Lock size={12} /> Expired
            </span>
          ) : (
            <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-800">In Progress</span>
          )}
          {r.royalty_achieved && (
            <span className="flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              <CheckCircle2 size={12} /> Royalty
            </span>
          )}
        </div>

        <RankBadge tier={tier} size={132} />
        <p className="rc-cap">Slot {r.slot_needed} + {r.direct_needed} Directs</p>
      </div>

      <div className="rc-tiles">
        <div className="rc-tile"><small>Target</small><b>Slot {r.slot_needed}</b></div>
        <div className="rc-tile"><small>Reward</small><b>{money(r.reward)}</b></div>
      </div>

      <div className="rc-body">
        <Progress label="Direct Referrals" text={`${cap(r.current_direct, r.direct_needed)} / ${r.direct_needed}`} value={pct(r.current_direct, r.direct_needed)} />
        <Progress label="Team Size" text={`${cap(r.current_team, r.team_needed)} / ${r.team_needed}`} value={pct(r.current_team, r.team_needed)} />
        <Progress label="Slot Achievement" text={`Slot ${cap(r.current_slot, r.slot_needed)} / Slot ${r.slot_needed}`} value={pct(r.current_slot, r.slot_needed)} />
        <p className="rc-note">
          Time limit: {r.days_limit} days ({r.days_elapsed} days elapsed) &bull; royalty has no time limit
        </p>
      </div>

      <div className="rc-reward">
        <small>REWARD</small>
        <div className="rc-amount">{money(r.reward)}</div>
        <div className="rc-roy">{r.royalty}% ROYALTY</div>
        <div className="rc-sub">+ {money(r.royalty_amount)} royalty</div>
      </div>
    </article>
  );
}

export default function MyRankPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/my-rank").then(({ data }) => setData(data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-10 text-center text-sm text-ink-500">Loading rank...</p>;
  if (!data) return <p className="py-10 text-center text-sm text-red-600">Could not load your rank.</p>;

  const currentTier = String(data.current_rank || "").toLowerCase();
  const hasTier = ["silver", "gold", "diamond"].includes(currentTier);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div>
        <p className="text-sm text-ink-500">
          <Link to="/dashboard" className="font-medium text-brand-600 hover:underline">Dashboard</Link> / My Rank
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">My Rank &amp; Rewards</h1>
      </div>

      {/* Summary */}
      <section className="rank-hero flex flex-wrap items-center gap-5">
        <div className="flex items-center gap-4">
          {hasTier ? (
            <RankBadge tier={currentTier} size={72} />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-gold-500">
              <Award size={30} />
            </span>
          )}
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-500">Current Rank</p>
            <p className="text-2xl font-extrabold text-white">{data.current_rank || "No Rank Yet"}</p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap gap-3">
          <div className="rh-stat"><small>Rank reward</small><b className="text-green-600">{money(data.reward_wallet)}</b></div>
          <div className="rh-stat"><small>Rank royalty</small><b className="text-brand-600">{money(data.royalty_wallet)}</b></div>
          <div className="rh-stat"><small>Total earned</small><b className="text-gold-600">{money(data.total_earned)}</b></div>
        </div>
      </section>

      {/* Rank cards */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3" aria-label="Ranks">
        {data.ranks.map((r, i) => (
          <RankCard key={r.name} r={r} index={i} />
        ))}
      </section>

      <p className="rounded-xl border border-gold-300 bg-gold-50 px-4 py-3 text-sm text-gold-900">
        <b>Royalty has no time limit.</b> Even if the reward deadline passes, you still earn the 33% royalty once the rank conditions are met.
      </p>
    </div>
  );
}