import { NextResponse } from "next/server";
import { getMongoDb } from "@/app/lib/mongodb";
import {
  buildSolanaSignInMessage,
  generateNonce,
  SOLANA_AUTH_STATEMENT,
} from "@/app/lib/solana-auth";

const NONCE_TTL_MINUTES = 10;

export const runtime = "nodejs";

let nonceIndexInitPromise: Promise<void> | null = null;

async function ensureNonceIndexes() {
  if (!nonceIndexInitPromise) {
    nonceIndexInitPromise = (async () => {
      const db = await getMongoDb();
      await Promise.all([
        db.collection("authNonces").createIndex({ nonce: 1 }, { unique: true }),
        db.collection("authNonces").createIndex({ walletAddress: 1, used: 1 }),
        db.collection("authNonces").createIndex({ expiresAt: 1 }),
      ]);
    })();
  }

  await nonceIndexInitPromise;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { walletAddress?: string };
    const walletAddress = String(body.walletAddress ?? "").trim();

    if (walletAddress.length < 32) {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    await ensureNonceIndexes();

    const nonce = generateNonce();
    const issuedAt = new Date().toISOString();
    const uri = new URL(request.url).origin;
    const message = buildSolanaSignInMessage({
      statement: SOLANA_AUTH_STATEMENT,
      walletAddress,
      nonce,
      issuedAt,
      uri,
    });

    const expiresAt = new Date(Date.now() + NONCE_TTL_MINUTES * 60 * 1000);

    const db = await getMongoDb();
    await db.collection("authNonces").insertOne({
      nonce,
      walletAddress,
      message,
      used: false,
      issuedAt: new Date(issuedAt),
      expiresAt,
      createdAt: new Date(),
    });

    return NextResponse.json({
      nonce,
      message,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
