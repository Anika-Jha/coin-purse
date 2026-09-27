import "dotenv/config";

import { Hono } from "hono";
import { serve } from "@hono/node-server";

import fs from "node:fs/promises";
import path from "node:path";

import {
  getDecisions,
  getTotalSpent,
} from "./ledger.js";

import { runResearch } from "./agent.js";
import { CONFIG } from "./config.js";

const app = new Hono();

const publicDir = path.resolve("./public");

/*
 * Dashboard
 */
app.get("/", async (c) => {
  const html = await fs.readFile(
    path.join(publicDir, "index.html"),
    "utf8",
  );

  return c.html(html);
});

/*
 * Static CSS
 */
app.get("/style.css", async (c) => {
  const css = await fs.readFile(
    path.join(publicDir, "style.css"),
    "utf8",
  );

  return new Response(css, {
    headers: {
      "Content-Type": "text/css",
    },
  });
});

/*
 * Static JavaScript
 */
app.get("/app.js", async (c) => {
  const js = await fs.readFile(
    path.join(publicDir, "app.js"),
    "utf8",
  );

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript",
    },
  });
});

/*
 * Dashboard state.
 *
 * Notice that the API does NOT accept:
 *
 * - budget
 * - per-call limit
 * - network
 * - asset
 *
 * Those remain server-side policy.
 */
app.get("/api/state", (c) => {
  const spent = getTotalSpent();
  const remaining =
    CONFIG.runBudgetBaseUnits - spent;

  return c.json({
    policy: {
      network: CONFIG.network,
      asset: CONFIG.allowedAsset,
      perCallLimitBaseUnits:
        CONFIG.perCallLimitBaseUnits.toString(),
      runBudgetBaseUnits:
        CONFIG.runBudgetBaseUnits.toString(),
    },

    purse: {
      spentBaseUnits: spent.toString(),
      remainingBaseUnits:
        remaining.toString(),
    },

    decisions: getDecisions(),
  });
});

/*
 * Run research.
 *
 * The browser supplies ONLY the research question.
 *
 * It cannot supply:
 * budget
 * maxSpend
 * network
 * asset
 */
app.post("/api/run", async (c) => {
  try {
    const body = await c.req.json();

    const question = body?.question;

    if (
      typeof question !== "string" ||
      question.trim().length === 0
    ) {
      return c.json(
        {
          error:
            "A research question is required.",
        },
        400,
      );
    }

    const result =
      await runResearch(
        question.trim(),
      );

    return c.json(result);
  } catch (error) {
    console.error(error);

    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500,
    );
  }
});

/*
 * Health endpoint.
 */
app.get("/health", (c) => {
  return c.json({
    service: "coin-purse",
    status: "online",
  });
});

const port = CONFIG.port;

console.log(
  `Coin Purse dashboard running at http://localhost:${port}`,
);

serve({
  fetch: app.fetch,
  port,
});