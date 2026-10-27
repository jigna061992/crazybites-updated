import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import api from "./api/axios";
import DashboardLayout from "./components/DashboardLayout";
import DashboardOverview from "./components/DashboardOverview";
import MyReferrals from "./components/MyReferrals";
import InvestmentPage from "./components/InvestmentPage";
import TreePage from "./components/TreePage";
import MyMatrixPage from "./components/MyMatrixPage";
import MyEarningsPage from "./components/MyEarningsPage";
import MyEarningDetailPage from "./components/MyEarningDetailPage";
import MyRankPage from "./components/MyRankPage";
import AdminUsersPage from "./components/AdminUsersPage";
import AdminEarningsPage from "./components/AdminEarningsPage";
import AdminDashboardOverview from "./components/AdminDashboardOverview";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      api
        .get("/user")
        .then(({ data }) => setUser(data))
        .catch(() => {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("admin_token_backup");
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/logout");
    } catch (e) {
      // token already invalid, ignore
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("admin_token_backup");
      setUser(null);
    }
  };

  if (checking) return null;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/dashboard" />
          ) : (
            <LoginPage setUser={setUser} />
          )
        }
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/dashboard" /> : <SignupPage setUser={setUser} />}
      />

      <Route
        path="/dashboard"
        element={
          user ? (
            <DashboardLayout user={user} onLogout={handleLogout} onUserUpdate={setUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        {user?.is_admin ? (
          <>
            {/* ── ADMIN ROUTES ── */}
            <Route index element={<AdminDashboardOverview />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="earnings/reward-royalty" element={<AdminEarningsPage type="reward-royalty" />} />
            <Route path="earnings/company" element={<AdminEarningsPage type="company" />} />
            <Route path="earnings/matrix" element={<AdminEarningsPage type="matrix" />} />
            <Route path="earnings/referral" element={<AdminEarningsPage type="referral" />} />
          </>
        ) : (
          <>
            {/* ── NORMAL USER ROUTES ── */}
            <Route index element={<DashboardOverview />} />
            <Route path="investment" element={<InvestmentPage />} />
            <Route path="my-referrals" element={<MyReferrals />} />
            <Route path="my-matrix" element={<MyMatrixPage />} />
            <Route path="team-network" element={<TreePage />} />
            <Route path="my-earnings" element={<MyEarningsPage />} />
            <Route path="my-earnings/reward-royalty" element={<MyEarningDetailPage type="reward-royalty" />} />
            <Route path="my-earnings/matrix" element={<MyEarningDetailPage type="matrix" />} />
            <Route path="my-earnings/referral" element={<MyEarningDetailPage type="referral" />} />
            <Route path="my-rank" element={<MyRankPage />} />
          </>
        )}
      </Route>

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}