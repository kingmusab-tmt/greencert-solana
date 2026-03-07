import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMongoDb } from "@/app/lib/mongodb";
import { attachWalletToUser, getAuthUserById } from "@/app/lib/auth-users";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const dashboardSettingsUrl = new URL("/dashboard/settings", request.url);

  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get("token") ?? "").trim();

    if (!token) {
      dashboardSettingsUrl.searchParams.set("linkError", "missing_token");
      return NextResponse.redirect(dashboardSettingsUrl);
    }

    const session = await auth();
    const googleUserId = session?.user?.id;

    if (!session?.user || !googleUserId) {
      dashboardSettingsUrl.searchParams.set("linkError", "unauthorized");
      return NextResponse.redirect(dashboardSettingsUrl);
    }

    const db = await getMongoDb();
    const requests = db.collection("authLinkRequests");

    const pending = await requests.findOne({
      token,
      purpose: "link-google",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!pending) {
      dashboardSettingsUrl.searchParams.set("linkError", "expired_or_invalid");
      return NextResponse.redirect(dashboardSettingsUrl);
    }

    const walletAddress = String(pending.walletAddress ?? "").trim();
    const walletUserId = String(pending.userId ?? "").trim();

    if (!walletAddress || !walletUserId) {
      dashboardSettingsUrl.searchParams.set(
        "linkError",
        "invalid_link_request"
      );
      return NextResponse.redirect(dashboardSettingsUrl);
    }

    const result = await attachWalletToUser(googleUserId, walletAddress, {
      transferFromUserId: walletUserId,
    });

    if (!result.ok) {
      dashboardSettingsUrl.searchParams.set("linkError", "wallet_conflict");
      return NextResponse.redirect(dashboardSettingsUrl);
    }

    await requests.updateOne(
      { token, used: false },
      { $set: { used: true, usedAt: new Date() } }
    );

    const linkedUser = await getAuthUserById(googleUserId);
    if (!linkedUser?.googleSub) {
      dashboardSettingsUrl.searchParams.set("linkError", "google_not_ready");
      return NextResponse.redirect(dashboardSettingsUrl);
    }

    dashboardSettingsUrl.searchParams.set("linked", "google");
    return NextResponse.redirect(dashboardSettingsUrl);
  } catch {
    dashboardSettingsUrl.searchParams.set("linkError", "server_error");
    return NextResponse.redirect(dashboardSettingsUrl);
  }
}
