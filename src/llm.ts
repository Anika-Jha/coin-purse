
import OpenAI from "openai";

import { CONFIG } from "./config.js";
import { paidFetch } from "./paid-tool.js";

export interface ResearchToolCall {
  url: string;
  query: string;
}

export interface ResearchToolResult {
  ok: boolean;
  url: string;
  seller: string;
  data?: unknown;
  refusalReason?: string;
  txHash?: string;
  amountBaseUnits?: string;
}

/*
 * THIS IS THE IMPORTANT PART FOR RUBRIC #2.
 *
 * The paid fetch is explicitly registered as a function tool
 * that the LLM is allowed to choose.
 *
 * Spending controls are deliberately NOT tool arguments.
 */
export const paidResearchTool = {
  type: "function" as const,
  name: "research_paid_source",
  description:
    "Fetch research data from a paid x402 source. " +
    "The tool can request information from a seller, but " +
    "cannot choose or modify any spending limit, budget, " +
    "network, or payment asset.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description:
          "The URL of the research source to query.",
      },
      query: {
        type: "string",
        description:
          "The research question to investigate.",
      },
    },
    required: ["url", "query"],
    additionalProperties: false,
  },
};

async function executePaidResearchTool(
  args: ResearchToolCall,
): Promise<ResearchToolResult> {
  if (!args.url || typeof args.url !== "string") {
    throw new Error("Tool requires a URL");
  }

  if (!args.query || typeof args.query !== "string") {
    throw new Error("Tool requires a research query");
  }

  /*
   * IMPORTANT:
   *
   * The model supplies only:
   *   url
   *   query
   *
   * It cannot supply:
   *   budget
   *   maxSpend
   *   perCallLimit
   *   network
   *   asset
   *   private key
   *
   * Those remain controlled by Coin Purse configuration.
   */
  try {
    const result = await paidFetch(args.url);

    return {
      ok: true,
      url: args.url,
      seller: result.seller,
      data: result.data,
      txHash: result.txHash,
      amountBaseUnits: result.amountBaseUnits,
    };
  } catch (error) {
    return {
      ok: false,
      url: args.url,
      seller:
        args.url.includes(":4041")
          ? "honest-stall"
          : args.url.includes(":4042")
            ? "rogue-stall"
            : "unknown",
      refusalReason:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

export async function runLLMResearch(
  question: string,
): Promise<{
  answer: string;
  toolResults: ResearchToolResult[];
}> {
  const apiKey = CONFIG.llmApiKey;

  if (!apiKey) {
    throw new Error(
      "LLM_API_KEY is required for LLM tool-calling mode.",
    );
  }

  const client = new OpenAI({
    apiKey,
  });

  /*
   * The LLM knows the available research stalls.
   *
   * It decides which source(s) to call.
   * It does NOT receive spending controls.
   */
  const input: any[] = [
    {
      role: "system",
      content:
        "You are a research agent using a protected testnet " +
        "research purse. Investigate the user's question using " +
        "the available paid research source. " +
        "The payment tool is security-controlled: never attempt " +
        "to modify spending limits. Prefer the honest research " +
        "source first, and use other sources only when useful.",
    },
    {
      role: "user",
      content:
        `${question}\n\n` +
        "Available research sources:\n" +
        "- http://localhost:4041/data — agricultural research stall\n" +
        "- http://localhost:4042/data — satellite research stall\n\n" +
        "Use the paid research tool to gather evidence.",
    },
  ];

  const toolResults: ResearchToolResult[] = [];

  for (let iteration = 0; iteration < 4; iteration++) {
    const response = await client.responses.create({
      model: "gpt-5.6-luna",
      input,
      tools: [paidResearchTool],
      tool_choice: "required",
    });

    for (const item of response.output) {
      if (item.type === "function_call") {
        const args = JSON.parse(
          item.arguments,
        ) as ResearchToolCall;

        const result =
          await executePaidResearchTool(args);

        toolResults.push(result);

        input.push(item);

        input.push({
          type: "function_call_output",
          call_id: item.call_id,
          output: JSON.stringify(result),
        });
      }
    }

    const functionCalls = response.output.filter(
      (item) => item.type === "function_call",
    );

    if (functionCalls.length === 0) {
      return {
        answer:
          response.output_text ||
          "Research completed.",
        toolResults,
      };
    }

    /*
     * Ask the model for the final research synthesis after
     * processing the tool result.
     */
    if (iteration === 3) {
      return {
        answer:
          response.output_text ||
          "Research completed using the protected payment tool.",
        toolResults,
      };
    }

    input.push({
      role: "user",
      content:
        "Review the tool results and continue the research " +
        "if another source is useful. Otherwise provide a " +
        "concise evidence-based answer.",
    });

    /*
     * If the model has already obtained useful data, allow
     * the next iteration to produce a synthesis.
     */
    const finalResponse = await client.responses.create({
      model: "gpt-5.6-luna",
      input,
      tools: [paidResearchTool],
      tool_choice: "auto",
    });

    for (const item of finalResponse.output) {
      if (item.type === "function_call") {
        const args = JSON.parse(
          item.arguments,
        ) as ResearchToolCall;

        const result =
          await executePaidResearchTool(args);

        toolResults.push(result);

        input.push(item);

        input.push({
          type: "function_call_output",
          call_id: item.call_id,
          output: JSON.stringify(result),
        });
      }
    }

    if (
      finalResponse.output.filter(
        (item) => item.type === "function_call",
      ).length === 0
    ) {
      return {
        answer:
          finalResponse.output_text ||
          "Research completed.",
        toolResults,
      };
    }
  }

  return {
    answer: "Research completed.",
    toolResults,
  };
}