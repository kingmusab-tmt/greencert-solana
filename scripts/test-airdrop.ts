import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
import { generateSigner, sol } from "@metaplex-foundation/umi";

async function main() {
  console.log("1. Creating UMI...");
  const umi = createUmi("https://api.devnet.solana.com").use(mplBubblegum());
  console.log("2. UMI created OK");

  console.log("3. Generating signer...");
  const signer = generateSigner(umi);
  console.log("4. Signer:", signer.publicKey.toString());

  console.log("5. Requesting airdrop...");
  try {
    await umi.rpc.airdrop(signer.publicKey, sol(2));
    console.log("6. Airdrop OK");
  } catch (e: any) {
    console.error("6. Airdrop failed:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  });
