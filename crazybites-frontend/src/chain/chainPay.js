// crazybites-frontend/src/utils/chainPay.js
import { BrowserProvider, Contract, ZeroAddress } from "ethers";

const USDT_ADDRESS   = import.meta.env.VITE_USDT_ADDRESS;
const MATRIX_ADDRESS = import.meta.env.VITE_MATRIX_ADDRESS;
const BSC_TESTNET    = 97n;

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];
const MATRIX_ABI = [
  "function activateSlot(uint8 slot, address sponsor, uint256 orderId)",
];

/**
 * order = response of Laravel createOrder:
 *   { order: { id, slot_number, amount_wei }, sponsor_wallet }
 * onStep("approve" | "activate" | "mined") — to show the status in the UI (optional)
 * Return: activation tx hash  → send this same hash to Laravel's submitTx.
 */
export async function payForSlot({ order, sponsorWallet }, onStep = () => {}) {
  if (!window.ethereum) throw new Error("MetaMask not found");

  const provider = new BrowserProvider(window.ethereum);
  const net = await provider.getNetwork();
  if (net.chainId !== BSC_TESTNET) throw new Error("Select BNB Smart Chain Testnet in MetaMask");

  for (const [name, addr] of [["USDT", USDT_ADDRESS], ["Matrix", MATRIX_ADDRESS]]) {
    if (!addr || (await provider.getCode(addr)) === "0x") {
      throw new Error(`No contract at the ${name} address (${addr}). Check .env`);
    }
  }

  const signer = await provider.getSigner();
  const me     = await signer.getAddress();
  const amount = BigInt(order.amount_wei);

  const usdt   = new Contract(USDT_ADDRESS, ERC20_ABI, signer);
  const matrix = new Contract(MATRIX_ADDRESS, MATRIX_ABI, signer);

  if ((await usdt.balanceOf(me)) < amount) throw new Error("Insufficient USDT balance");

  // 1) approve (only if needed)
  if ((await usdt.allowance(me, MATRIX_ADDRESS)) < amount) {
    onStep("approve");
    const tx1 = await usdt.approve(MATRIX_ADDRESS, amount);
    await tx1.wait();
  }

  // 2) activateSlot — on slot 1 use the sponsor's wallet, ZeroAddress for root
  onStep("activate");
  const sponsor = order.slot_number === 1 && sponsorWallet ? sponsorWallet : ZeroAddress;
  const tx2 = await matrix.activateSlot(order.slot_number, sponsor, order.id);
  const receipt = await tx2.wait();
  onStep("mined");
  return receipt.hash;
}