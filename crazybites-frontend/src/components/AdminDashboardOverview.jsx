import { useState, useEffect } from "react";
import { Users, UserCheck, UserX, Wallet, UserPlus, Zap } from "lucide-react";
import api from "../api/axios";

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-card p-5 shadow-sm">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${tone}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboardOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/dashboard-stats").then(({ data }) => setStats(data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-10 text-center text-sm text-ink-500">Loading...</p>;
  if (!stats) return null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <h2 className="text-xl font-bold text-white">Admin Dashboard</h2>

      <div>
        <p className="mb-2 text-sm font-semibold text-ink-500">Members Summary</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Total Users" value={stats.total_users} tone="bg-brand-500/20 text-brand-500" />
          <StatCard icon={UserCheck} label="Active Users" value={stats.active_users} tone="bg-green-500/20 text-green-500" />
          <StatCard icon={UserX} label="Inactive Users" value={stats.inactive_users} tone="bg-red-500/20 text-red-500" />
          <StatCard icon={Wallet} label="Company Wallet" value={`$${Number(stats.company_wallet).toLocaleString()}`} tone="bg-brand-500/20 text-brand-500" />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-ink-500">Today</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard icon={UserPlus} label="Today Joined" value={stats.today_joined} tone="bg-ink-300/40 text-ink-700" />
          <StatCard icon={Zap} label="Today Activated" value={stats.today_activated} tone="bg-ink-300/40 text-ink-700" />
        </div>
      </div>
    </div>
  );
}