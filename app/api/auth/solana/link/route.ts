import { NextResponse } from "next/server";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { auth } from "@/auth";
import { getMongoDb } from "@/app/lib/mongodb";
import { parseSolanaSignInMessage } from "@/app/lib/solana-auth";
import { attachWalletToUser } from "@/app/lib/auth-users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      walletAddress?: string;
      message?: string;
      signature?: string;
    };

    const walletAddress = String(body.walletAddress ?? "").trim();
    const message = String(body.message ?? "");
    const signatureBase64 = String(body.signature ?? "");

    if (walletAddress.length < 32 || !message || !signatureBase64) {
      return NextResponse.json(
        { error: "walletAddress, message and signature are required" },
        { status: 400 }
      );
    }

    const parsedMessage = parseSolanaSignInMessage(message);
    if (!parsedMessage || parsedMessage.walletAddress !== walletAddress) {
      return NextResponse.json(
        { error: "Invalid wallet challenge message" },
        { status: 400 }
      );
    }

    let isValid = false;
    try {
      const publicKey = bs58.decode(walletAddress);
      const signature = Buffer.from(signatureBase64, "base64");
      const messageBytes = new TextEncoder().encode(message);

      isValid = nacl.sign.detached.verify(messageBytes, signature, publicKey);
    } catch {
      isValid = false;
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Wallet signature verification failed" },
        { status: 400 }
      );
    }

    const db = await getMongoDb();
    const nonces = db.collection("authNonces");

    const nonceRecord = await nonces.findOne({
      nonce: parsedMessage.nonce,
      walletAddress,
      used: false,
      expiresAt: { $gt: new Date() },
      message,
      purpose: "link-wallet",
      userId,
    });

    if (!nonceRecord) {
      return NextResponse.json(
        { error: "Wallet challenge is invalid or expired" },
        { status: 400 }
      );
    }

    const nonceConsumeResult = await nonces.updateOne(
      {
        nonce: parsedMessage.nonce,
        walletAddress,
        used: false,
        purpose: "link-wallet",
        userId,
      },
      {
        $set: {
          used: true,
          usedAt: new Date(),
        },
      }
    );

    if (nonceConsumeResult.modifiedCount !== 1) {
      return NextResponse.json(
        { error: "Wallet challenge was already used" },
        { status: 400 }
      );
    }

    const linkResult = await attachWalletToUser(userId, walletAddress);
    if (!linkResult.ok) {
      return NextResponse.json({ error: linkResult.reason }, { status: 409 });
    }

    return NextResponse.json({ ok: true, walletAddress });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
