#!/usr/bin/env node

/**
 * Simulates Milestone 2 telemetry submissions into the Milestone 3 bridge.
 *
 * Usage:
 *   MILESTONE2_INGEST_KEY=yourkey npm run simulate:devnet
 *
 * Optional env vars:
 *   BASE_URL=http://localhost:3000
 *   WALLET_ADDRESS=<solana-wallet>
 *   DEVICE_ID=<device-id>
 *   START_KWH=0
 *   STEP_KWH=8.5
 *   SAMPLES=15
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const INGEST_KEY = process.env.MILESTONE2_INGEST_KEY || "";
const WALLET_ADDRESS =
  process.env.WALLET_ADDRESS || "8u8Pv3pSK2vR2rL6cx9w5y3CwWajMMjVn7mQqVn9jEo5";
const DEVICE_ID = process.env.DEVICE_ID || "growatt-devnet-001";
const START_KWH = Number(process.env.START_KWH || 0);
const STEP_KWH = Number(process.env.STEP_KWH || 8.5);
const SAMPLES = Number(process.env.SAMPLES || 15);

function assertInputs() {
  if (!INGEST_KEY.trim()) {
    throw new Error("Set MILESTONE2_INGEST_KEY before running this script.");
  }

  if (WALLET_ADDRESS.trim().length < 32) {
    throw new Error(
      "WALLET_ADDRESS must be a valid Solana address-like string."
    );
  }

  if (!Number.isFinite(SAMPLES) || SAMPLES <= 0) {
    throw new Error("SAMPLES must be a positive number.");
  }

  if (!Number.isFinite(STEP_KWH) || STEP_KWH <= 0) {
    throw new Error("STEP_KWH must be a positive number.");
  }
}

function buildPayload(index) {
  const cumulativeKwh = START_KWH + STEP_KWH * index;
  const irradianceWm2 = 700 + ((index % 3) - 1) * 60;
  const timestamp = new Date(Date.now() + index * 60 * 60 * 1000).toISOString();

  return {
    walletAddress: WALLET_ADDRESS,
    deviceId: DEVICE_ID,
    cumulativeKwh: Number(cumulativeKwh.toFixed(3)),
    irradianceWm2,
    timestamp,
  };
}

async function sendSample(index) {
  const payload = buildPayload(index);

  const response = await fetch(`${BASE_URL}/api/milestone2/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ingest-key": INGEST_KEY,
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();

  if (!response.ok) {
    const msg = typeof json?.error === "string" ? json.error : "Ingest failed";
    throw new Error(`Sample #${index + 1} failed (${response.status}): ${msg}`);
  }

  return json;
}

async function main() {
  assertInputs();

  console.log("\nGreenCert Devnet Simulation (Milestone 2 -> 3)\n");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Wallet:   ${WALLET_ADDRESS}`);
  console.log(`Device:   ${DEVICE_ID}`);
  console.log(`Samples:  ${SAMPLES}`);
  console.log(`Step:     ${STEP_KWH} kWh\n`);

  let latest = null;

  for (let i = 0; i < SAMPLES; i += 1) {
    latest = await sendSample(i);

    const d = latest.dashboard;
    const e = latest.event;

    console.log(
      `#${String(i + 1).padStart(2, "0")} ` +
        `verified=${e.verified ? "yes" : "no"} ` +
        `delta=${e.verifiedDeltaKwh.toFixed(2)}kWh ` +
        `verifiedTotal=${d.verifiedKwh.toFixed(2)}kWh ` +
        `minted=${d.mintedCertCount} ` +
        `ready=${d.mintReady ? "yes" : "no"}`
    );
  }

  if (latest) {
    const d = latest.dashboard;
    console.log("\nSimulation complete.");
    console.log(`Verified kWh:        ${d.verifiedKwh.toFixed(2)}`);
    console.log(`Minted cert count:   ${d.mintedCertCount}`);
    console.log(`Mint readiness:      ${d.mintReady ? "READY" : "NOT READY"}`);
    console.log(`kWh to next mint:    ${d.kwhToNextMint.toFixed(2)}`);
    console.log(`Avoided CO2 (tonne): ${d.avoidedCo2Tonnes.toFixed(4)}\n`);

    if (d.mintReady) {
      console.log(
        "Next step: run your on-chain mint flow (Milestone 1 script) on devnet."
      );
      console.log("Command: npm run milestone1\n");
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nSimulation error: ${message}\n`);
  process.exit(1);
});
