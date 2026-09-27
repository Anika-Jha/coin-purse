import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
  } from "vitest";
  
  import fs from "node:fs";
  import path from "node:path";
  
  const testDb = path.resolve(
    "./data/test-ledger.db",
  );
  
  interface TestDecisionRow {
    id: number;
    timestamp: string;
    seller: string;
    url: string;
    network: string;
    asset: string;
    amount_base_units: string;
    decision: "paid" | "refused";
    reason: string;
    tx_hash: string | null;
  }
  
  describe("payment ledger", () => {
    beforeEach(() => {
      process.env.LEDGER_PATH = testDb;
    });
  
    afterEach(async () => {
      const { closeLedger } =
        await import("../src/ledger.js");
  
      closeLedger();
  
      if (fs.existsSync(testDb)) {
        fs.unlinkSync(testDb);
      }
  
      delete process.env.LEDGER_PATH;
    });
  
    it("persists payment decisions", async () => {
      const {
        recordDecision,
        getTotalSpent,
        getDecisions,
      } = await import("../src/ledger.js");
  
      recordDecision({
        seller: "honest-stall",
        url: "http://localhost:4041/data",
        network: "eip155:84532",
        asset:
          "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
        amountBaseUnits: 20000n,
        decision: "paid",
        reason: "quote is within spending policy",
      });
  
      expect(getTotalSpent()).toBe(20000n);
  
      const decisions =
        getDecisions() as TestDecisionRow[];
  
      expect(decisions).toHaveLength(1);
  
      expect(decisions[0]?.decision).toBe(
        "paid",
      );
  
      expect(
        decisions[0]?.amount_base_units,
      ).toBe("20000");
    });
  
    it("does not count refused payments as spending", async () => {
      const {
        recordDecision,
        getTotalSpent,
      } = await import("../src/ledger.js");
  
      recordDecision({
        seller: "rogue-stall",
        url: "http://localhost:4042/data",
        network: "eip155:84532",
        asset:
          "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
        amountBaseUnits: 4990000n,
        decision: "refused",
        reason:
          "quote exceeds the per-call spending limit",
      });
  
      expect(getTotalSpent()).toBe(0n);
    });
  });