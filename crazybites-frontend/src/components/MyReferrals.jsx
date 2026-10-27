import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import api from "../api/axios";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-ink-100 text-ink-500",
};

const FILTERS = [
  { key: "all", label: "All User" },
  { key: "active", label: "Active User" },
  { key: "inactive", label: "Inactive User" },
];

export default function MyReferrals() {
  const [referrals, setReferrals] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    api
      .get("/my-referrals")
      .then(({ data }) => {
        setReferrals(data.referrals);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = referrals
    .filter((r) => {
      if (filter === "all") return true;
      return r.user_status?.toLowerCase() === filter;
    })
    .filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.username?.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, perPage);

  if (loading) return <p className="text-sm text-ink-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Breadcrumb */}
      <div className="mb-1 text-sm">
        <Link to="/dashboard" className="text-brand-600 hover:underline">Dashboard</Link>
        <span className="mx-2 text-ink-400">/</span>
        <span className="text-brand-600">Referrals &amp; Downline</span>
        <span className="mx-2 text-ink-400">/</span>
        <span className="text-ink-500">My Referral</span>
      </div>
      <h3 className="mb-4 text-2xl font-bold text-ink-900">My Referral</h3>

      <div className="rounded-2xl border border-brand-100 bg-card p-5 shadow-sm">
        {/* Header row */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-ink-900">My Referrals List</h3>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            {total} Referrals
          </span>
        </div>

        {/* Filter tabs */}
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-brand-100 bg-card text-ink-600 hover:bg-brand-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Show entries + Search */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-ink-600">
            <span>Show</span>
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="rounded-md border border-brand-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-600">Search:</span>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-md border border-brand-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 bg-brand-50/60 text-xs uppercase text-ink-500">
                <th className="py-2.5 pl-3 pr-4">#</th>
                <th className="py-2.5 pr-4">User Name</th>
                <th className="py-2.5 pr-4">Leg</th>
                <th className="py-2.5 pr-4">Activation On</th>
                <th className="py-2.5 pr-4">Total Topup</th>
                <th className="py-2.5 pr-4">Status</th>
                <th className="py-2.5 pr-4">Registered Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-ink-400">
                    No referrals found
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={r.id} className="border-b border-brand-50 last:border-0">
                    <td className="py-2.5 pl-3 pr-4">{i + 1}</td>
                    <td className="py-2.5 pr-4 font-medium text-ink-900">{r.username || r.name}</td>
                    <td className="py-2.5 pr-4">
                      {r.leg_position ? (
                        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                          Leg {r.leg_position}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-ink-600">
                      {r.activated_at ? new Date(r.activated_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-ink-600">{r.total_topup ?? "0.0000"}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          STATUS_STYLES[r.user_status?.toLowerCase()] || STATUS_STYLES.inactive
                        }`}
                      >
                        {r.user_status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-ink-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}