// src/chain/useWalletBalance.js
// Live USDT + tBNB balance of a wallet address, read straight from the chain (no MetaMask needed).
// Refreshes every few seconds, when the tab gets focus, and when "cb:refresh-balance" is dispatched.
import { useEffect, useState } from "react";
import { JsonRpcProvider, Contract, formatUnits } from "ethers";

const RPC = import.meta.env.VITE_BSC_RPC;
const USDT_ADDRESS = import.meta.env.VITE_USDT_ADDRESS;
const CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID_HEX || "0x61", 16);
const USDT_ABI = ["function balanceOf(address) view returns (uint256)"];

// True only when chain mode is on AND the RPC + USDT address are configured (otherwise the in-app balance is shown)
export const CHAIN_MODE = import.meta.env.VITE_CHAIN_ENABLED === "true" && Boolean(RPC) && Boolean(USDT_ADDRESS);

// Ask every balance widget to refresh right now (e.g. after a slot is activated)
export const refreshWalletBalance = () => window.dispatchEvent(new Event("cb:refresh-balance"));

export const formatUsd = (n) =>
  `$${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function useWalletBalance(address, enabled = true, intervalMs = 8000) {
  const [balance, setBalance] = useState({ usdt: null, tbnb: null });

  useEffect(() => {
    if (!enabled || !address || !RPC || !USDT_ADDRESS) {
      setBalance({ usdt: null, tbnb: null });
      return;
    }

    let stopped = false;
    const provider = new JsonRpcProvider(RPC, CHAIN_ID, { staticNetwork: true });
    const token = new Contract(USDT_ADDRESS, USDT_ABI, provider);

    const load = async () => {
      try {
        const [u, b] = await Promise.all([token.balanceOf(address), provider.getBalance(address)]);
        if (!stopped) setBalance({ usdt: Number(formatUnits(u, 18)), tbnb: Number(formatUnits(b, 18)) });
      } catch (e) {
        /* keep the last value; try again on the next tick */
      }
    };

    load();
    const id = setInterval(load, intervalMs);
    window.addEventListener("focus", load);
    window.addEventListener("cb:refresh-balance", load);

    return () => {
      stopped = true;
      clearInterval(id);
      window.removeEventListener("focus", load);
      window.removeEventListener("cb:refresh-balance", load);
      provider.destroy?.();
    };
  }, [address, enabled, intervalMs]);

  return balance;
}
