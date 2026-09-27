import "dotenv/config";

import { wrapFetchWithPayment } from "@x402/fetch";

import { CONFIG } from "./config.js";
import {
  recordDecision,
} from "./ledger.js";

import {
  x402Buyer,
} from "./x402-client.js";

const fetchWithPayment = wrapFetchWithPayment(
  globalThis.fetch,
  x402Buyer,
);

function sellerName(url: string): string {
  if (url.includes(":4041")) {
    return "honest-stall";
  }

  if (url.includes(":4042")) {
    return "rogue-stall";
  }

  return "unknown";
}

export async function paidFetch(
  url: string,
): Promise<{
  ok: boolean;
  url: string;
  seller: string;
  data: unknown;
  amountBaseUnits: string;
  txHash?: string;
}> {
  const seller = sellerName(url);

  const response = await fetchWithPayment(url);

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Paid request failed with HTTP ${response.status}: ${body}`,
    );
  }

  const data = await response.json();

  const paymentResponse =
    response.headers.get("PAYMENT-RESPONSE") ??
    response.headers.get("X-PAYMENT-RESPONSE");

  let txHash: string | undefined;

  if (paymentResponse) {
    try {
      const decoded = JSON.parse(
        Buffer.from(
          paymentResponse,
          "base64",
        ).toString("utf8"),
      );

      txHash =
        decoded?.transaction ??
        decoded?.txHash ??
        decoded?.tx_hash;
    } catch {
      // Facilitator response format may differ.
    }
  }

  const amountBaseUnits =
    seller === "honest-stall"
      ? "20000"
      : "0";

  if (seller === "honest-stall") {
    recordDecision({
      seller,
      url,
      network: CONFIG.network,
      asset: CONFIG.allowedAsset,
      amountBaseUnits: 20_000n,
      decision: "paid",
      reason:
        "x402 payment succeeded after Coin Purse approval",
      txHash,
    });
  }

  return {
    ok: true,
    url,
    seller,
    data,
    amountBaseUnits,
    txHash,
  };
}