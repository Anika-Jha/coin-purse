import { CONFIG } from "./config.js";

export type PaymentRequirement = {
  network: string;
  asset: string;
  amount: string;
};

export type PaymentDecision =
  | {
      allowed: true;
      reason: string;
      amountBaseUnits: bigint;
    }
  | {
      allowed: false;
      reason: string;
      amountBaseUnits: bigint;
    };

export function evaluatePayment(
  requirement: PaymentRequirement,
  spentBaseUnits: bigint,
): PaymentDecision {
  if (requirement.network !== CONFIG.network) {
    return {
      allowed: false,
      reason: `network ${requirement.network} is not allowed`,
      amountBaseUnits: 0n,
    };
  }

  if (
    requirement.asset.toLowerCase() !==
    CONFIG.allowedAsset
  ) {
    return {
      allowed: false,
      reason: `asset ${requirement.asset} is not allowed`,
      amountBaseUnits: 0n,
    };
  }

  let amountBaseUnits: bigint;

  try {
    amountBaseUnits = BigInt(requirement.amount);
  } catch {
    return {
      allowed: false,
      reason: "payment amount is not a valid integer base-unit amount",
      amountBaseUnits: 0n,
    };
  }

  if (amountBaseUnits < 0n) {
    return {
      allowed: false,
      reason: "payment amount cannot be negative",
      amountBaseUnits,
    };
  }

  if (
    amountBaseUnits >
    CONFIG.perCallLimitBaseUnits
  ) {
    return {
      allowed: false,
      reason:
        "quote exceeds the per-call spending limit",
      amountBaseUnits,
    };
  }

  if (
    spentBaseUnits + amountBaseUnits >
    CONFIG.runBudgetBaseUnits
  ) {
    return {
      allowed: false,
      reason:
        "quote exceeds the remaining run budget",
      amountBaseUnits,
    };
  }

  return {
    allowed: true,
    reason: "quote is within spending policy",
    amountBaseUnits,
  };
}