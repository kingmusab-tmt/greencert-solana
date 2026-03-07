import { randomUUID } from "crypto";
import { getMongoDb } from "@/app/lib/mongodb";

export type MintJobStatus = "pending" | "processing" | "completed" | "failed";

export type MintJobDoc = {
  id: string;
  walletAddress: string;
  certIndex: number;
  thresholdKwh: number;
  status: MintJobStatus;
  attempts: number;
  workerId?: string;
  lastError?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type MintProofDoc = {
  id: string;
  jobId: string;
  walletAddress: string;
  certIndex: number;
  txSignature: string;
  assetId: string;
  explorerUrl?: string;
  mintedAt: Date;
  createdAt: Date;
};

type MintExecutionResult = {
  txSignature: string;
  assetId: string;
  explorerUrl?: string;
};

type ProcessMintJobsOptions = {
  limit?: number;
  workerId?: string;
};

const MINT_THRESHOLD_KWH = 100;
const MAX_MINT_ATTEMPTS = 5;

let mintIndexesPromise: Promise<void> | null = null;

function normalizeWalletAddress(walletAddress: string): string {
  return walletAddress.trim();
}

async function ensureMintIndexes() {
  if (!mintIndexesPromise) {
    mintIndexesPromise = (async () => {
      const db = await getMongoDb();
      await Promise.all([
        db
          .collection<MintJobDoc>("mintJobs")
          .createIndex({ walletAddress: 1, certIndex: 1 }, { unique: true }),
        db
          .collection<MintJobDoc>("mintJobs")
          .createIndex({ status: 1, updatedAt: 1 }),
        db
          .collection<MintProofDoc>("mintProofs")
          .createIndex({ walletAddress: 1, certIndex: 1 }, { unique: true }),
        db
          .collection<MintProofDoc>("mintProofs")
          .createIndex({ jobId: 1 }, { unique: true }),
        db
          .collection<MintProofDoc>("mintProofs")
          .createIndex({ walletAddress: 1, mintedAt: -1 }),
      ]);
    })();
  }

  await mintIndexesPromise;
}

export async function syncMintJobsForWallet(
  walletAddress: string,
  verifiedKwh: number
) {
  await ensureMintIndexes();

  const normalizedWallet = normalizeWalletAddress(walletAddress);
  const eligibleCertCount = Math.floor(verifiedKwh / MINT_THRESHOLD_KWH);

  if (eligibleCertCount <= 0) {
    return {
      eligibleCertCount,
      createdJobs: 0,
    };
  }

  const db = await getMongoDb();
  const mintJobs = db.collection<MintJobDoc>("mintJobs");

  const existing = await mintJobs
    .find(
      {
        walletAddress: normalizedWallet,
        certIndex: { $lte: eligibleCertCount },
      },
      { projection: { certIndex: 1 } }
    )
    .toArray();

  const existingIndexes = new Set(existing.map((job) => Number(job.certIndex)));
  const now = new Date();
  const docsToInsert: MintJobDoc[] = [];

  for (let certIndex = 1; certIndex <= eligibleCertCount; certIndex += 1) {
    if (!existingIndexes.has(certIndex)) {
      docsToInsert.push({
        id: randomUUID(),
        walletAddress: normalizedWallet,
        certIndex,
        thresholdKwh: MINT_THRESHOLD_KWH,
        status: "pending",
        attempts: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  if (docsToInsert.length > 0) {
    try {
      await mintJobs.insertMany(docsToInsert, { ordered: false });
    } catch {
      // Ignore duplicate races from parallel sync calls.
    }
  }

  return {
    eligibleCertCount,
    createdJobs: docsToInsert.length,
  };
}

export async function getMintProgress(walletAddress: string) {
  await ensureMintIndexes();

  const normalizedWallet = normalizeWalletAddress(walletAddress);
  const db = await getMongoDb();

  const [completedProofCount, pendingJobCount] = await Promise.all([
    db.collection<MintProofDoc>("mintProofs").countDocuments({
      walletAddress: normalizedWallet,
    }),
    db.collection<MintJobDoc>("mintJobs").countDocuments({
      walletAddress: normalizedWallet,
      status: { $in: ["pending", "processing"] },
    }),
  ]);

  return {
    completedProofCount,
    pendingJobCount,
  };
}

export async function listRecentMintProofs(walletAddress: string, limit = 5) {
  await ensureMintIndexes();

  const normalizedWallet = normalizeWalletAddress(walletAddress);
  const db = await getMongoDb();

  const rows = await db
    .collection<MintProofDoc>("mintProofs")
    .find({ walletAddress: normalizedWallet })
    .sort({ mintedAt: -1 })
    .limit(Math.max(1, Math.min(limit, 20)))
    .toArray();

  return rows.map((row) => ({
    id: row.id,
    certIndex: Number(row.certIndex),
    txSignature: row.txSignature,
    assetId: row.assetId,
    explorerUrl: row.explorerUrl,
    mintedAt: row.mintedAt.toISOString(),
  }));
}

async function claimPendingMintJob(workerId: string) {
  await ensureMintIndexes();

  const db = await getMongoDb();
  const mintJobs = db.collection<MintJobDoc>("mintJobs");

  const claimed = await mintJobs.findOneAndUpdate(
    {
      status: "pending",
      attempts: { $lt: MAX_MINT_ATTEMPTS },
    },
    {
      $set: {
        status: "processing",
        workerId,
        startedAt: new Date(),
        updatedAt: new Date(),
      },
      $inc: {
        attempts: 1,
      },
    },
    {
      sort: { createdAt: 1 },
      returnDocument: "after",
    }
  );

  return claimed;
}

async function executeMint(job: MintJobDoc): Promise<MintExecutionResult> {
  const mode = String(process.env.MINT_EXECUTOR_MODE ?? "stub").trim();

  if (mode === "webhook") {
    const url = String(process.env.MINT_EXECUTOR_URL ?? "").trim();
    const sharedSecret = String(
      process.env.MINT_EXECUTOR_SHARED_SECRET ?? ""
    ).trim();

    if (!url) {
      throw new Error("MINT_EXECUTOR_URL is required when mode=webhook");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mint-executor-key": sharedSecret,
      },
      body: JSON.stringify({
        jobId: job.id,
        walletAddress: job.walletAddress,
        certIndex: job.certIndex,
        thresholdKwh: job.thresholdKwh,
      }),
    });

    const json = (await response.json()) as {
      txSignature?: unknown;
      assetId?: unknown;
      explorerUrl?: unknown;
      error?: unknown;
    };

    if (!response.ok) {
      const reason =
        typeof json.error === "string"
          ? json.error
          : `Executor failed (${response.status})`;
      throw new Error(reason);
    }

    const txSignature = String(json.txSignature ?? "").trim();
    const assetId = String(json.assetId ?? "").trim();

    if (!txSignature || !assetId) {
      throw new Error("Executor response must include txSignature and assetId");
    }

    const explorerUrlRaw = String(json.explorerUrl ?? "").trim();

    return {
      txSignature,
      assetId,
      explorerUrl: explorerUrlRaw || undefined,
    };
  }

  const txSignature = randomUUID().replaceAll("-", "");
  const assetId = `stub-${job.walletAddress.slice(0, 8)}-${job.certIndex}`;

  return {
    txSignature,
    assetId,
    explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
  };
}

async function markMintCompleted(job: MintJobDoc, result: MintExecutionResult) {
  const db = await getMongoDb();
  const mintJobs = db.collection<MintJobDoc>("mintJobs");
  const mintProofs = db.collection<MintProofDoc>("mintProofs");
  const now = new Date();

  try {
    await mintProofs.insertOne({
      id: randomUUID(),
      jobId: job.id,
      walletAddress: job.walletAddress,
      certIndex: job.certIndex,
      txSignature: result.txSignature,
      assetId: result.assetId,
      explorerUrl: result.explorerUrl,
      mintedAt: now,
      createdAt: now,
    });
  } catch {
    // Idempotency guard: if proof already exists, continue marking the job complete.
  }

  await mintJobs.updateOne(
    { id: job.id },
    {
      $set: {
        status: "completed",
        completedAt: now,
        updatedAt: now,
        txSignature: result.txSignature,
        assetId: result.assetId,
      },
      $unset: {
        lastError: "",
      },
    }
  );
}

async function markMintFailed(job: MintJobDoc, message: string) {
  const db = await getMongoDb();
  const mintJobs = db.collection<MintJobDoc>("mintJobs");

  const shouldDeadLetter = job.attempts >= MAX_MINT_ATTEMPTS;
  await mintJobs.updateOne(
    { id: job.id },
    {
      $set: {
        status: shouldDeadLetter ? "failed" : "pending",
        lastError: message.slice(0, 500),
        updatedAt: new Date(),
      },
    }
  );
}

export async function processMintJobs(options?: ProcessMintJobsOptions) {
  const limit = Math.max(1, Math.min(Number(options?.limit ?? 5), 50));
  const workerId =
    String(options?.workerId ?? "").trim() || `worker-${randomUUID()}`;

  const processed: Array<{
    jobId: string;
    walletAddress: string;
    certIndex: number;
    status: "completed" | "failed";
    detail: string;
  }> = [];

  for (let i = 0; i < limit; i += 1) {
    const job = await claimPendingMintJob(workerId);
    if (!job) {
      break;
    }

    try {
      const execution = await executeMint(job);
      await markMintCompleted(job, execution);
      processed.push({
        jobId: job.id,
        walletAddress: job.walletAddress,
        certIndex: job.certIndex,
        status: "completed",
        detail: execution.txSignature,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mint failed";
      await markMintFailed(job, message);
      processed.push({
        jobId: job.id,
        walletAddress: job.walletAddress,
        certIndex: job.certIndex,
        status: "failed",
        detail: message,
      });
    }
  }

  return {
    workerId,
    requestedLimit: limit,
    processedCount: processed.length,
    completedCount: processed.filter((item) => item.status === "completed")
      .length,
    failedCount: processed.filter((item) => item.status === "failed").length,
    processed,
  };
}
