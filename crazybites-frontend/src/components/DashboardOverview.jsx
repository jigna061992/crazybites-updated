import { useOutletContext } from "react-router-dom";
import { useState } from "react";
import { Copy, Check, Mail, Phone, Wallet, ShieldCheck, Link2 } from "lucide-react";
import ReferralsTable from "./ReferralsTable";
import WalletAddress from "./WalletAddress";
import CoinMascot from "./CoinMascot";

function ReferralCard({ sponsorId, referralLink }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      // clipboard not available, silently ignore
    }
  };

  return (
    <div className="cb-gold-card">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-gold-600"><Link2 size={18} /> Your Personal Link</h2>
      <p className="mb-3 text-xs text-ink-500">
        Sponsor ID: <strong className="text-ink-800">{sponsorId}</strong> — share your link, friends join under you.
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={referralLink}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 truncate rounded-xl border border-ink-300 bg-black/30 px-3 py-2.5 text-xs text-ink-800"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="cb-btn cb-btn-sm flex-shrink-0"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  const { user } = useOutletContext();

  const wallet = Math.max(0, Number(user.wallet_balance ?? user.wallet_amount ?? 0));
  const isActive = user.user_status === "Active" || user.is_active;
  const initial = String(user.name || "U").trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      {/* Welcome banner */}
      <section className="cb-hero cb-glowbox flex flex-wrap items-center gap-5">
        <span className="cb-avatar-lg">{initial}</span>
        <div className="min-w-0">
          <p className="text-sm text-ink-500">Welcome Back,</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl text-white">{user.name}</h1>
            <span className={`cb-tag ${isActive ? "" : "violet"}`}>{isActive ? "Active" : "Not Joined"}</span>
          </div>
          <p className="mt-2 text-xs text-ink-500">Sponsor ID</p>
          <p className="font-display text-base font-bold text-gold-600">{user.sponsor_id || "—"}</p>
        </div>
        <div className="ml-auto hidden sm:block">
          <CoinMascot size={120} />
        </div>
      </section>

      {/* Stat tiles */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="cb-stat"><span className="cb-ico"><Mail size={20} /></span><div className="min-w-0"><small>Email</small><b title={user.email}>{user.email}</b></div></div>
        <div className="cb-stat"><span className="cb-ico"><Phone size={20} /></span><div className="min-w-0"><small>Mobile</small><b>{user.mobile || "—"}</b></div></div>
        <div className="cb-stat"><span className="cb-ico gold"><Wallet size={20} /></span><div className="min-w-0"><small>Wallet Balance</small><b>${Number(wallet).toLocaleString()}</b></div></div>
        <div className="cb-stat"><span className={`cb-ico ${isActive ? "green" : ""}`}><ShieldCheck size={20} /></span><div className="min-w-0"><small>Account Status</small><b>{isActive ? "Active" : "Not Activated"}</b></div></div>
      </section>

      <ReferralCard sponsorId={user.sponsor_id} referralLink={user.referral_link || `${window.location.origin}/signup?ref=${user.sponsor_id}`} />

      <div className="rounded-2xl border border-ink-200 bg-card p-5">
        <p className="mb-1 text-xs uppercase tracking-widest text-ink-500">Wallet Address</p>
        <WalletAddress address={user.wallet_address} full />
      </div>

      {/* My sponsor's members */}
      <ReferralsTable limit={10} showViewAll />
    </div>
  );
}