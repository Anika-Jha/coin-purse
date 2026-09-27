import { describe, expect, it } from "vitest";

import {
  evaluatePayment,
} from "../src/spending-policy.js";

import { CONFIG } from "../src/config.js";

const USDC = CONFIG.allowedAsset;

describe("Coin Purse spending policy", () => {
  it("allows an approved small payment", () => {
    const result = evaluatePayment(
      {
        network: CONFIG.network,
        asset: USDC,
        amount: "20000",
      },
      0n,
    );

    expect(result.allowed).toBe(true);

    if (result.allowed) {
      expect(result.amountBaseUnits).toBe(20000n);
    }
  });

  it("refuses a quote above the per-call limit", () => {
    const result = evaluatePayment(
      {
        network: CONFIG.network,
        asset: USDC,
        amount: "100001",
      },
      0n,
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain(
      "per-call spending limit",
    );
  });

  it("refuses a payment that would exceed the total run budget", () => {
    const result = evaluatePayment(
      {
        network: CONFIG.network,
        asset: USDC,
        amount: "100000",
      },
      CONFIG.runBudgetBaseUnits - 99999n,
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain(
      "remaining run budget",
    );
  });

  it("allows a payment exactly at the per-call limit", () => {
    const result = evaluatePayment(
      {
        network: CONFIG.network,
        asset: USDC,
        amount:
          CONFIG.perCallLimitBaseUnits.toString(),
      },
      0n,
    );

    expect(result.allowed).toBe(true);
  });

  it("allows spending exactly up to the remaining budget when the remainder is within the per-call limit", () => {
    const spent =
      CONFIG.runBudgetBaseUnits -
      CONFIG.perCallLimitBaseUnits;

    const result = evaluatePayment(
      {
        network: CONFIG.network,
        asset: USDC,
        amount:
          CONFIG.perCallLimitBaseUnits.toString(),
      },
      spent,
    );

    expect(result.allowed).toBe(true);

    if (result.allowed) {
      expect(result.amountBaseUnits).toBe(
        CONFIG.perCallLimitBaseUnits,
      );
    }
  });

  it("rejects an unsupported network", () => {
    const result = evaluatePayment(
      {
        network: "eip155:8453",
        asset: USDC,
        amount: "20000",
      },
      0n,
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("network");
  });

  it("rejects an unsupported asset", () => {
    const result = evaluatePayment(
      {
        network: CONFIG.network,
        asset:
          "0x1111111111111111111111111111111111111111",
        amount: "20000",
      },
      0n,
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("asset");
  });

  it("rejects a non-integer payment amount", () => {
    const result = evaluatePayment(
      {
        network: CONFIG.network,
        asset: USDC,
        amount: "0.02",
      },
      0n,
    );

    expect(result.allowed).toBe(false);
  });

  it("uses integer base units rather than floating-point dollars", () => {
    const result = evaluatePayment(
      {
        network: CONFIG.network,
        asset: USDC,
        amount: "99999",
      },
      0n,
    );

    expect(result.allowed).toBe(true);

    if (result.allowed) {
      expect(typeof result.amountBaseUnits).toBe(
        "bigint",
      );

      expect(result.amountBaseUnits).toBe(99999n);
    }
  });

  it("refuses a negative amount", () => {
    const result = evaluatePayment(
      {
        network: CONFIG.network,
        asset: USDC,
        amount: "-1",
      },
      0n,
    );

    expect(result.allowed).toBe(false);
  });
});