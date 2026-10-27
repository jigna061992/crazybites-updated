import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import api from "../api/axios";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-ink-100 text-ink-500",
};

// limit: show only the first N on the dashboard (otherwise show all)
export default function ReferralsTable({ limit = null, showViewAll = false }) {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/my-team")
      .then(({ data }) => setTeam(data.data))
      .catch(() => setError("Could not load your referrals."))
      .finally(() => setLoading(false));
  }, []);

  const rows = limit ? team.slice(0, limit) : team;

  return (
    <div className="rounded-2xl border border-brand-100 bg-card shadow-sm">
      <div className="flex items-center gap-2 px-5 pt-5">
        <Users size={18} className="text-brand-600" />
        <h2 className="text-base font-bold text-ink-900">
          My Referrals ({team.length})
        </h2>
        {showViewAll && team.length > 0 && (
          <Link
            to="/dashboard/my-referrals"
            className="ml-auto text-xs font-semibold text-brand-600 hover:underline"
          >
            View all
          </Link>
        )}
      </div>

      {loading && <p className="p-5 text-sm text-ink-500">Loading...</p>}
      {error && <p className="p-5 text-sm text-red-600">{error}</p>}

      {!loading && !error && team.length === 0 && (
        <p className="p-5 text-sm text-ink-500">
          No referral yet. Share your referral link.
        </p>
      )}

      {!loading && !error && team.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-brand-100 bg-brand-50 text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Sponsor ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined On</th>
                <th className="px-4 py-3">Purchases</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((member, i) => (
                <tr key={member.id} className="border-b border-brand-50 last:border-0">
                  <td className="px-4 py-3 text-ink-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{member.name}</td>
                  <td className="px-4 py-3 text-ink-600">{member.sponsor_id}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_STYLES[member.id_status?.toLowerCase()] || STATUS_STYLES.inactive
                      }`}
                    >
                      {member.id_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{member.joined_on}</td>
                  <td className="px-4 py-3 text-ink-600">{member.total_purchases}</td>
                  <td className="px-4 py-3 font-semibold text-ink-900">
                    ${Number(member.purchase_amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}