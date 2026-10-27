import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

const EXPLORER = "https://testnet.bscscan.com/address/";

export default function WalletAddress({ address, full = false }) {
  const [copied, setCopied] = useState(false);

  if (!address) return <span className="text-xs text-ink-400">Not linked</span>;

  const text = full ? address : `${address.slice(0, 6)}...${address.slice(-4)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // clipboard not available
    }
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-700"
      onClick={(e) => e.stopPropagation()}   // don't navigate on table row click
    >
      <span title={address}>{text}</span>
      <button type="button" onClick={copy} className="text-ink-400 hover:text-brand-600" title="Copy">
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <a href={`${EXPLORER}${address}`} target="_blank" rel="noreferrer" className="text-ink-400 hover:text-brand-600" title="View on BscScan">
        <ExternalLink size={13} />
      </a>
    </span>
  );
}