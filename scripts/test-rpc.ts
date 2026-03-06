import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
import { generateSigner } from "@metaplex-foundation/umi";

console.log("1. Creating UMI...");
const umi = createUmi("https://api.devnet.solana.com").use(mplBubblegum());
console.log("2. UMI created");

const signer = generateSigner(umi);
console.log("3. Signer:", signer.publicKey.toString());

console.log("4. Testing RPC getLatestBlockhash...");
umi.rpc
  .getLatestBlockhash()
  .then((bh) => {
    console.log("5. Blockhash:", bh.blockhash.slice(0, 20) + "...");
    console.log("SUCCESS");
    process.exit(0);
  })
  .catch((e: unknown) => {
    console.error("RPC error:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
