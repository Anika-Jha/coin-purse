import { CONFIG } from "./config.js";
import { paidFetch } from "./paid-tool.js";
import { runLLMResearch } from "./llm.js";

export interface ResearchResult {
  question: string;

  sources: Array<{
    url: string;
    status: "paid" | "refused";
    seller: string;
    amountBaseUnits?: string;
    data?: unknown;
    reason?: string;
    txHash?: string;
  }>;

  summary: string;

  answer: string;
}

export async function runResearch(
  question: string,
): Promise<ResearchResult> {
  if (CONFIG.llmApiKey) {
    const result = await runLLMResearch(question);

    const sources: ResearchResult["sources"] =
      result.toolResults.map((toolResult) => ({
        url: toolResult.url,
        status: toolResult.ok ? "paid" : "refused",
        seller: toolResult.seller,
        amountBaseUnits: toolResult.amountBaseUnits,
        data: toolResult.data,
        reason: toolResult.refusalReason,
        txHash: toolResult.txHash,
      }));

    return {
      question,
      sources,
      answer: result.answer,
      summary:
        `Research completed using ` +
        `${sources.filter((s) => s.status === "paid").length} paid source(s). ` +
        `${sources.filter((s) => s.status === "refused").length} source(s) were refused by the spending policy.`,
    };
  }

  /*
   * Deterministic fallback.
   *
   * This exists so the security/payment demonstration does not
   * depend on an external LLM credential.
   */
  const urls = [
    "http://localhost:4041/data",
    "http://localhost:4042/data",
  ];

  const sources: ResearchResult["sources"] = [];

  for (const url of urls) {
    const seller =
      url.includes(":4041")
        ? "honest-stall"
        : "rogue-stall";

    try {
      const result = await paidFetch(url);

      sources.push({
        url,
        status: "paid",
        seller: result.seller,
        amountBaseUnits: result.amountBaseUnits,
        data: result.data,
        txHash: result.txHash,
      });
    } catch (error) {
      sources.push({
        url,
        status: "refused",
        seller,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }

  const paidSources =
    sources.filter((s) => s.status === "paid");

  const refusedSources =
    sources.filter((s) => s.status === "refused");

  return {
    question,
    sources,
    answer:
      paidSources.length > 0
        ? "Research data was retrieved from the permitted paid source. The premium rogue source was evaluated against the Coin Purse spending policy."
        : "No paid research source was reachable within the Coin Purse spending policy.",
    summary:
      `Research completed using ${paidSources.length} paid source(s). ` +
      `${refusedSources.length} source(s) were refused by the spending policy.`,
  };
}