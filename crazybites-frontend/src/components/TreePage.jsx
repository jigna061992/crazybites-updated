import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../api/axios";
import ReferralTree from "./ReferralTree";

export default function TreePage() {
  const { user } = useOutletContext();
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    api
      .get("/team-tree")
      .then(({ data }) => setTree(data.data))
      .catch((err) => {
        console.error("Failed to load tree", err);
        setError("Could not load your team tree.");
      })
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="rounded-2xl border border-brand-100 bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-ink-900">Your Team Tree</h2>
      {loading && <p className="text-sm text-ink-500">Loading tree...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && <ReferralTree root={tree} />}
    </div>
  );
}