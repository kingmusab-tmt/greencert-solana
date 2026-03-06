# GreenCert Nigeria Grant Proposal

## Project Title

GreenCert Nigeria

## One-Liner Description

A DePIN platform leveraging Solana State Compression to tokenize verified carbon offsets from residential and SME solar installations in West Africa.

## Compensation Required

$10,000 USDG

## Project Details

### The Problem

Nigeria currently has one of the fastest-growing off-grid solar markets in Africa. However, the long tail of energy producers (households and small businesses) is excluded from the global carbon credit market. Traditional carbon verification is manual, expensive, and centralized. On-chain alternatives on many networks are too costly for micro-offsets, where gas fees can exceed the credit value.

### The Solution

GreenCert uses Solana State Compression to reduce verified credit minting costs to less than $0.01. Every 100 kWh of verified clean energy is tokenized as a compressed NFT (cNFT), enabling a Green Dividend for Nigerian solar users. This creates a secondary income stream for producers while advancing transparent, decentralized climate accounting.

### Oracle and Verification Approach (Proof of Generation)

To ensure each GreenCert is backed by real physics, GreenCert uses a multi-layer Validation Gateway:

1. Direct telemetry ingest: collect voltage, current, and cumulative watt-hours from smart inverter cloud APIs or IoT meters via MQTT/HTTPS.
2. Anti-fraud validation: cross-check production spikes with local irradiance and weather data from OpenWeatherMap; nighttime or zero-irradiance anomalies are flagged and rejected.
3. Accumulator logic: data is accumulated per user and device until the 100 kWh threshold is met.
4. Merkle-root anchoring and mint trigger: verified data is bundled into Merkle trees, then the Bubblegum program mints the cNFT to the user's wallet.

## Software Development Life Cycle (SDLC) and Roadmap

### Phase 1: Requirement Analysis and Environment Setup

- Define integration specs for common inverter brands (Growatt, Victron, and compatible alternatives).
- Finalize telemetry schema (voltage, current, watt-hours, timestamp, device ID).
- Set up WSL2 + Anchor development workflow and initialize public repository.

### Phase 2: On-Chain and Backend Development

- Build the Anchor/Rust program for tree management and mint authorization flow.
- Implement Node.js accumulator and verification middleware.
- Persist telemetry and verification state in MongoDB.

### Phase 3: Integration and Dashboard

- Build Next.js dashboard for wallet connection and credit visibility.
- Surface key metrics: accumulated kWh, avoided CO2 estimate, and minted cNFT count.
- Integrate verification status and mint readiness in UI.

### Phase 4: Mainnet Deployment and Community Handover

- Deploy production pipeline to Solana Mainnet Beta.
- Onboard pilot installations and mint initial live GreenCerts.
- Open-source code and documentation for reproducibility by DePIN builders.

## Goals and Milestones

| Milestone                                      | Deliverable                                                                                                                                           | Amount |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Milestone 1: Architecture and Compression Test | Set up a Merkle Tree on Solana Devnet and write a Typescript script that would successfully mint a test cNFT representing 100kWh of solar data.       | $1,000 |
| Milestone 2: Oracle Engine and Middleware      | Develop a Node.js middleware that connects to a solar inverter API (or IoT meter) and logs cumulative energy to a MongoDB database.                   | $2,000 |
| Milestone 3: Verification API & Dashboard      | Build the Node.js backend to ingest solar data and a Next.js frontend where users can connect Solana wallets to view their "Minted Carbon Avoidance.  | $2,500 |
| Milestone 4: Mainnet Pilot and Open Source     | Deploy to Mainnet and onboard real solar installations in Nigeria to mint the first live "GreenCerts." Open-source the code for the Solana community. | $4,500 |

## Primary Key Performance Indicator (KPI)

- Metric: Total metric tons of CO2 verified and tokenized on-chain.
- Success Definition: Success is achieved when at least 500 GreenCert cNFTs (representing 50 MWh of verified renewable generation) are minted on Solana Mainnet and the repository is fully public for the DePIN ecosystem.
