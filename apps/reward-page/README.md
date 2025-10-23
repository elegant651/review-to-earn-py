# Reward Claim Page

React + Vite web application for claiming PYUSD rewards from the Review-to-Earn extension.

## Features

- ⚛️ React 18 + TypeScript
- ⚡ Vite for fast development
- 🦊 MetaMask wallet connection
- ✍️ Message signing for verification
- 💰 PYUSD reward claiming
- 🔔 Blockscout transaction notifications & history
- 📱 Responsive design
- 🎨 Modern gradient UI

## Tech Stack

- React 18
- TypeScript
- Vite
- CSS3 (no framework dependencies)

## Local Development

```bash
cd apps/reward-page

# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Visit: http://localhost:3000

## Build

```bash
pnpm build
```

Output will be in the `dist/` directory.

## Deployment

This React app can be deployed to any static hosting service:

### Vercel
```bash
cd apps/reward-page
vercel --prod
```

Build settings:
- Build Command: `pnpm build`
- Output Directory: `dist`

### Netlify
```bash
cd apps/reward-page
netlify deploy --prod --dir=dist
```

Build settings:
- Build Command: `pnpm build`
- Publish Directory: `dist`

### Cloudflare Pages
1. Connect your repository to Cloudflare Pages
2. Set build command: `pnpm build`
3. Set build output directory: `dist`
4. Set root directory: `apps/reward-page`

### GitHub Pages
```bash
pnpm build
# Deploy the dist/ folder to gh-pages branch
```

## Configuration

### Environment Variables

Create a `.env` file (copy from `env.example`):

```bash
cp env.example .env
```

Edit `.env`:
```env
VITE_BACKEND_URL=https://your-backend-url.com
VITE_BLOCKSCOUT_CHAIN_ID=11155111
VITE_BLOCKSCOUT_TX_BASE_URL=https://eth-sepolia.blockscout.com/tx/
```

Or set environment variables in your deployment platform.

### Update Config

Alternatively, edit `src/config.ts`:

```typescript
export const BACKEND_URL = 'https://your-backend-url.com';
export const BLOCKSCOUT_CHAIN_ID = '11155111';
export const BLOCKSCOUT_TX_BASE_URL = 'https://eth-sepolia.blockscout.com/tx/';
```

## URL Parameters

The page expects these query parameters:

- `review` - The review text (URL encoded)
- `score` - The review score (number)

Example:
```
https://your-domain.com/?review=Great%20product!&score=0.85
```

## Usage from Extension

Update the extension's content script to redirect to your deployed URL:

```typescript
// In apps/extension/src/content/content.ts
const REWARD_PAGE_URL = "https://your-domain.com";
```

## Project Structure

```
apps/reward-page/
├── src/
│   ├── components/       # React components (future)
│   ├── hooks/           # Custom React hooks
│   │   └── useMetaMask.ts
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   ├── App.tsx          # Main App component
│   ├── App.css          # Styles
│   ├── config.ts        # Configuration
│   └── main.tsx         # Entry point
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript config
└── package.json         # Dependencies
```

## Development Tips

- Hot module replacement (HMR) is enabled for fast development
- TypeScript strict mode is enabled
- Use `pnpm dev` for development with auto-reload
- Use `pnpm build` to test production build locally
- Use `pnpm preview` to preview production build
