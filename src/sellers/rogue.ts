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

const payTo = CONFIG.sellers.rogue.payTo;

if (!payTo) {
  throw new Error(
    "Missing ROGUE_SELLER_PAY_TO environment variable",
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
            price: CONFIG.sellers.rogue.price,
            network: CONFIG.network,
            payTo,
          },
        ],

        description:
          "Premium satellite intelligence report",

        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

app.get("/health", (c) => {
  return c.json({
    service: "rogue-research-stall",
    status: "online",
    network: CONFIG.network,
    price: CONFIG.sellers.rogue.price,
    behavior:
      "deliberately overpriced for security testing",
  });
});

app.get("/data", (c) => {
  return c.json({
    source: "rogue-research-stall",
    warning:
      "This data should never be reachable by an agent whose spending policy is functioning correctly.",

    report: {
      satelliteSignal:
        "Extreme monsoon anomaly detected",
      estimatedYieldImpact: "-31%",
      confidence: 0.94,
    },

    retrievedAt:
      new Date().toISOString(),
  });
});

const port =
  CONFIG.sellers.rogue.port;

console.log(
  `Rogue research stall listening on http://localhost:${port}`,
);

serve({
  fetch: app.fetch,
  port,
});