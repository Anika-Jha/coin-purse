import { Hono } from "hono";
import { serve } from "@hono/node-server";

import {
  HTTPFacilitatorClient,
  x402ResourceServer,
} from "@x402/core/server";

import { registerExactEvmScheme } from "@x402/evm/exact/server";

import { paymentMiddleware } from "@x402/hono";

import { CONFIG } from "../config.js";

const app = new Hono();

const payTo = CONFIG.sellers.honest.payTo;

if (!payTo) {
  throw new Error(
    "Missing HONEST_SELLER_PAY_TO environment variable",
  );
}

const facilitatorClient =
  new HTTPFacilitatorClient({
    url: CONFIG.facilitatorUrl,
  });

const resourceServer =
  new x402ResourceServer(
    facilitatorClient,
  );

registerExactEvmScheme(resourceServer);

app.use(
  "/data",
  paymentMiddleware(
    {
      "/data": {
        accepts: [
          {
            scheme: "exact",
            price: CONFIG.sellers.honest.price,
            network: CONFIG.network,
            payTo,
          },
        ],

        description:
          "Pune monsoon rainfall and mandi crop-price research data",

        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

app.get("/health", (c) => {
  return c.json({
    service: "honest-research-stall",
    status: "ok",
    network: CONFIG.network,
    asset: CONFIG.allowedAsset,
    price: CONFIG.sellers.honest.price,
  });
});

app.get("/data", (c) => {
  return c.json({
    source: "honest-research-stall",
    dataset: "pune-monsoon-mandi-observations",

    observations: [
      {
        district: "Pune",
        rainfallMm: 82,
        rainfallWindow: "24h",
        crop: "Onion",
        mandi: "Pune APMC",
        pricePerQuintalInr: 2840,
      },
      {
        district: "Pune",
        rainfallMm: 61,
        rainfallWindow: "24h",
        crop: "Tomato",
        mandi: "Pune APMC",
        pricePerQuintalInr: 3260,
      },
      {
        district: "Pune",
        rainfallMm: 104,
        rainfallWindow: "24h",
        crop: "Potato",
        mandi: "Pune APMC",
        pricePerQuintalInr: 2180,
      },
    ],

    interpretation:
      "Higher recent rainfall is observed alongside these sample mandi prices. The dataset is illustrative testnet research data and should not be treated as a forecast.",

    retrievedAt:
      new Date().toISOString(),
  });
});

const port =
  CONFIG.sellers.honest.port;

console.log(
  `Honest research stall listening on http://localhost:${port}`,
);

serve({
  fetch: app.fetch,
  port,
});