/**
 * GreenCert Milestone 1 — Merkle Tree + cNFT Mint on Solana Devnet
 *
 * Usage:
 *   node scripts/create-tree-and-mint.mjs                           # auto-creates & persists keypair
 *   node scripts/create-tree-and-mint.mjs ~/.config/solana/id.json  # use existing keypair
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
  lamports,
} from "@metaplex-foundation/umi";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RPC_URL = "https://api.devnet.solana.com";
const AIRDROP_SOL = 2;
const MAX_DEPTH = 14;
const MAX_BUFFER_SIZE = 64;
const CANOPY_DEPTH = 0;
const KEYPAIR_PATH = path.resolve(__dirname, ".keypair.json");

/* ---- helpers ---- */

function loadKeypairBytes(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const secretKey = Uint8Array.from(JSON.parse(raw));
  const publicKeyBytes = secretKey.slice(32, 64);
  return { publicKey: publicKeyBytes, secretKey };
}

function saveKeypairBytes(filePath, signer) {
  fs.writeFileSync(filePath, JSON.stringify(Array.from(signer.secretKey)));
}

async function ensureFunded(umi, pk) {
  const balance = await umi.rpc.getBalance(pk);
  const balSol = Number(balance.basisPoints) / 1e9;
  console.log(`   Current balance: ${balSol.toFixed(4)} SOL`);

  if (balSol >= 0.5) {
    console.log("   Balance sufficient, skipping airdrop");
    return;
  }

  console.log(`   Requesting ${AIRDROP_SOL} SOL airdrop...`);
  try {
    await umi.rpc.airdrop(pk, sol(AIRDROP_SOL));
    console.log("   Airdrop confirmed");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("429")) {
      console.log("\n   !! Devnet faucet rate-limited (429).");
      console.log(`   !! Please airdrop manually to: ${pk}`);
      console.log("   !! Visit https://faucet.solana.com and paste the address above.");
      console.log("   !! Then re-run this script.\n");
      process.exit(2);
    }
    throw err;
  }
}

/* ---- main ---- */

async function main() {
  console.log("\nGreenCert Milestone 1 — Merkle Tree & cNFT Mint\n");

  // 1. Create UMI context
  console.log("1. Creating UMI context...");
  const umi = createUmi(RPC_URL).use(mplBubblegum());
  console.log("   UMI ready");

  // 2. Resolve identity — prefer CLI arg → persisted file → generate new
  let signer;
  const keypairArg = process.argv[2];

  if (keypairArg && fs.existsSync(keypairArg)) {
    console.log(`2. Loading keypair from ${keypairArg}`);
    const kp = loadKeypairBytes(keypairArg);
    signer = createSignerFromKeypair(umi, {
      publicKey: publicKey(kp.publicKey),
      secretKey: kp.secretKey,
    });
  } else if (fs.existsSync(KEYPAIR_PATH)) {
    console.log(`2. Loading persisted keypair from ${KEYPAIR_PATH}`);
    const kp = loadKeypairBytes(KEYPAIR_PATH);
    signer = createSignerFromKeypair(umi, {
      publicKey: publicKey(kp.publicKey),
      secretKey: kp.secretKey,
    });
  } else {
    console.log("2. Generating a new devnet keypair...");
    signer = generateSigner(umi);
    saveKeypairBytes(KEYPAIR_PATH, signer);
    console.log(`   Keypair saved to ${KEYPAIR_PATH}`);
  }

  umi.use(keypairIdentity(signer));
  console.log(`   Wallet: ${signer.publicKey}`);

  // 3. Ensure funded
  console.log("\n3. Checking balance / airdrop...");
  await ensureFunded(umi, signer.publicKey);

  // 4. Create Merkle tree
  console.log("\n4. Creating Bubblegum Merkle tree...");
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
  console.log("   Tree created");

  // 5. Mint the cNFT
  console.log("\n5. Minting GreenCert cNFT (100 kWh)...");

  const metadataPath = path.resolve(
    __dirname,
    "metadata",
    "greencert-100kwh.json"
  );
  const offChainMeta = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
  const metadataUri = "https://greencert.ng/api/metadata/test-100kwh.json";

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
  console.log("   cNFT minted");

  // 6. Summary
  console.log("\n--------------------------------------------");
  console.log("  Milestone 1 complete");
  console.log(`  Wallet:        ${signer.publicKey}`);
  console.log(`  Merkle tree:   ${merkleTree.publicKey}`);
  console.log(`  cNFT name:     ${offChainMeta.name}`);
  console.log(
    `  Explorer:      https://explorer.solana.com/address/${merkleTree.publicKey}?cluster=devnet`
  );
  console.log("--------------------------------------------\n");
}

main().catch((err) => {
  console.error("\nError:", err);
  process.exit(1);
});
