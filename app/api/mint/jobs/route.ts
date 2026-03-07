import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMongoDb } from "@/app/lib/mongodb";

export const runtime = "nodejs";

type MintJobRow = {
  id: string;
  walletAddress: string;
  certIndex: number;
  status: string;
  attempts: number;
  lastError?: string;
  txSignature?: string;
  assetId?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
};

function canReadWallet(
  session: Awaited<ReturnType<typeof auth>>,
  wallet: string
) {
  const role = session?.user?.role ?? "member";
  if (role === "admin" || role === "manager") {
    return true;
  }

  return session?.user?.linkedWalletAddress === wallet;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const wallet =
      searchParams.get("wallet")?.trim() ||
      session.user.linkedWalletAddress ||
      "";

    if (!wallet) {
      return NextResponse.json(
        { error: "wallet query param is required" },
        { status: 400 }
      );
    }

    if (!canReadWallet(session, wallet)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getMongoDb();
    const rows = await db
      .collection<MintJobRow>("mintJobs")
      .find({ walletAddress: wallet })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return NextResponse.json({
      walletAddress: wallet,
      jobs: rows.map((row) => ({
        id: row.id,
        certIndex: Number(row.certIndex),
        status: row.status,
        attempts: Number(row.attempts),
        lastError: row.lastError,
        txSignature: row.txSignature,
        assetId: row.assetId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        completedAt: row.completedAt
          ? row.completedAt.toISOString()
          : undefined,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
