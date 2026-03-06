process.stderr.write("A. before imports\n");
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
import { generateSigner } from "@metaplex-foundation/umi";
process.stderr.write("B. after imports\n");

process.stderr.write("C. calling createUmi\n");
const umi = createUmi("https://api.devnet.solana.com");
process.stderr.write("D. umi created (no plugin)\n");
umi.use(mplBubblegum());
process.stderr.write("E. plugin applied\n");

const signer = generateSigner(umi);
process.stderr.write(`F. signer: ${signer.publicKey}\n`);

process.stderr.write("G. calling getLatestBlockhash\n");
umi.rpc
  .getLatestBlockhash()
  .then((bh) => {
    process.stderr.write(`H. blockhash: ${bh.blockhash.slice(0, 20)}\n`);
    process.exit(0);
  })
  .catch((e: unknown) => {
    process.stderr.write(`ERR: ${e instanceof Error ? e.message : e}\n`);
    process.exit(1);
  });

setTimeout(() => {
  process.stderr.write("TIMEOUT after 30s\n");
  process.exit(2);
}, 30000);
