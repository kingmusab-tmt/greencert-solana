# GreenCert: Decentralized Solar Credits on Solana

GreenCert is a DePIN project designed to bridge the gap between Nigerian solar producers and the global carbon market.

## 🏗 Architecture

1. **Physical Layer**: IoT Smart Meters (PZEM-004T/Shelly) or Inverter APIs.
2. **Verification Layer**: Node.js engine validates kWh data against regional weather patterns.
3. **Settlement Layer**: Solana Blockchain using State Compression (cNFTs) for ultra-low-cost minting.

## 🚀 Why Solana?

Standard NFTs cost ~$2.00 to mint. A Nigerian homeowner producing 100kWh shouldn't pay $2.00 in fees. By using **Solana State Compression**, we reduce minting costs to <$0.01, making micro-offsets economically viable.

## 🛠 Tech Stack

- **Frontend**: Next.js, Tailwind CSS, Solana Wallet Adapter
- **Backend**: Node.js, Express, MongoDB (Data Accumulator)
- **Blockchain**: Solana Web3.js, Metaplex Bubblegum (Compression)

## Local Mongo Setup

1. Copy `.env.example` to `.env.local`.
2. Set `MONGODB_URI` and `MONGODB_DB` for your local or hosted MongoDB instance.
3. Start the app with `npm run dev`.

The Milestone 3 verification API now persists telemetry and device state in MongoDB collections:

- `telemetryEvents`
- `deviceStates`

## Milestone 2 -> Milestone 3 Bridge

Milestone 2 middleware can now push telemetry directly into Milestone 3 verification/dashboard pipeline via:

- `POST /api/milestone2/ingest`

Required headers:

- `x-ingest-key: <MILESTONE2_INGEST_KEY>`

Required JSON payload:

- `walletAddress`
- `deviceId`
- `cumulativeKwh`
- `irradianceWm2`
- `timestamp` (ISO string)

Set this in `.env.local`:

- `MILESTONE2_INGEST_KEY=<strong-random-secret>`

Every submission is audit-logged in `oracleTelemetryIngest`, verified via the Milestone 3 rules, and immediately reflected in dashboard aggregates.

### Devnet Simulation (Milestone 2 -> 3)

1. Start the app:
   - `npm run dev`
2. Set the ingest bridge secret in `.env.local`:
   - `MILESTONE2_INGEST_KEY=<strong-random-secret>`
3. Run telemetry simulation:
   - `MILESTONE2_INGEST_KEY=<strong-random-secret> npm run simulate:devnet`

Optional env overrides:

- `BASE_URL=http://localhost:3000`
- `WALLET_ADDRESS=<solana-wallet>`
- `DEVICE_ID=<device-id>`
- `STEP_KWH=8.5`
- `SAMPLES=15`

This simulates Milestone 2 data flow into Milestone 3 verification and prints mint-readiness progression in the terminal.

## Production Deployment Readiness

The project now includes a deployable mint queue pipeline so verification can progress to recorded mint proofs.

### Required environment variables

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `MONGODB_URI`
- `MONGODB_DB`
- `MILESTONE2_INGEST_KEY`
- `MINT_WORKER_KEY` (required to call `/api/mint/process`)

Optional role hardening:

- `AUTH_ADMIN_EMAILS=admin1@company.com,admin2@company.com`
- `AUTH_MANAGER_EMAILS=ops1@company.com,ops2@company.com`

Optional mint execution mode:

- `MINT_EXECUTOR_MODE=stub` (default for dev/testing)
- `MINT_EXECUTOR_MODE=webhook` for production executor integration
- `MINT_EXECUTOR_URL=https://your-mint-service.example.com/mint`
- `MINT_EXECUTOR_SHARED_SECRET=<shared-secret>`

### Worker operation

1. Queue is auto-synced from verified energy when dashboard data is fetched or telemetry is ingested.
2. Process pending jobs via protected worker endpoint:
   - `POST /api/mint/process`
   - header: `x-worker-key: <MINT_WORKER_KEY>`
3. Local/manual worker run:
   - `MINT_WORKER_KEY=<key> npm run mint:process`
4. Query mint job history:
   - `GET /api/mint/jobs?wallet=<wallet>`

Recommended production setup:

- Run `npm run mint:process` on a scheduler (e.g. every minute) from a trusted worker host.
- Use `MINT_EXECUTOR_MODE=webhook` and keep private keys only in the mint executor service.
- Restrict network access to `/api/mint/process` and rotate `MINT_WORKER_KEY` regularly.

## Google Login Setup

1. In Google Cloud Console, create an OAuth 2.0 Client ID (Web application).
2. Add the callback URL:
   `http://localhost:3000/api/auth/callback/google`
3. Copy `.env.example` to `.env.local` and set:
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
4. Restart `npm run dev`.

The dashboard now requires Google login before users can access verification and telemetry APIs.

Wallet sign-in is also available and uses nonce + signed message verification (anti-replay) through `/api/auth/solana/nonce`.

## DePIN-focused logo that explicitly tells the GreenCert story

This logo combines several key concepts into a single icon:

- **The Base Block (Emerald Green)**: The diamond/block shape represents the blockchain link and the hardware (solar panels) in Nigeria.

- **The Energy Vector (Cyan Arrow)**: The internal line transforms from a leaf (Nature) into a sharp, upward arrow (Growth/Value). The color shift from Emerald to Cyan (the color of clean atmosphere) symbolizes the Carbon Saving.

- **The Hidden Icon**: If you look closely at the central negative space, it forms a stylized 'G' for GreenCert.
