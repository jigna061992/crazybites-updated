import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User as UserIcon, Lock } from "lucide-react";
import api from "../api/axios";
import BrandLogo from "./BrandLogo";
import CoinMascot from "./CoinMascot";


function LoginPage({ setUser }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setServerError("");
    setLoading(true);
    try {
      const response = await api.post("/login", formData);
      if (response.data.success) {
        const { user, token } = response.data.data;
        localStorage.setItem("auth_token", token);
        localStorage.setItem("auth_user", JSON.stringify(user));
        setUser(user);
        navigate("/dashboard");
      }
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors);
      } else if (err.response?.status === 401) {
        setServerError(err.response.data.message);
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cb-auth-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-5xl items-center justify-center gap-14">
        <div className="hidden lg:block"><CoinMascot size={340} /></div>
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 flex justify-center">
          <BrandLogo width={320} />
        </div>

        {/* Card */}
        <div className="cb-auth-card rounded-2xl p-8">
          <h2 className="text-xl font-bold text-ink-900">Sign in to your account</h2>
          <p className="mt-1 text-sm text-ink-500">Enter your username and password to continue.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-ink-700">Username</label>
              <div className="flex items-center gap-2 rounded-lg border border-ink-200 bg-card px-3 py-2.5 transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30">
                <UserIcon size={18} className="text-ink-400" />
                <input
                  id="username"
                  type="text"
                  name="username"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={handleChange}
                  autoComplete="username"
                  className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
                />
              </div>
              {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username[0]}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-700">Password</label>
              <div className="flex items-center gap-2 rounded-lg border border-ink-200 bg-card px-3 py-2.5 transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30">
                <Lock size={18} className="text-ink-400" />
                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password[0]}</p>}
            </div>

            {serverError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
            )}

            <button type="submit" disabled={loading} className="cb-btn mt-1 w-full">
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <a href="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline">
              Forgot Password?
            </a>
          </div>
          <div className="mt-3 text-center text-sm">
            <span className="text-ink-500">Don&apos;t have an account? </span>
            <a href="/signup" className="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
              Sign Up
            </a>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default LoginPage;
