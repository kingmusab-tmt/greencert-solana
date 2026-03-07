import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMongoDb } from "@/app/lib/mongodb";
import {
  buildSolanaSignInMessage,
  generateNonce,
  SOLANA_AUTH_STATEMENT,
} from "@/app/lib/solana-auth";

const NONCE_TTL_MINUTES = 10;

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { walletAddress?: string };
    const walletAddress = String(body.walletAddress ?? "").trim();

    if (walletAddress.length < 32) {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

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
      purpose: "link-wallet",
      userId,
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
