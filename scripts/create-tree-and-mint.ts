/**
 * GreenCert Milestone 1 — Merkle Tree + cNFT Mint on Solana Devnet
 *
 * This script:
 *   1. Connects to Solana Devnet via UMI.
 *   2. Loads (or generates) a keypair and airdrops SOL.
 *   3. Creates a Bubblegum Merkle tree for state-compressed NFTs.
 *   4. Mints a test cNFT representing 100 kWh of verified solar energy.
 *
 * Usage:
 *   npx tsx scripts/create-tree-and-mint.ts                    # generate a fresh keypair
 *   npx tsx scripts/create-tree-and-mint.ts ~/.config/solana/id.json  # use an existing keypair
 */

import fs from "node:fs";
import path from "node:path";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  mplBubblegum,
  createTree,
  mintV1,
} from "@metaplex-foundation/mpl-bubblegum";
import {
  generateSigner,
  createSignerFromKeypair,
  keypairIdentity,
  publicKey,
  sol,
  type KeypairSigner,
} from "@metaplex-foundation/umi";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const RPC_URL = "https://api.devnet.solana.com";
const AIRDROP_SOL = 2; // SOL to request from devnet faucet

// Merkle tree params — maxDepth 14 + maxBufferSize 64 supports up to 16 384 leaves
const MAX_DEPTH = 14;
const MAX_BUFFER_SIZE = 64;
const CANOPY_DEPTH = 0;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function loadKeypairFile(filePath: string): {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
} {
  const raw = fs.readFileSync(filePath, "utf-8");
  const secretKey = Uint8Array.from(JSON.parse(raw));
  // Ed25519 secret key is 64 bytes; the last 32 are the public key
  const publicKeyBytes = secretKey.slice(32, 64);
  return { publicKey: publicKeyBytes, secretKey };
}

/** Retry airdrop up to `retries` times (devnet rate-limits aggressively). */
async function airdropWithRetry(
  rpc: {
    airdrop: (
      pk: ReturnType<typeof publicKey>,
      amount: ReturnType<typeof sol>
    ) => Promise<void>;
  },
  pk: ReturnType<typeof publicKey>,
  amount: ReturnType<typeof sol>,
  retries = 3
) {
  for (let i = 0; i < retries; i++) {
    try {
      await rpc.airdrop(pk, amount);
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (i < retries - 1) {
        console.log(
          `  ⏳ Airdrop attempt ${i + 1} failed (${msg}), retrying in 5 s…`
        );
        await new Promise((r) => setTimeout(r, 5000));
      } else {
        throw new Error(`Airdrop failed after ${retries} attempts: ${msg}`);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  console.log("\n🌱 GreenCert Milestone 1 — Merkle Tree & cNFT Mint\n");

  /* --- 1. Create UMI context ---------------------------------------- */
  const umi = createUmi(RPC_URL).use(mplBubblegum());

  /* --- 2. Resolve identity ------------------------------------------ */
  let signer: KeypairSigner;
  const keypairArg = process.argv[2];

  if (keypairArg && fs.existsSync(keypairArg)) {
    console.log(`🔑 Loading keypair from ${keypairArg}`);
    const { publicKey: pubBytes, secretKey } = loadKeypairFile(keypairArg);
    signer = createSignerFromKeypair(umi, {
      publicKey: publicKey(pubBytes),
      secretKey,
    });
  } else {
    console.log("🔑 Generating a new devnet keypair…");
    signer = generateSigner(umi);
  }

  umi.use(keypairIdentity(signer));
  console.log(`   Wallet: ${signer.publicKey}`);

  /* --- 3. Airdrop SOL ----------------------------------------------- */
  console.log(`\n💧 Requesting ${AIRDROP_SOL} SOL airdrop on devnet…`);
  await airdropWithRetry(umi.rpc, signer.publicKey, sol(AIRDROP_SOL));
  console.log("   Airdrop confirmed ✓");

  /* --- 4. Create Merkle tree ---------------------------------------- */
  console.log("\n🌳 Creating Bubblegum Merkle tree…");
  console.log(
    `   maxDepth=${MAX_DEPTH}  maxBufferSize=${MAX_BUFFER_SIZE}  canopyDepth=${CANOPY_DEPTH}`
  );

  const merkleTree = generateSigner(umi);

  const createTreeBuilder = await createTree(umi, {
    merkleTree,
    maxDepth: MAX_DEPTH,
    maxBufferSize: MAX_BUFFER_SIZE,
    canopyDepth: CANOPY_DEPTH,
  });

  await createTreeBuilder.sendAndConfirm(umi);
  console.log(`   Merkle tree: ${merkleTree.publicKey}`);
  console.log("   Tree created ✓");

  /* --- 5. Mint the cNFT --------------------------------------------- */
  console.log("\n⚡ Minting GreenCert cNFT (100 kWh)…");

  // Read the off-chain metadata JSON (for reference / URI placeholder).
  const metadataPath = path.resolve(
    __dirname,
    "metadata",
    "greencert-100kwh.json"
  );
  const offChainMeta = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));

  // In production, this URI would point to Arweave / IPFS-hosted JSON.
  // For devnet testing, we embed a placeholder indicating the metadata structure.
  const metadataUri = `https://greencert.ng/api/metadata/test-100kwh.json`;

  const mintTx = mintV1(umi, {
    leafOwner: signer.publicKey,
    merkleTree: merkleTree.publicKey,
    metadata: {
      name: offChainMeta.name,
      symbol: offChainMeta.symbol,
      uri: metadataUri,
      sellerFeeBasisPoints: 0,
      collection: null,
      creators: [{ address: signer.publicKey, verified: false, share: 100 }],
    },
  });

  await mintTx.sendAndConfirm(umi);
  console.log("   cNFT minted ✓");

  /* --- 6. Summary --------------------------------------------------- */
  console.log("\n────────────────────────────────────────────");
  console.log("  ✅  Milestone 1 complete");
  console.log(`  🔑  Wallet:        ${signer.publicKey}`);
  console.log(`  🌳  Merkle tree:   ${merkleTree.publicKey}`);
  console.log(`  📦  cNFT name:     ${offChainMeta.name}`);
  console.log(
    `  🔗  Explorer:      https://explorer.solana.com/address/${merkleTree.publicKey}?cluster=devnet`
  );
  console.log("────────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("\n❌ Error:", err);
  process.exit(1);
});
