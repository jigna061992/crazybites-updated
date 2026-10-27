import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { BrowserProvider, Contract, formatUnits } from "ethers";
import api from "../api/axios";
import { CHAIN_ID_HEX, linkWallet, switchToTestnet } from "../chain/deposit";

const USDT_ADDRESS = import.meta.env.VITE_USDT_ADDRESS;
const USDT_ABI = ["function balanceOf(address) view returns (uint256)"];

export default function ConnectWallet() {
  const { onUserUpdate } = useOutletContext();

  const [account, setAccount] = useState(null);
  const [onTestnet, setOnTestnet] = useState(false);
  const [tbnb, setTbnb] = useState(null);
  const [usdt, setUsdt] = useState(null);
  const [error, setError] = useState(null);

  const hasMetaMask = typeof window !== "undefined" && !!window.ethereum;

  const refresh = async (addr) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const net = await provider.getNetwork();
      const ok = "0x" + net.chainId.toString(16) === CHAIN_ID_HEX;
      setOnTestnet(ok);
      setTbnb(formatUnits(await provider.getBalance(addr), 18));

      if (ok && USDT_ADDRESS) {
        const token = new Contract(USDT_ADDRESS, USDT_ABI, provider);
        setUsdt(formatUnits(await token.balanceOf(addr), 18));
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAccounts = (accounts) => {
    if (!accounts || accounts.length === 0) {
      setAccount(null);
      return;
    }
    setAccount(accounts[0]);
    refresh(accounts[0]);
  };

  useEffect(() => {
    if (!hasMetaMask) return;

    window.ethereum.request({ method: "eth_accounts" }).then(handleAccounts);

    const onChain = () => window.location.reload();
    window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, []);

  const connect = async () => {
    setError(null);
    try {
      const address = await linkWallet();
      handleAccounts([address]);

      const me = await api.get("/user");
      onUserUpdate?.(me.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

 // Popup to select another MetaMask account (e.g. Heena)
  const switchAccount = async () => {
    setError(null);
    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      handleAccounts(await window.ethereum.request({ method: "eth_accounts" }));
    } catch (e) {
      setError(e.message);
    }
  };

  if (!hasMetaMask) {
    return <p className="text-sm text-red-600">MetaMask not found. Please install the extension.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-100 bg-card p-4 shadow-sm">
      {account ? (
        <>
          <span className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
          {!onTestnet && (
            <button onClick={switchToTestnet} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700">
              Switch to BSC Testnet
            </button>
          )}
          <span className="text-xs text-ink-600">{tbnb ? Number(tbnb).toFixed(4) : "-"} tBNB</span>
          {usdt !== null && <span className="text-xs text-ink-600">{usdt} USDT</span>}
          <button onClick={switchAccount} className="ml-auto rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-brand-50">
            Switch account
          </button>
        </>
      ) : (
        <button onClick={connect} className="cb-btn cb-btn-sm">
          Connect MetaMask
        </button>
      )}
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}