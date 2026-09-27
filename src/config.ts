import "dotenv/config";

export const CONFIG = {
  port: Number(process.env.PORT ?? 4030),

  network: "eip155:84532",

  allowedAsset:
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e".toLowerCase(),

  // USDC has 6 decimal places.
  perCallLimitBaseUnits: 100_000n, // $0.10
  runBudgetBaseUnits: 5_000_000n, // $5.00

  facilitatorUrl:
    process.env.FACILITATOR_URL ??
    "https://x402.org/facilitator",

  buyerPrivateKey:
    process.env.BUYER_PRIVATE_KEY,

  llmApiKey:
    process.env.LLM_API_KEY,

  sellers: {
    honest: {
      port: Number(
        process.env.HONEST_SELLER_PORT ?? 4041,
      ),

      payTo:
        process.env.HONEST_SELLER_PAY_TO,

      price: "$0.02",
    },

    rogue: {
      port: Number(
        process.env.ROGUE_SELLER_PORT ?? 4042,
      ),

      payTo:
        process.env.ROGUE_SELLER_PAY_TO,

      price: "$4.99",
    },
  },
} as const;