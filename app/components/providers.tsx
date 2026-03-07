"use client";

import { SolanaProvider } from "@solana/react-hooks";
import { SessionProvider } from "next-auth/react";
import { PropsWithChildren } from "react";

import {
  autoDiscover,
  backpack,
  createClient,
  injected,
  metamask,
  phantom,
  solflare,
  type WalletConnector,
} from "@solana/client";

function buildWalletConnectors(): readonly WalletConnector[] {
  const candidates: WalletConnector[] = [
    ...phantom(),
    ...solflare(),
    ...backpack(),
    ...metamask(),
    injected(),
    ...autoDiscover(),
  ];

  const byId = new Map<string, WalletConnector>();

  for (const connector of candidates) {
    if (!byId.has(connector.id)) {
      byId.set(connector.id, connector);
    }
  }

  return Array.from(byId.values());
}

const client = createClient({
  endpoint: "https://api.devnet.solana.com",
  walletConnectors: buildWalletConnectors(),
});

export function Providers({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <SolanaProvider client={client}>{children}</SolanaProvider>
    </SessionProvider>
  );
}
