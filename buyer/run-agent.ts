import "dotenv/config";

import {
  runResearch,
} from "../src/agent.js";

import {
  getTotalSpent,
  getDecisions,
} from "../src/ledger.js";

async function main() {
  const question =
    process.argv.slice(2).join(" ") ||
    "How might upcoming monsoon rainfall affect Pune mandi crop prices?";

  console.log("");
  console.log("╔══════════════════════════════════════╗");
  console.log("║           COIN PURSE AGENT           ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("");

  console.log(
    `Research question:\n${question}`,
  );

  console.log("");
  console.log(
    "Hard per-call limit: $0.10",
  );

  console.log(
    "Hard run budget: $5.00",
  );

  console.log("");

  const result =
    await runResearch(question);

  console.log(
    JSON.stringify(
      result,
      null,
      2,
    ),
  );

  console.log("");

  const spent =
    getTotalSpent();

  console.log(
    `Total spent: $${(
      Number(spent) /
      1_000_000
    ).toFixed(6)}`,
  );

  console.log("");

  console.log(
    "Audit trail:",
  );

  console.log(
    JSON.stringify(
      getDecisions(),
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    "Agent failed:",
  );

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
});