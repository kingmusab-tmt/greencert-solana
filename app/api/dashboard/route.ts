import { NextResponse } from "next/server";
import { getWalletDashboard } from "@/app/lib/verification-store";
import { auth } from "@/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet")?.trim() ?? "";

    if (!wallet) {
      return NextResponse.json(
        { error: "wallet query param is required" },
        { status: 400 }
      );
    }

    return NextResponse.json(await getWalletDashboard(wallet));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
