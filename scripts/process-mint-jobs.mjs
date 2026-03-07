#!/usr/bin/env node

/**
 * Calls the protected mint worker endpoint and processes queued jobs.
 *
 * Usage:
 *   MINT_WORKER_KEY=... npm run mint:process
 *
 * Optional env vars:
 *   BASE_URL=http://localhost:3000
 *   LIMIT=10
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const MINT_WORKER_KEY = process.env.MINT_WORKER_KEY || "";
const LIMIT = Number(process.env.LIMIT || 10);

async function main() {
  if (!MINT_WORKER_KEY.trim()) {
    throw new Error("Set MINT_WORKER_KEY before running this script.");
  }

  const response = await fetch(`${BASE_URL}/api/mint/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-worker-key": MINT_WORKER_KEY,
    },
    body: JSON.stringify({ limit: LIMIT }),
  });

  const json = await response.json();

  if (!response.ok) {
    const message = typeof json?.error === "string" ? json.error : "Failed";
    throw new Error(`Worker request failed (${response.status}): ${message}`);
  }

  console.log("\nMint worker run complete\n");
  console.log(`Worker ID:       ${json.workerId}`);
  console.log(`Requested limit: ${json.requestedLimit}`);
  console.log(`Processed:       ${json.processedCount}`);
  console.log(`Completed:       ${json.completedCount}`);
  console.log(`Failed:          ${json.failedCount}\n`);

  const processed = Array.isArray(json.processed) ? json.processed : [];

  for (const item of processed) {
    const certIndex = Number(item.certIndex || 0);
    const wallet = String(item.walletAddress || "");
    const status = String(item.status || "unknown");
    const detail = String(item.detail || "");

    console.log(
      `cert#${certIndex.toString().padStart(2, "0")} ${status.toUpperCase()} ${wallet} ${detail}`
    );
  }

  console.log();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nMint worker error: ${message}\n`);
  process.exit(1);
});
