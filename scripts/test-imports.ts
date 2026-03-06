console.log("Step 1: Starting imports...");
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
console.log("Step 2: umi-bundle-defaults loaded");
import { mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
console.log("Step 3: mpl-bubblegum loaded");
import { generateSigner, sol } from "@metaplex-foundation/umi";
console.log("Step 4: umi loaded");
console.log("All imports OK");
process.exit(0);
