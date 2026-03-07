import { randomUUID } from "crypto";

export const SOLANA_AUTH_STATEMENT = "Sign in to GreenCert Dashboard";

export type SolanaSignInPayload = {
  statement: string;
  walletAddress: string;
  nonce: string;
  issuedAt: string;
  uri: string;
};

export function generateNonce(): string {
  return randomUUID().replace(/-/g, "");
}

export function buildSolanaSignInMessage(payload: SolanaSignInPayload): string {
  return JSON.stringify(payload);
}

export function parseSolanaSignInMessage(
  message: string
): SolanaSignInPayload | null {
  try {
    const parsed = JSON.parse(message) as Partial<SolanaSignInPayload>;

    if (
      parsed.statement !== SOLANA_AUTH_STATEMENT ||
      typeof parsed.walletAddress !== "string" ||
      typeof parsed.nonce !== "string" ||
      typeof parsed.issuedAt !== "string" ||
      typeof parsed.uri !== "string"
    ) {
      return null;
    }

    if (Number.isNaN(Date.parse(parsed.issuedAt))) {
      return null;
    }

    return {
      statement: parsed.statement,
      walletAddress: parsed.walletAddress,
      nonce: parsed.nonce,
      issuedAt: parsed.issuedAt,
      uri: parsed.uri,
    };
  } catch {
    return null;
  }
}
