import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { BrowserProvider } from "ethers";
import api from "../api/axios";
import { CHAIN_ID_HEX, linkWallet, switchToTestnet } from "../chain/deposit";
import useWalletBalance from "../chain/useWalletBalance";

const short = (a) => `${a.slice(0, 6)}...${a.slice(-4)}`;

export default function ConnectWallet() {
  const { user, onUserUpdate } = useOutletContext();

  // Wallet saved for the LOGGED-IN user (from the database), not whatever MetaMask has selected
  const savedWallet = user?.wallet_address ? String(user.wallet_address).toLowerCase() : null;

  const [metaAccount, setMetaAccount] = useState(null);   // account currently selected in MetaMask
  const [onTestnet, setOnTestnet] = useState(false);
  const [error, setError] = useState(null);

  const hasMetaMask = typeof window !== "undefined" && !!window.ethereum;

  const handleAccounts = (accounts) => {
    setMetaAccount(accounts && accounts.length ? String(accounts[0]).toLowerCase() : null);
  };

  // Live balances of the user's linked wallet (read from the chain, auto refresh)
  const { usdt, tbnb } = useWalletBalance(savedWallet, Boolean(savedWallet));

  // Is MetaMask on the right network?
  const checkNetwork = async () => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const net = await provider.getNetwork();
      setOnTestnet("0x" + net.chainId.toString(16) === CHAIN_ID_HEX);
    } catch (e) {
      setError(e.message);
    }
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

  useEffect(() => {
    if (hasMetaMask) checkNetwork();
  }, [savedWallet]);

  // Let the user pick which MetaMask account to use (account picker popup)
  const pickAccount = async () => {
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
    handleAccounts(await window.ethereum.request({ method: "eth_accounts" }));
  };

  // First time: choose an account, then link it to this user
  const connect = async () => {
    setError(null);
    try {
      await pickAccount();
      const address = await linkWallet();
      handleAccounts([address]);

      const me = await api.get("/user");
      onUserUpdate?.(me.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  // Already linked: switch MetaMask to the linked account
  const switchAccount = async () => {
    setError(null);
    try {
      await pickAccount();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!hasMetaMask) {
    return <p className="text-sm text-red-600">MetaMask not found. Please install the extension.</p>;
  }

  const mismatch = savedWallet && metaAccount !== savedWallet;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-100 bg-card p-4 shadow-sm">
      {savedWallet ? (
        <>
          <span className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">
            {short(savedWallet)}
          </span>
          {!onTestnet && (
            <button onClick={switchToTestnet} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700">
              Switch to BSC Testnet
            </button>
          )}
          <span className="text-xs text-ink-600">{tbnb !== null ? tbnb.toFixed(4) : "-"} tBNB</span>
          {usdt !== null && <span className="text-xs text-ink-600">{usdt.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</span>}
          <button onClick={switchAccount} className="ml-auto rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-brand-50">
            Switch account
          </button>
          {mismatch && (
            <p className="w-full text-xs text-gold-600">
              MetaMask is on {metaAccount ? short(metaAccount) : "no account"}. Please switch MetaMask to your linked
              wallet {short(savedWallet)} before activating a slot.
            </p>
          )}
        </>
      ) : (
        <>
          <span className="text-sm text-ink-600">No wallet is linked to this account yet.</span>
          <button onClick={connect} className="cb-btn cb-btn-sm ml-auto">
            Connect MetaMask
          </button>
        </>
      )}
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
