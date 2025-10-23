# Review-to-Earn (R2E)

Chrome extension + backend that rewards high-quality ecommerce reviews with PYUSD on the Sepolia testnet. The extension scores reviews locally via the Chrome Prompt API (stubbed heuristics today) and requests payouts from the Node.js backend, which executes ERC-20 transfers.

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
