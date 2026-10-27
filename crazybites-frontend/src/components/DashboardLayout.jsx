import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Users, ChevronDown, TrendingUp, Grid3x3,
  LogOut, Menu, X, Wallet, List, DollarSign, Award, Network,
} from "lucide-react";
import RankBadge from "./RankBadge";
import BrandLogo from "./BrandLogo";
import api from "../api/axios";
import useWalletBalance, { CHAIN_MODE, formatUsd } from "../chain/useWalletBalance";

// Sidebar link: the hover / active effect is defined in theme.css (.sb-link)
const linkClass = ({ isActive }) => `sb-link${isActive ? " active" : ""}`;

export default function DashboardLayout({ user, onLogout, onUserUpdate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(true);
  const [earningsOpen, setEarningsOpen] = useState(true);
  const [myEarnOpen, setMyEarnOpen] = useState(true);
  const isAdmin = Boolean(Number(user.is_admin));
  const close = () => setSidebarOpen(false);

  // Chain mode: show the real USDT balance of the user's linked wallet (auto refresh)
  const useChainBalance = CHAIN_MODE && !isAdmin && Boolean(user.wallet_address);
  const chainBal = useWalletBalance(user.wallet_address, useChainBalance);
  const walletText = useChainBalance
    ? (chainBal.usdt === null ? "…" : formatUsd(chainBal.usdt))
    : `$${Math.max(0, Number(user.wallet_balance ?? 0)).toLocaleString()}`;

  // While an admin is viewing a user's dashboard (View as user)
  const impersonating = Boolean(localStorage.getItem("admin_token_backup"));
  const backToAdmin = async () => {
    const adminToken = localStorage.getItem("admin_token_backup");
    try { await api.post("/logout"); } catch (e) { /* user token revoke */ }
    localStorage.setItem("auth_token", adminToken);
    localStorage.removeItem("admin_token_backup");
    window.location.href = "/dashboard/users";
  };

  const tier = String(user.current_rank || "").toLowerCase();
  const hasTier = ["silver", "gold", "diamond"].includes(tier);
  const isActive = user.user_status === "Active" || user.is_active;
  const initial = String(user.name || "U").trim().charAt(0).toUpperCase();

  return (
    <div className={`flex min-h-screen ${isAdmin ? "admin-shell" : ""}`}>
      {/* ============ SIDEBAR (full height, sticky) ============ */}
      <aside
        className={`cb-side fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 -translate-x-full flex-col overflow-y-auto p-4 transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 md:self-start ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : ""
        }`}
      >
        <div className="mb-5 mt-1 flex justify-center">
          <BrandLogo width={216} />
        </div>

        <nav className="flex flex-1 flex-col gap-1.5" aria-label="Main">
          <p className="sb-label">Menu</p>

          {isAdmin ? (
            <>
              <NavLink to="/dashboard" end className={linkClass} onClick={close}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </NavLink>

              <NavLink to="/dashboard/users" className={linkClass} onClick={close}>
                <List size={18} />
                <span>User List</span>
              </NavLink>

              <button type="button" onClick={() => setEarningsOpen((v) => !v)} className="sb-link" aria-expanded={earningsOpen}>
                <DollarSign size={18} />
                <span className="flex-1">Earning Report</span>
                <ChevronDown size={16} className={`transition-transform ${earningsOpen ? "rotate-180" : ""}`} />
              </button>

              {earningsOpen && (
                <div className="sb-sub">
                  <NavLink to="/dashboard/earnings/reward-royalty" className={linkClass} onClick={close}>
                    <span>Reward &amp; Royalty Earning</span>
                  </NavLink>
                  <NavLink to="/dashboard/earnings/company" className={linkClass} onClick={close}>
                    <span>Company Earning</span>
                  </NavLink>
                  <NavLink to="/dashboard/earnings/matrix" className={linkClass} onClick={close}>
                    <span>Matrix Earning</span>
                  </NavLink>
                  <NavLink to="/dashboard/earnings/referral" className={linkClass} onClick={close}>
                    <span>Referral Earning</span>
                  </NavLink>
                </div>
              )}
            </>
          ) : (
            <>
              <NavLink to="/dashboard" end className={linkClass} onClick={close}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </NavLink>

              <NavLink to="/dashboard/investment" className={linkClass} onClick={close}>
                <TrendingUp size={18} />
                <span>Investment</span>
              </NavLink>

              <button type="button" onClick={() => setNetworkOpen((v) => !v)} className="sb-link" aria-expanded={networkOpen}>
                <Users size={18} />
                <span className="flex-1">Network</span>
                <ChevronDown size={16} className={`transition-transform ${networkOpen ? "rotate-180" : ""}`} />
              </button>

              {networkOpen && (
                <div className="sb-sub">
                  <NavLink to="/dashboard/my-referrals" className={linkClass} onClick={close}>
                    <Users size={16} />
                    <span>My Referrals</span>
                  </NavLink>
                  <NavLink to="/dashboard/my-matrix" className={linkClass} onClick={close}>
                    <Grid3x3 size={16} />
                    <span>My Matrix</span>
                  </NavLink>
                  <NavLink to="/dashboard/team-network" className={linkClass} onClick={close}>
                    <Network size={16} />
                    <span>Team Network</span>
                  </NavLink>
                  <NavLink to="/dashboard/my-rank" className={linkClass} onClick={close}>
                    <Award size={16} />
                    <span>My Rank</span>
                  </NavLink>
                </div>
              )}

              <button type="button" onClick={() => setMyEarnOpen((v) => !v)} className="sb-link" aria-expanded={myEarnOpen}>
                <DollarSign size={18} />
                <span className="flex-1">My Earnings</span>
                <ChevronDown size={16} className={`transition-transform ${myEarnOpen ? "rotate-180" : ""}`} />
              </button>

              {myEarnOpen && (
                <div className="sb-sub">
                  <NavLink to="/dashboard/my-earnings" end className={linkClass} onClick={close}>
                    <Wallet size={16} />
                    <span>Summary</span>
                  </NavLink>
                  <NavLink to="/dashboard/my-earnings/reward-royalty" className={linkClass} onClick={close}>
                    <Award size={16} />
                    <span>Reward &amp; Royalty</span>
                  </NavLink>
                  <NavLink to="/dashboard/my-earnings/matrix" className={linkClass} onClick={close}>
                    <Grid3x3 size={16} />
                    <span>Matrix Earning</span>
                  </NavLink>
                  <NavLink to="/dashboard/my-earnings/referral" className={linkClass} onClick={close}>
                    <Users size={16} />
                    <span>Referral Earning</span>
                  </NavLink>
                </div>
              )}
            </>
          )}
        </nav>

        {/* Current rank (normal users only) */}
        {!isAdmin && hasTier && (
          <div className="sb-rank mt-4">
            <RankBadge tier={tier} size={46} laurel />
            <div>
              <small>Your rank</small>
              <strong>{user.current_rank}</strong>
            </div>
          </div>
        )}

        <button type="button" onClick={onLogout} className="sb-link mt-3">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      {sidebarOpen && <div onClick={close} className="fixed inset-0 z-30 bg-black/60 md:hidden" />}

      {/* ============ RIGHT SIDE: top bar + content ============ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {impersonating && (
          <div className="flex flex-wrap items-center justify-center gap-3 border-b border-gold-400/60 bg-gold-100 px-4 py-2 text-sm text-gold-800">
            <span>
              <b>View only</b> — you are viewing <b>{user.name}</b>&apos;s dashboard. No changes can be made.
            </span>
            <button type="button" onClick={backToAdmin} className="cb-btn cb-btn-sm">
              ← Back to Admin
            </button>
          </div>
        )}
        <header className="cb-top sticky top-0 z-20 flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle menu"
            className="rounded-lg border border-ink-200 p-2 text-white hover:bg-white/10 md:hidden"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
            {isAdmin && <span className="cb-pill-gold">ADMIN</span>}

            {!isAdmin && (
              <div className="cb-pill-gold" title="Wallet balance">
                <Wallet size={15} />
                <span>{walletText}</span>
              </div>
            )}

            {!isAdmin && (
              <span className={`cb-pill hidden sm:inline-flex ${isActive ? "ok" : ""}`}>
                {isActive ? "ID Active" : "ID not activated"}
              </span>
            )}

            <span className="hidden text-sm font-semibold text-white sm:inline">{user.name}</span>
            <span className="cb-avatar" title={user.name}>{initial}</span>

            <button type="button" onClick={onLogout} className="cb-logout">
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* ============ CONTENT ============ */}
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet context={{ user, onUserUpdate }} />
        </main>
      </div>
    </div>
  );
}