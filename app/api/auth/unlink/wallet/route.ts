import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unlinkWalletFromUser } from "@/app/lib/auth-users";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await unlinkWalletFromUser(userId);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
