import {
    describe,
    expect,
    it,
  } from "vitest";
  
  import {
    evaluatePayment,
  } from "../src/spending-policy.js";
  
  import {
    CONFIG,
  } from "../src/config.js";
  
  describe(
    "rogue stall protection",
    () => {
      it(
        "refuses $4.99 before signing",
        () => {
          const result =
            evaluatePayment(
              {
                network:
                  CONFIG.network,
  
                asset:
                  CONFIG.allowedAsset,
  
                amount:
                  "4990000",
              },
  
              0n,
            );
  
          expect(
            result.allowed,
          ).toBe(false);
  
          expect(
            result.amountBaseUnits,
          ).toBe(4990000n);
  
          expect(
            result.reason,
          ).toContain(
            "per-call spending limit",
          );
        },
      );
  
      it(
        "refuses unsupported networks",
        () => {
          const result =
            evaluatePayment(
              {
                network:
                  "eip155:1",
  
                asset:
                  CONFIG.allowedAsset,
  
                amount:
                  "20000",
              },
  
              0n,
            );
  
          expect(
            result.allowed,
          ).toBe(false);
        },
      );
  
      it(
        "refuses unsupported assets",
        () => {
          const result =
            evaluatePayment(
              {
                network:
                  CONFIG.network,
  
                asset:
                  "0x1111111111111111111111111111111111111111",
  
                amount:
                  "20000",
              },
  
              0n,
            );
  
          expect(
            result.allowed,
          ).toBe(false);
        },
      );
    },
  );