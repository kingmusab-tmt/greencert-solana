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
