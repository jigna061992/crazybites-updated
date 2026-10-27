import { useState, useEffect, useRef } from "react";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../api/axios";

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

// Page list like: 1 ... 4 5 [6] 7 8 ... 20
function pageList(current, last) {
  const set = new Set([1, last, current - 1, current, current + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1, from: 0, to: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [opening, setOpening] = useState(null);
  const [error, setError] = useState("");
  const reqId = useRef(0);

  // Row click -> opens that user's dashboard (keeps a backup of the admin token and uses the user token)
  const openDashboard = async (u) => {
    if (opening) return;
    setOpening(u.id);
    setError("");
    try {
      const { data } = await api.post(`/admin/users/${u.id}/impersonate`);
      if (!localStorage.getItem("admin_token_backup")) {
        localStorage.setItem("admin_token_backup", localStorage.getItem("auth_token") || "");
      }
      localStorage.setItem("auth_token", data.data.token);
      window.location.href = "/dashboard";
    } catch (e) {
      setError(e.response?.data?.message || "Could not open this user's dashboard.");
      setOpening(null);
    }
  };

  // Search: after typing, wait 400ms, then query the server and go to page 1
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Data load (when page / perPage / search change)
  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    api
      .get("/admin/users", { params: { page, per_page: perPage, search } })
      .then(({ data }) => {
        if (id !== reqId.current) return; //  ignore old response
        setUsers(data.data);
        setMeta({
          total: data.total,
          current_page: data.current_page,
          last_page: data.last_page,
          from: data.from ?? 0,
          to: data.to ?? 0,
        });
        if (data.current_page !== page) setPage(data.current_page);
      })
      .catch((e) => {
        if (id === reqId.current) setError(e.response?.data?.message || "Could not load users.");
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [page, perPage, search]);

  const goTo = (p) => {
    if (p < 1 || p > meta.last_page || p === page) return;
    setPage(p);
  };

  const btn =
    "flex h-9 min-w-9 items-center justify-center rounded-md border border-ink-300 bg-ink-100 px-2.5 text-sm font-semibold text-white transition hover:border-brand-500 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="rounded-2xl border border-ink-200 bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">All User Report ({meta.total})</h2>
        <input
          type="text"
          placeholder="Search by name or sponsor ID..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="rounded-md border border-ink-300 bg-ink-100 px-3 py-2 text-sm text-white outline-none placeholder:text-ink-400 focus:border-brand-500"
        />
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <p className="mb-3 text-xs text-ink-500">Click on any user row — open Dashboard of that User (only for view, can not change).</p>

      <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-200 text-xs uppercase text-ink-500">
            <tr>
              <th className="py-2.5 pr-4">#</th>
              <th className="py-2.5 pr-4">Name</th>
              <th className="py-2.5 pr-4">Sponsor ID</th>
              <th className="py-2.5 pr-4">Referred By</th>
              <th className="py-2.5 pr-4">Wallet</th>
              <th className="py-2.5 pr-4">Status</th>
              <th className="py-2.5 pr-4">Activation On</th>
              <th className="py-2.5 pr-4">Sign Up On</th>
              <th className="py-2.5 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-ink-400">
                  {loading ? "Loading..." : "No users found."}
                </td>
              </tr>
            ) : (
              users.map((u, i) => (
                <tr
                  key={u.id}
                  role="link"
                  tabIndex={0}
                  title="Open this user's dashboard"
                  onClick={() => openDashboard(u)}
                  onKeyDown={(e) => e.key === "Enter" && openDashboard(u)}
                  className={`cursor-pointer border-b border-ink-200 last:border-0 hover:bg-brand-500/10 ${opening === u.id ? "opacity-60" : ""}`}
                >
                  <td className="py-2.5 pr-4 text-ink-500">{(meta.from || 1) + i}</td>
                  <td className="py-2.5 pr-4 font-medium text-white">{u.name}</td>
                  <td className="py-2.5 pr-4 text-ink-700">{u.sponsor_id}</td>
                  <td className="py-2.5 pr-4 text-ink-700">{u.referred_by_name} ({u.referred_by})</td>
                  <td className="py-2.5 pr-4 font-semibold text-white">${Number(u.wallet_balance).toLocaleString()}</td>
                  <td className="py-2.5 pr-4 font-semibold text-green-500">{u.status}</td>
                  <td className="py-2.5 pr-4 text-ink-500">{u.activation_on ? new Date(u.activation_on).toLocaleString() : "—"}</td>
                  <td className="py-2.5 pr-4 text-ink-500">{new Date(u.signup_on).toLocaleString()}</td>
                  <td className="py-2.5 pr-2 text-brand-600">
                    {opening === u.id ? <span className="text-xs">Opening...</span> : <ExternalLink size={15} />}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Pagination ---------- */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 pt-4">
        <div className="flex items-center gap-3 text-sm text-ink-500">
          <span>
            Showing <b className="text-white">{meta.from}</b>–<b className="text-white">{meta.to}</b> of{" "}
            <b className="text-white">{meta.total}</b>
          </span>
          <label className="flex items-center gap-2">
            Rows
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="rounded-md border border-ink-300 bg-ink-100 px-2 py-1.5 text-sm text-white outline-none focus:border-brand-500"
            >
              {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" className={btn} disabled={page <= 1 || loading} onClick={() => goTo(page - 1)} aria-label="Previous page">
            <ChevronLeft size={16} />
          </button>

          {pageList(meta.current_page, meta.last_page).map((p, i) =>
            p === "…" ? (
              <span key={`dots-${i}`} className="px-1 text-ink-400">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => goTo(p)}
                disabled={loading}
                className={`${btn} ${p === meta.current_page ? "!border-brand-500 !bg-brand-500 text-white" : ""}`}
              >
                {p}
              </button>
            )
          )}

          <button type="button" className={btn} disabled={page >= meta.last_page || loading} onClick={() => goTo(page + 1)} aria-label="Next page">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}