import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import api from "../api/axios";

export default function SignupPage({ setUser }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    sponsorId: "",
    fullName: "",
    dob: "",
    gender: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    address: "",
    pincode: "",
    state: "",
    city: "",
    district: "",
    agreeTerms: false,
    agreeAge: false,
  });
  const [sponsorStatus, setSponsorStatus] = useState("idle"); // idle | checking | valid | invalid
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const verifySponsor = useCallback(async (sponsorId) => {
    if (!sponsorId) {
      setSponsorStatus("idle");
      return;
    }
    setSponsorStatus("checking");
    try {
      const { data } = await api.get("/sponsor/verify", {
        params: { sponsor_id: sponsorId },
      });
      setSponsorStatus(data?.valid ? "valid" : "invalid");
    } catch (err) {
      setSponsorStatus("invalid");
    }
  }, []);

  const setField = (name, value) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  // Read sponsorId straight from the route's query params ("ref" — to match the referral_link format)
  useEffect(() => {
    const sponsorId = searchParams.get("ref") || "";   // 👈 fix: "sponsorId" → "ref"

    setForm((prev) => ({ ...prev, sponsorId }));

    if (sponsorId) verifySponsor(sponsorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const validate = () => {
    const e = {};
    
    // if sponsorId is empty (direct signup, without a referral), skip the sponsor check
    if (form.sponsorId && sponsorStatus !== "valid") {
      e.sponsorId = "Sponsor not found or inactive";
    }
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.dob) e.dob = "Date of birth is required";
    if (!form.gender) e.gender = "Select a gender";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    if (!/^\d{10}$/.test(form.mobile)) e.mobile = "Enter a valid 10-digit number";
    if (form.password.length < 6) e.password = "Minimum 6 characters";
    if (form.confirmPassword !== form.password) e.confirmPassword = "Passwords do not match";
    if (!form.address.trim()) e.address = "Address is required";
    if (!/^\d{6}$/.test(form.pincode)) e.pincode = "Enter a valid 6-digit pincode";
    if (!form.state.trim()) e.state = "State is required";
    if (!form.city.trim()) e.city = "City is required";
    if (!form.district.trim()) e.district = "District is required";
    if (!form.agreeTerms) e.agreeTerms = "Required";
    if (!form.agreeAge) e.agreeAge = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSubmitMsg(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: form.fullName,
        dob: form.dob,
        gender: form.gender,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
        password_confirmation: form.confirmPassword,
        address: form.address,
        pincode: form.pincode,
        state: form.state,
        city: form.city,
        district: form.district,
      };
      if (form.sponsorId) payload.sponsor_id = form.sponsorId; // if empty, don't send the key at all

      const { data } = await api.post("/register", payload);

      localStorage.setItem("auth_token", data.token);   //  fix: data.data.token → data.token
      setUser(data.user);                      //  fix: App.jsx 's  user state update

      setSubmitMsg({ type: "success", text: "Registration successful!" });
      navigate("/dashboard");
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      }
      const message =
        err.response?.data?.message || "Could not reach the server. Please try again.";
      setSubmitMsg({ type: "error", text: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 py-8 px-4">
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
        {/* ------------------- Sponsor Info ------------------- */}
        <div className="rounded-xl border border-ink-200 bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-brand-600" />
            <h2 className="text-lg font-semibold text-ink-900">Sponsor Info</h2>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-ink-700">Sponsor ID</label>
            <div
              className={`rounded-md border ${
                sponsorStatus === "invalid" ? "border-red-400" : "border-ink-300"
              }`}
            >
              <input
                type="text"
                value={form.sponsorId}
                placeholder="No sponsor ID found in the link"
                className="w-full cursor-not-allowed rounded-md bg-ink-100 px-3 py-2 text-sm text-ink-500 focus:outline-none"
                readOnly
                tabIndex={-1}
              />
            </div>
            {sponsorStatus === "checking" && (
              <span className="text-xs text-ink-500">Checking...</span>
            )}
            {sponsorStatus === "valid" && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 size={14} /> Sponsor verified
              </span>
            )}
            {form.sponsorId && errors.sponsorId && (
              <span className="text-xs text-red-600">{errors.sponsorId}</span>
            )}
          </div>
        </div>

        {/* ------------------- Personal Details ------------------- */}
        <div className="rounded-xl border border-ink-200 bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-brand-600" />
            <h2 className="text-lg font-semibold text-ink-900">Personal Details</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-ink-700">Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {errors.fullName && <span className="text-xs text-red-600">{errors.fullName}</span>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-ink-700">Date of Birth</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setField("dob", e.target.value)}
                  className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.dob && <span className="text-xs text-red-600">{errors.dob}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-ink-700">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setField("gender", e.target.value)}
                  className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="" disabled hidden>Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <span className="text-xs text-red-600">{errors.gender}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-ink-700">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.email && <span className="text-xs text-red-600">{errors.email}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-ink-700">Mobile No.</label>
                <input
                  type="text"
                  value={form.mobile}
                  onChange={(e) => setField("mobile", e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit number"
                  maxLength={10}
                  className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.mobile && <span className="text-xs text-red-600">{errors.mobile}</span>}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-ink-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="Create a password"
                  className="w-full rounded-md border border-ink-300 px-3 py-2 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="text-xs text-red-600">{errors.password}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-ink-700">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-md border border-ink-300 px-3 py-2 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="text-xs text-red-600">{errors.confirmPassword}</span>
              )}
            </div>
          </div>
        </div>

        {/* ------------------- Address Details ------------------- */}
        <div className="rounded-xl border border-ink-200 bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-brand-600" />
            <h2 className="text-lg font-semibold text-ink-900">Address Details</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-ink-700">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Street / locality"
                className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {errors.address && <span className="text-xs text-red-600">{errors.address}</span>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-ink-700">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setField("pincode", e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  maxLength={6}
                  className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.pincode && <span className="text-xs text-red-600">{errors.pincode}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-ink-700">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setField("state", e.target.value)}
                  placeholder="State"
                  className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.state && <span className="text-xs text-red-600">{errors.state}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-ink-700">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="City"
                  className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.city && <span className="text-xs text-red-600">{errors.city}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-ink-700">District</label>
                <input
                  type="text"
                  value={form.district}
                  onChange={(e) => setField("district", e.target.value)}
                  placeholder="District"
                  className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.district && <span className="text-xs text-red-600">{errors.district}</span>}
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={form.agreeTerms}
                onChange={(e) => setField("agreeTerms", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              I have read &amp; agree to the Terms and Conditions
            </label>
            {errors.agreeTerms && (
              <span className="mt-1 block text-xs text-red-600">{errors.agreeTerms}</span>
            )}

            <label className="flex items-start gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={form.agreeAge}
                onChange={(e) => setField("agreeAge", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              I am at least 18 years old (21 in Maharashtra) and a citizen of India
            </label>
            {errors.agreeAge && (
              <span className="mt-1 block text-xs text-red-600">{errors.agreeAge}</span>
            )}
          </div>
        </div>

        {submitMsg && (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              submitMsg.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {submitMsg.text}
          </div>
        )}
        {/*
        <div className="my-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-ink-700">
          <strong>Note:</strong> A one-time activation amount of <strong>₹50</strong> will be automatically processed upon successful registration. This activates your account and starts your ROI earning cycle (up to 3x return).
        </div>
        */}

        <button
          type="submit"
          disabled={submitting}
          className="cb-btn w-full"
        >
          {submitting ? "Submitting..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}