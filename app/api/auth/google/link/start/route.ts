import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMongoDb } from "@/app/lib/mongodb";
import { getAuthUserById } from "@/app/lib/auth-users";

const LINK_TTL_MINUTES = 10;

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authUser = await getAuthUserById(userId);
    if (!authUser?.walletAddress) {
      return NextResponse.json(
        { error: "Connect your wallet first before linking Google." },
        { status: 400 }
      );
    }

    const token = randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + LINK_TTL_MINUTES * 60 * 1000);

    const db = await getMongoDb();
    await db
      .collection("authLinkRequests")
      .createIndex({ token: 1 }, { unique: true });
    await db.collection("authLinkRequests").createIndex({ expiresAt: 1 });

    await db.collection("authLinkRequests").insertOne({
      token,
      purpose: "link-google",
      userId,
      walletAddress: authUser.walletAddress,
      used: false,
      createdAt: new Date(),
      expiresAt,
    });

    const origin = new URL(request.url).origin;
    const callbackUrl = `${origin}/api/auth/google/link/complete?token=${encodeURIComponent(token)}`;

    return NextResponse.json({ callbackUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
