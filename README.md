# Review-to-Earn (R2E)
Review-to-Earn: AI-Powered PYUSD Micro-Incentives for Trustworthy Commerce

Review-to-Earn transforms how online reviews build trust in digital commerce.
 When shoppers leave reviews on marketplaces like Etsy, eBay, or Amazon, our Chrome extension uses AI to evaluate review quality and authenticity — rewarding honest, helpful reviewers with PYUSD micro-payments on-chain.
Built on the Ethereum Sepolia testnet, the system combines:
AI sentiment & spam detection using OpenAI models,

Smart contracts for escrowed PYUSD campaigns,

Off-chain oracle signatures for instant verified payouts, and

Programmable microtransactions leveraging PayPal’s PYUSD token.

Brands can create campaigns, deposit budgets, and automatically reward reviewers without intermediaries — bringing transparency, fairness, and crypto-native incentives to e-commerce feedback loops.


## Prerequisites
- Node.js 18+
- `pnpm` 8+
- Sepolia RPC endpoint and funded rewarder wallet (for live payouts)

## Setup
```bash
pnpm install
```

Create `apps/backend/.env` using `.env.example`. Required variables:
```
SEPOLIA_RPC_URL=
REWARDER_PRIVATE_KEY=
PYUSD_CONTRACT_ADDRESS=
REWARD_AMOUNT_WEI=1000000
QUALITY_THRESHOLD=70
SPAM_THRESHOLD=30
```

## Development
```bash
pnpm --filter @r2e/backend dev   # Express API on http://localhost:8787
pnpm --filter @r2e/extension dev # Vite watch build for MV3 bundle
```
Load the unpacked extension from `apps/extension/dist` in Chrome (Developer Mode → Load unpacked).

## Testing & Linting
```bash
pnpm lint:all    # eslint in every workspace
pnpm test:all    # vitest backend suite
```
Backend tests require no chain access thanks to mocked transfers.

## Project Layout
- `apps/extension/`: MV3 extension (content scripts, service worker, popup UI).
- `apps/backend/`: Express reward API (`/reward`, `/health`) plus PYUSD helper.
- `contracts/`: Reference Solidity interfaces.
- `docs/`: Demo flow, business plan, and contributor notes.

See `AGENTS.md` for contributor guidelines and workflows. When adding new top-level folders, document them in `docs/README.md` before merging. Continuous improvements should include Prompt API integration, richer fraud checks, and reward history UI in the side panel.
