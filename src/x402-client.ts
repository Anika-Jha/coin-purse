import "dotenv/config";

import {
  x402Client,
  type SelectPaymentRequirements,
} from "@x402/core/client";

import {
  ExactEvmScheme,
} from "@x402/evm/exact/client";

import {
  privateKeyToAccount,
} from "viem/accounts";

import {
  CONFIG,
} from "./config.js";

import {
  evaluatePayment,
} from "./spending-policy.js";

import {
  getTotalSpent,
} from "./ledger.js";

const privateKey = CONFIG.buyerPrivateKey;

if (!privateKey) {
  throw new Error(
    "Missing BUYER_PRIVATE_KEY. Put the dedicated Base Sepolia testnet key in .env.",
  );
}

export const buyerAccount = privateKeyToAccount(
  privateKey as `0x${string}`,
);

export const x402Buyer = x402Client.fromConfig({
  schemes: [
    {
      network: CONFIG.network,
      client: new ExactEvmScheme(buyerAccount),
    },
  ],

  /*
   * Coin Purse owns spending limits.
   */
  spendControls: false,

  /*
   * Do not remove requirements here.
   *
   * The selector below needs to see the seller's actual quote
   * so it can enforce Coin Purse's limits immediately before
   * x402 signs the payment.
   */
  policies: [
    (_version: number, requirements: any[]) => {
      return requirements;
    },
  ],

  paymentRequirementsSelector: (
    _version: number,
    requirements: Parameters<SelectPaymentRequirements>[1],
  ) => {
    if (requirements.length === 0) {
      throw new Error(
        "Coin Purse refused all payment requirements.",
      );
    }

    const selected = requirements[0];

    const decision = evaluatePayment(
      {
        network: selected.network,
        asset: selected.asset,
        amount: selected.amount,
      },
      getTotalSpent(),
    );

    if (!decision.allowed) {
      console.log(
        `[COIN PURSE] REFUSED ${selected.amount} base units: ${decision.reason}`,
      );

      throw new Error(
        `Coin Purse refused payment before signing: ${decision.reason}`,
      );
    }

    console.log(
      `[COIN PURSE] APPROVED ${selected.amount} base units`,
    );

    return selected;
  },
});