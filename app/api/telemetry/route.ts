import { NextResponse } from "next/server";
import { ingestTelemetry } from "@/app/lib/verification-store";
import { auth } from "@/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const result = await ingestTelemetry({
      walletAddress: String(body.walletAddress ?? ""),
      deviceId: String(body.deviceId ?? ""),
      cumulativeKwh: Number(body.cumulativeKwh),
      irradianceWm2: Number(body.irradianceWm2),
      timestamp: String(body.timestamp ?? ""),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
