import { BrowserProvider, Contract } from "ethers";
import api from "../api/axios";

export const CHAIN_ID_HEX = import.meta.env.VITE_CHAIN_ID_HEX;   // 0x61 = BSC testnet (97)

const CHAIN = {
  chainId: CHAIN_ID_HEX,
  chainName: "BNB Smart Chain Testnet",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: [import.meta.env.VITE_BSC_RPC],
  blockExplorerUrls: ["https://testnet.bscscan.com"],
};

const USDT_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
];
// const VAULT_ABI = ["function deposit(uint256 amount, uint256 orderId)"];
const VAULT_ABI = [
  "function register(address sponsor) external",
  "function registered(address user) view returns (bool)",
  "function sponsorOf(address user) view returns (address)",
  "function slotActive(address user, uint256 slotNumber) view returns (bool)",
  "function deposit(uint256 amount, uint256 orderId, uint256 slotNumber) external",
];

export async function switchToTestnet() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({ method: "wallet_addEthereumChain", params: [CHAIN] });
    } else {
      throw err;
    }
  }
}

// MetaMask connect, switch on testnet, link address to laravel user
export async function linkWallet() {
 if (!window.ethereum) {
    throw new Error("MetaMask not found.");
  }

  // Step 1: Connect MetaMask account 
  await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  // Step 2: Switch on BNB Testnet 
  await switchToTestnet();
  // Step 3: Get the currently selected account again
  const accounts = await window.ethereum.request({
    method: "eth_accounts",
  });

  if (!accounts || accounts.length === 0) {
    throw new Error("Please connect your MetaMask wallet.");
  }

  const address = accounts[0].toLowerCase();

  console.log("Logged-in Laravel user wallet:", address);

  // Step 4: Link the wallet with Laravel
  const response = await api.post("/chain/wallet", {
    address: address,
  });
   console.log("Wallet linked successfully:", response.data);

  return address;

}

// order = { id, amount_wei } -> 2 transactions: approve (if needed) + deposit

export async function payForOrder(order) {
  await switchToTestnet();

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const owner = (await signer.getAddress()).toLowerCase();

  const vaultAddress = import.meta.env.VITE_VAULT_ADDRESS;
  const usdtAddress = import.meta.env.VITE_USDT_ADDRESS;

  const usdt = new Contract(usdtAddress, USDT_ABI, signer);
  const vault = new Contract(vaultAddress, VAULT_ABI, signer);

  const slotNumber = Number(order.slot_number);
  const orderId = BigInt(order.id);
  const amount = BigInt(order.amount_wei);

  // User/sponsor registration on-chain
  const isRegistered = await vault.registered(owner);
  const sponsorWallet = order.sponsor_wallet?.toLowerCase();

  if (!isRegistered) {
    if (!sponsorWallet) {
      throw new Error("Sponsor wallet is missing.");
    }

    if (!(await vault.registered(sponsorWallet))) {
      throw new Error(
        "Sponsor is not registered on-chain. Register the sponsor first."
      );
    }

    const registerTx = await vault.register(sponsorWallet);
    await registerTx.wait();
  } else if (sponsorWallet) {
    const existingSponsor = (
      await vault.sponsorOf(owner)
    ).toLowerCase();

    if (existingSponsor !== sponsorWallet) {
      throw new Error(
        "On-chain sponsor does not match the Laravel sponsor."
      );
    }
  }

  // Prevent an unnecessary approval if balance is insufficient
  const balance = await usdt.balanceOf(owner);

  if (balance < amount) {
    throw new Error("Not enough test USDT in your wallet.");
  }

  const allowance = await usdt.allowance(owner, vaultAddress);

  if (allowance < amount) {
    const approveTx = await usdt.approve(vaultAddress, amount);
    await approveTx.wait();
  }

  // Contract decides whether sponsor or company receives the USDT
  const tx = await vault.deposit(amount, orderId, slotNumber);
  await tx.wait();

  return tx.hash;
}