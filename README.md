# Coin Purse

### An Agent That Pays but Can't Be Drained

> **The agent can choose what information it wants. It cannot choose how much money it is allowed to spend.**

Coin Purse is a security-first AI research agent with a hard spending boundary around x402 micropayments.

The agent can use paid research endpoints, but the model never controls the wallet, spending limits, accepted asset, accepted network, or cumulative budget.

The project uses **Base Sepolia + USDC** for testnet payment experiments.

---

## The Problem

An AI agent that can autonomously pay for APIs creates a new security problem:

```text
AI Agent
   ↓
Paid API
   ↓
Wallet
```

If the agent is tricked into using an overpriced or malicious seller, a normal wallet integration could potentially authorize a payment that the user never intended.

Coin Purse inserts an explicit security boundary between the model and the wallet:

```text
                    ┌──────────────────────┐
                    │      LLM Agent       │
                    │                      │
                    │ Chooses information  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Paid Research Tool   │
                    │                      │
                    │ url + query ONLY     │
                    └──────────┬───────────┘
                               │
                               ▼
                 ┌────────────────────────────┐
                 │      COIN PURSE POLICY     │
                 │                            │
                 │ Per-call ≤ $0.10           │
                 │ Run budget ≤ $5.00         │
                 │ Base Sepolia only          │
                 │ USDC only                  │
                 │ Integer base units         │
                 │ Persistent ledger           │
                 └─────────────┬──────────────┘
                               │
                     ┌─────────┴─────────┐
                     │                   │
                  ALLOWED              REFUSED
                     │                   │
                     ▼                   ▼
                   x402              Audit log
                     │
                     ▼
                  Seller
```

---

# Security Guarantees

Coin Purse enforces the following rules before a payment is signed.

### Per-call limit

```text
$0.10 maximum
```

Equivalent USDC base-unit limit:

```text
100,000
```

### Total run budget

```text
$5.00 maximum
```

Equivalent:

```text
5,000,000
```

### Accepted network

```text
eip155:84532
```

Base Sepolia.

### Accepted asset

Base Sepolia USDC.

### Integer arithmetic

All payment comparisons use integer USDC base units represented as `bigint`.

No floating-point arithmetic is used for spending decisions.

---

# The Rogue Seller

The repository contains two runnable x402 sellers.

## Honest seller

```text
http://localhost:4041/data
```

Price:

```text
$0.02
```

This is below the Coin Purse `$0.10` per-call ceiling.

## Rogue seller

```text
http://localhost:4042/data
```

Price:

```text
$4.99
```

The rogue seller deliberately exceeds the Coin Purse per-call limit.

The expected security behavior is:

```text
Rogue quote
$4.99
   ↓
4,990,000 USDC base units
   ↓
4,990,000 > 100,000
   ↓
REFUSED
   ↓
No signature
   ↓
No payment
```

The x402 SDK's independent spend controls are disabled because Coin Purse must enforce its own explicit spending policy.

---

# LLM Tool Boundary

The paid fetch is exposed to the model as an actual function tool:

```text
research_paid_source
```

The tool accepts only:

```text
url
query
```

It does **not** accept:

```text
budget
maxSpend
perCallLimit
network
asset
privateKey
```

Therefore the model cannot raise or override the spending limits.

The control flow is:

```text
LLM
 ↓
research_paid_source(url, query)
 ↓
paidFetch()
 ↓
Coin Purse policy
 ↓
x402 payment
```

The LLM chooses **what information to request**.

The Coin Purse decides **whether payment is permitted**.

---

# LLM API Key

The LLM integration supports an optional `LLM_API_KEY`.

The key is loaded from the local `.env` file:

```env
LLM_API_KEY=
```

It must never be committed to Git.

The LLM key is **not required to demonstrate the core payment-security boundary**.

When no LLM key is configured, Coin Purse uses its deterministic research path so that the x402 spending controls and seller behavior can still be tested without an external LLM credential.

When an LLM key is configured, the agent uses the actual `research_paid_source` function tool.

This gives the project two execution modes:

```text
LLM_API_KEY present
        ↓
LLM tool-calling mode
        ↓
research_paid_source
        ↓
Coin Purse
        ↓
x402
```

or:

```text
LLM_API_KEY absent
        ↓
Deterministic demo mode
        ↓
paidFetch()
        ↓
Coin Purse
        ↓
x402
```

The spending policy is identical in both modes.

---

# Spending Policy

Every x402 payment requirement is checked against:

1. Network allowlist
2. Asset allowlist
3. Integer payment amount
4. Per-call ceiling
5. Cumulative spend

Conceptually:

```text
if network != allowedNetwork
    REFUSE

if asset != allowedAsset
    REFUSE

if amount > perCallLimit
    REFUSE

if spent + amount > runBudget
    REFUSE

otherwise
    ALLOW
```

The final check occurs immediately before the x402 client creates the payment payload/signature.

This means an LLM cannot request:

```text
"Pay $4.99 this time."
```

and bypass the Coin Purse policy.

The seller's quoted amount is independently checked against the hard limits.

---

# Persistent Audit Ledger

Coin Purse uses SQLite for durable payment decisions.

```text
data/ledger.db
```

The ledger records:

* timestamp
* seller
* URL
* network
* asset
* amount in base units
* paid/refused decision
* reason
* transaction hash when available

Cumulative paid spend is reconstructed from durable storage rather than an in-memory counter.

Restarting the process therefore does not erase the recorded payment history.

---

# Project Structure

```text
coin-purse/
│
├── src/
│   ├── agent.ts
│   ├── paid-tool.ts
│   ├── spending-policy.ts
│   ├── x402-client.ts
│   ├── ledger.ts
│   ├── config.ts
│   ├── llm.ts
│   ├── server.ts
│   │
│   └── sellers/
│       ├── honest.ts
│       └── rogue.ts
│
├── buyer/
│   └── run-agent.ts
│
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
│
├── tests/
│   ├── spending-policy.test.ts
│   ├── ledger.test.ts
│   └── rogue-stall.test.ts
│
├── data/
│   └── .gitkeep
│
├── samples/
│   └── decision-record.json
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

---

# Installation

Install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

Run the test suite:

```bash
npm test
```

---

# Environment Configuration

Create a local `.env` file based on `.env.example`.

Example:

```env
PORT=4030

FACILITATOR_URL=https://x402.org/facilitator

BUYER_PRIVATE_KEY=
LLM_API_KEY=

HONEST_SELLER_PORT=4041
HONEST_SELLER_PAY_TO=

ROGUE_SELLER_PORT=4042
ROGUE_SELLER_PAY_TO=

LEDGER_PATH=./data/ledger.db
```

Secrets must remain in `.env`.

The `.env` file is excluded from Git.

Never commit:

* private keys
* mnemonics
* LLM API keys
* authenticated URLs
* other credentials

Only a dedicated throwaway testnet wallet should be used for this project.

---

# Running the Demo

Start the honest seller:

```bash
npm run seller:honest
```

Start the rogue seller:

```bash
npm run seller:rogue
```

Start the Coin Purse web application:

```bash
npm run dev
```

Open:

```text
http://localhost:4030
```

The command-line agent can be run with:

```bash
npm run agent
```

Or with a custom research question:

```bash
npm run agent -- "How might upcoming monsoon rainfall affect Pune mandi crop prices?"
```

---

# x402 Payment Flow

A seller first responds with HTTP `402 Payment Required` and a payment quote.

For the honest seller, the quote is:

```text
Network:
eip155:84532

Asset:
Base Sepolia USDC

Amount:
20,000 base units

Value:
$0.02
```

Coin Purse evaluates this quote before signing.

The flow is:

```text
GET /data
     ↓
402 Payment Required
     ↓
Payment requirements
     ↓
Coin Purse spending policy
     ↓
ALLOW / REFUSE
     ↓
x402 payment signature
     ↓
Facilitator/payment settlement
     ↓
Paid response
```

For the rogue seller:

```text
$4.99
 ↓
4,990,000 base units
 ↓
Per-call limit = 100,000
 ↓
REFUSE
 ↓
No payment signature
```

---

# Expected Security Demonstration

The rogue seller should produce output similar to:

```text
[COIN PURSE] REFUSED 4990000 base units:
quote exceeds the per-call spending limit
```

The important property is that the refusal happens **before signing**.

The honest seller's `$0.02` quote is within the spending policy:

```text
$0.02 ≤ $0.10
```

When the buyer wallet is funded with the required Base Sepolia testnet assets, the intended successful flow is:

```text
$0.02 quote
     ↓
Coin Purse approval
     ↓
x402 signing
     ↓
testnet payment
     ↓
research response
     ↓
durable audit record
```

---

# Test Suite

Run:

```bash
npm test
```

The repository contains tests covering:

### Spending policy

Tests cover:

* allowed payment
* per-call rejection
* cumulative budget rejection
* network rejection
* asset rejection
* invalid amounts
* negative amounts
* integer base-unit arithmetic

### Ledger

Tests cover:

* durable recording
* cumulative spend reconstruction
* refused decisions
* payment decisions

### Rogue seller

Tests verify that the deliberately overpriced seller cannot pass the Coin Purse spending policy.

---

# Verification

The current repository should pass:

```bash
npm run build
npm test
```

Expected result:

```text
Test Files  3 passed (3)
Tests       15 passed (15)
```

The project also supports a live testnet verification when the dedicated buyer wallet has the required Base Sepolia testnet funds.

---

# Rubric Mapping

| Requirement                               | Implementation                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **1. Payments through x402 client**       | `src/x402-client.ts` creates the x402 client and EVM signer; `src/paid-tool.ts` uses `@x402/fetch` |
| **2. Paid fetch exposed as an LLM tool**  | `src/llm.ts` registers `research_paid_source` and executes the paid fetch handler                  |
| **3. Rogue test seller**                  | `src/sellers/rogue.ts` charges `$4.99`                                                             |
| **4. No credential in tracked files**     | Secrets are loaded from `.env`; `.env` is Git-ignored                                              |
| **5. Per-call ceiling**                   | `evaluatePayment()` enforces `100,000` base units before signing                                   |
| **6. Cumulative budget**                  | `evaluatePayment()` checks `spent + amount <= 5,000,000` before signing                            |
| **7. Durable cumulative spend**           | SQLite ledger at `data/ledger.db`                                                                  |
| **8. Network + asset allowlist**          | Base Sepolia and USDC are explicitly validated                                                     |
| **9. Limits cannot be set through tools** | The LLM tool accepts only `url` and `query`                                                        |
| **10. Integer base units**                | Payment comparisons use `bigint` and USDC atomic units                                             |

---

# Security Design Principle

The most important design decision is that the model never owns the spending policy.

### Unsafe architecture

```text
LLM
 ↓
"Pay up to $5"
 ↓
Wallet
```

### Coin Purse

```text
LLM
 ↓
"Get this information"
 ↓
Protected tool
 ↓
Hard spending policy
 ↓
x402
 ↓
Wallet
```

The model can request a payment-producing action.

It cannot authorize the payment amount.

---

# Testnet Scope

This project is intentionally configured for testnet experimentation.

Network:

```text
Base Sepolia
```

Asset:

```text
USDC
```

The buyer wallet should contain only disposable testnet funds.

No mainnet funds are required or intended.

---

# Acceptance Evidence

A complete live demonstration should show:

1. The paid research capability exposed as an LLM function tool.
2. The honest `$0.02` quote passing the Coin Purse policy.
3. The rogue `$4.99` quote being refused.
4. The rogue refusal occurring before payment signing.
5. The cumulative spend being persisted in SQLite.
6. No private key or API credential appearing in Git-tracked files.
7. When funded with testnet assets, a successful Base Sepolia x402 payment and corresponding audit entry.

The security-critical demonstration is:

```text
$4.99 rogue quote
       ↓
Coin Purse
       ↓
REFUSED
       ↓
No signature
       ↓
No payment
```

---

# License

MIT
