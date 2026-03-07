import { NextResponse } from "next/server";
import { processMintJobs } from "@/app/lib/mint-jobs";

export const runtime = "nodejs";

function readWorkerKey(headers: Headers): string {
  const direct = String(headers.get("x-worker-key") ?? "").trim();
  if (direct) {
    return direct;
  }

  return String(headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

export async function POST(request: Request) {
  try {
    const expected = String(process.env.MINT_WORKER_KEY ?? "").trim();
    if (!expected) {
      return NextResponse.json(
        { error: "MINT_WORKER_KEY is not configured" },
        { status: 500 }
      );
    }

    const provided = readWorkerKey(request.headers);
    if (!provided || provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let limit = 5;
    try {
      const body = (await request.json()) as { limit?: unknown };
      if (body && typeof body.limit !== "undefined") {
        const numeric = Number(body.limit);
        if (Number.isFinite(numeric)) {
          limit = numeric;
        }
      }
    } catch {
      // Optional JSON body; defaults are fine.
    }

    const result = await processMintJobs({
      limit,
      workerId: `api-worker-${crypto.randomUUID()}`,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
