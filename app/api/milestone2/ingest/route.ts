import { NextResponse } from "next/server";
import { getMongoDb } from "@/app/lib/mongodb";
import { ingestTelemetry } from "@/app/lib/verification-store";

export const runtime = "nodejs";

type IngestPayload = {
  walletAddress?: unknown;
  deviceId?: unknown;
  cumulativeKwh?: unknown;
  irradianceWm2?: unknown;
  timestamp?: unknown;
};

function getHeaderValue(headers: Headers, key: string): string {
  return String(headers.get(key) ?? "").trim();
}

export async function POST(request: Request) {
  try {
    const expectedKey = String(process.env.MILESTONE2_INGEST_KEY ?? "").trim();
    if (!expectedKey) {
      return NextResponse.json(
        { error: "MILESTONE2_INGEST_KEY is not configured" },
        { status: 500 }
      );
    }

    const providedKey =
      getHeaderValue(request.headers, "x-ingest-key") ||
      getHeaderValue(request.headers, "authorization").replace(
        /^Bearer\s+/i,
        ""
      );

    if (!providedKey || providedKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: IngestPayload;
    try {
      body = (await request.json()) as IngestPayload;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const payload = {
      walletAddress: String(body.walletAddress ?? "").trim(),
      deviceId: String(body.deviceId ?? "").trim(),
      cumulativeKwh: Number(body.cumulativeKwh),
      irradianceWm2: Number(body.irradianceWm2),
      timestamp: String(body.timestamp ?? ""),
    };

    // Keep an immutable audit trail of milestone-2 middleware submissions.
    const db = await getMongoDb();
    await db.collection("oracleTelemetryIngest").insertOne({
      source: "milestone2",
      payload,
      receivedAt: new Date(),
      userAgent: getHeaderValue(request.headers, "user-agent"),
    });

    const result = await ingestTelemetry(payload);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        pipeline: "milestone2-to-milestone3",
        event: result.event,
        dashboard: result.dashboard,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
