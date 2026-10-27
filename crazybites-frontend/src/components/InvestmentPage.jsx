import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Lock, CheckCircle2, Zap } from "lucide-react";
import api from "../api/axios";
import ConnectWallet from "./ConnectWallet";
import { linkWallet } from "../chain/deposit";
import { payForSlot } from "../chain/chainPay";
import { refreshWalletBalance } from "../chain/useWalletBalance";

const CHAIN_MODE = import.meta.env.VITE_CHAIN_ENABLED === "true";
// Admin "View as user" mode (read-only): activation / MetaMask payment band
const isViewOnly = () => Boolean(localStorage.getItem("admin_token_backup"));

const STATUS_UI = {
  locked:    { label: "Locked",    badge: "bg-ink-200 text-ink-500" },
  unlocked:  { label: "Ready",     badge: "bg-gold-100 text-gold-800" },
  active:    { label: "Active",    badge: "bg-brand-100 text-brand-700" },
  completed: { label: "Completed", badge: "bg-green-100 text-green-700" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function InvestmentPage() {
  const { user, onUserUpdate } = useOutletContext();

  const [slots, setSlots] = useState([]);
  const [activationCompleted, setActivationCompleted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchSlots = async () => {
    try {
      const { data } = await api.get("/investment/slots");
      setSlots(data.data.slots);
      setActivationCompleted(data.data.activation_completed);
    } catch (err) {
      setMessage({ type: "error", text: "Could not load investment slots." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  // USDT deposit from the wallet: order -> approve + deposit -> poll until Laravel marks it paid
 const activateWithWallet = async (slot) => {
  // The MetaMask account must be the wallet linked to THIS logged-in user
  const accts = await window.ethereum.request({ method: "eth_accounts" });
  const current = accts?.[0]?.toLowerCase();
  const linked = user?.wallet_address?.toLowerCase();
  if (linked) {
    if (current !== linked) {
      throw new Error(`Please switch MetaMask to your linked wallet (${linked.slice(0, 6)}...${linked.slice(-4)}).`);
    }
  } else {
    await linkWallet();   // no wallet linked yet: link the selected MetaMask account
  }

  const { data } = await api.post("/chain/orders", { slot_number: slot.slot_number });
    const stepText = {
    approve:  "Approve USDT in MetaMask...",
    activate: "Confirm slot activation in MetaMask...",
    mined:    "Transaction mined, verifying...",
  };

  const txHash = await payForSlot(
    { order: data.order, sponsorWallet: data.sponsor_wallet ?? data.order.sponsor_wallet },
    (step) => setMessage({ type: "success", text: stepText[step] })
  );
  setMessage({ type: "success", text: "Payment sent. Waiting for confirmation (about a minute)..." });

  // Send the tx hash to Laravel; it reads the chain receipt and verifies it
  await api.post(`/chain/orders/${data.order.id}/tx`, { tx_hash: txHash });

  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const { data: o } = await api.get(`/chain/orders/${data.order.id}`);

    if (o.status === "paid") {
      setMessage({ type: "success", text: "Slot activated!" });
      refreshWalletBalance();   // update the wallet balance everywhere right away
      const me = await api.get("/user");
      onUserUpdate?.(me.data);
      fetchSlots();
      return;
    }
    if (o.status === "failed_needs_refund") {
      throw new Error("Payment received but activation failed. Contact support for refund.");
    }
    if (o.status === "tx_failed") {
      throw new Error("Transaction failed on chain. Please try again.");
    }
    if (o.status === "tx_invalid") {
      throw new Error("This transaction is not a valid deposit for this order.");
    }
  }
  throw new Error("Still waiting. Refresh this page in a minute.");
  };

  const activateWithoutWallet = async (slot) => {
    const { data } = await api.post("/purchase", { amount: slot.amount });
    setMessage({ type: "success", text: data.message || "Slot activated!" });
    onUserUpdate?.(data.data.user);
    fetchSlots();
  };

  const handleActivate = async (slot) => {
    if (purchasing !== null) return;
    if (isViewOnly()) {
      setMessage({ type: "error", text: "View-only mode: admin cannot activate a slot for a user." });
      return;
    }

    const ok = window.confirm(
      `Slot ${slot.slot_number} ($${slot.amount.toLocaleString()}) Do you want to activate now? $${slot.amount.toLocaleString()}.`
    );
    if (!ok) return;

    setMessage(null);
    setPurchasing(slot.amount);
    try {
      if (CHAIN_MODE) {
        await activateWithWallet(slot);
      } else {
        await activateWithoutWallet(slot);
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || err.shortMessage || err.message || "Activation failed. Please try again.",
      });
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return <p className="py-10 text-center text-sm text-ink-500">Loading slots...</p>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div>
        <p className="text-sm text-ink-500">
          <Link to="/dashboard" className="font-medium text-brand-600 hover:underline">
            Dashboard
          </Link>{" "}
          / Invest Now
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Invest Now</h1>
        <p className="text-sm text-ink-500">Select a package to activate it.</p>
      </div>

      {CHAIN_MODE && !isViewOnly() && <ConnectWallet />}

      {!activationCompleted && (
        <div className="rounded-lg border border-gold-300 bg-gold-50 px-4 py-3 text-sm text-gold-900">
          Your account is inactive. To activate your Account with slot of $50
        </div>
      )}

      {message && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-2xl border border-brand-100 bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-ink-900">Select Package</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => {
            const ui = STATUS_UI[slot.status] ?? STATUS_UI.locked;
            const isLocked = slot.status === "locked";
            const isReady = slot.status === "unlocked";
            const isActive = slot.status === "active";
            const isProcessing = purchasing === slot.amount;

            return (
              <button
                key={slot.amount}
                type="button"
                disabled={!isReady || purchasing !== null || isViewOnly()}
                onClick={() => handleActivate(slot)}
                className={`slot-card ${isActive ? "is-active" : isReady ? "is-ready" : "is-locked"} ${
                  isReady && purchasing !== null ? "opacity-60" : ""
                }`}
              >
                {/* Top row (blurred when locked / ready, as in TPR) */}
                <div className={`slot-top ${isActive ? "" : "slot-ghost"}`}>
                  <span className="slot-num">{slot.slot_number}</span>
                  <span className="slot-price">
                    <i className="slot-coin" /> ${slot.amount.toLocaleString()}
                  </span>
                </div>

                {!isActive && (
                  <div className="slot-ghost slot-skel" aria-hidden="true">
                    <span /><span /><span /><span />
                  </div>
                )}

                <div className="slot-center">
                  <span className={`orb ${isActive ? "orb-green" : isReady ? "orb-gold orb-pulse" : ""}`}>
                    {isLocked ? <Lock size={28} /> : isActive ? <CheckCircle2 size={30} /> : <Zap size={30} />}
                  </span>

                  <span className="slot-name">Slot {slot.slot_number}</span>

                  <span className={`slot-state ${isActive ? "text-green-500" : isReady ? "text-gold-500" : "text-ink-600"}`}>
                    {isProcessing ? "Processing..." : isActive ? "Active" : isReady ? "Next upgrade" : "Locked"}
                  </span>

                  <span className="slot-amount">${slot.amount.toLocaleString()}</span>

                  {isReady && !isProcessing && <span className="text-[11px] text-ink-500">Click to activate</span>}
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-xs text-ink-500">
          First activate the first slot with $50.
        </p>
      </div>
    </div>
  );
}