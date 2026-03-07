import { getMongoDb } from "@/app/lib/mongodb";
import {
  getMintProgress,
  listRecentMintProofs,
  syncMintJobsForWallet,
} from "@/app/lib/mint-jobs";

type TelemetryPayload = {
  walletAddress: string;
  deviceId: string;
  cumulativeKwh: number;
  irradianceWm2: number;
  timestamp: string;
};

type TelemetryEvent = {
  id: string;
  walletAddress: string;
  deviceId: string;
  timestamp: string;
  cumulativeKwh: number;
  irradianceWm2: number;
  verified: boolean;
  reason: string;
  deltaKwh: number;
  verifiedDeltaKwh: number;
};

type WalletAggregate = {
  rawKwh: number;
  verifiedKwh: number;
};

type WalletDashboard = {
  walletAddress: string;
  connectedDevices: number;
  rawKwh: number;
  verifiedKwh: number;
  avoidedCo2Tonnes: number;
  mintedCertCount: number;
  eligibleCertCount: number;
  pendingMintJobs: number;
  kwhToNextMint: number;
  mintReady: boolean;
  verificationRate: number;
  recentEvents: TelemetryEvent[];
  recentMints: Array<{
    id: string;
    certIndex: number;
    txSignature: string;
    assetId: string;
    explorerUrl?: string;
    mintedAt: string;
  }>;
};

type TelemetryEventDocument = TelemetryEvent & {
  timestamp: Date;
  createdAt: Date;
};

type DeviceState = {
  deviceId: string;
  lastCumulativeKwh: number;
  lastTimestampMs: number;
  walletAddress: string;
};

const MINT_THRESHOLD_KWH = 100;
const EMISSION_FACTOR_TONNES_PER_KWH = 0.0005;
const RECENT_EVENTS_LIMIT = 5;

let indexInitPromise: Promise<void> | null = null;

function normalizeWalletAddress(walletAddress: string): string {
  return walletAddress.trim();
}

function hasPlausibleIrradiance(irradianceWm2: number): boolean {
  return irradianceWm2 >= 50 && irradianceWm2 <= 1400;
}

function isMonotonic(
  cumulativeKwh: number,
  prevCumulativeKwh: number
): boolean {
  return cumulativeKwh >= prevCumulativeKwh;
}

function clampNonNegative(value: number): number {
  return value < 0 ? 0 : value;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

async function ensureIndexes() {
  if (!indexInitPromise) {
    indexInitPromise = (async () => {
      const db = await getMongoDb();
      await Promise.all([
        db
          .collection("telemetryEvents")
          .createIndex({ walletAddress: 1, timestamp: -1 }),
        db
          .collection("telemetryEvents")
          .createIndex({ deviceId: 1, timestamp: -1 }),
        db
          .collection("deviceStates")
          .createIndex({ deviceId: 1 }, { unique: true }),
        db.collection("deviceStates").createIndex({ walletAddress: 1 }),
      ]);
    })();
  }

  await indexInitPromise;
}

function validatePayload(payload: Partial<TelemetryPayload>): string | null {
  if (!payload.walletAddress || payload.walletAddress.trim().length < 32) {
    return "walletAddress is required and must look like a Solana address";
  }
  if (!payload.deviceId || payload.deviceId.trim().length < 3) {
    return "deviceId is required";
  }
  if (typeof payload.cumulativeKwh !== "number" || payload.cumulativeKwh < 0) {
    return "cumulativeKwh must be a non-negative number";
  }
  if (typeof payload.irradianceWm2 !== "number" || payload.irradianceWm2 < 0) {
    return "irradianceWm2 must be a non-negative number";
  }
  if (!payload.timestamp || Number.isNaN(Date.parse(payload.timestamp))) {
    return "timestamp must be an ISO date string";
  }
  return null;
}

function computeVerification(
  payload: TelemetryPayload,
  prev: DeviceState | null
): {
  verified: boolean;
  reason: string;
  deltaKwh: number;
  verifiedDeltaKwh: number;
} {
  if (!hasPlausibleIrradiance(payload.irradianceWm2)) {
    return {
      verified: false,
      reason: "irradiance_out_of_bounds",
      deltaKwh: 0,
      verifiedDeltaKwh: 0,
    };
  }

  if (!prev) {
    return {
      verified: true,
      reason: "accepted_first_sample",
      deltaKwh: 0,
      verifiedDeltaKwh: 0,
    };
  }

  if (!isMonotonic(payload.cumulativeKwh, prev.lastCumulativeKwh)) {
    return {
      verified: false,
      reason: "cumulative_kwh_regression",
      deltaKwh: 0,
      verifiedDeltaKwh: 0,
    };
  }

  const deltaKwh = clampNonNegative(
    payload.cumulativeKwh - prev.lastCumulativeKwh
  );
  const elapsedMs = Date.parse(payload.timestamp) - prev.lastTimestampMs;

  if (elapsedMs <= 0) {
    return {
      verified: false,
      reason: "stale_or_out_of_order_timestamp",
      deltaKwh,
      verifiedDeltaKwh: 0,
    };
  }

  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const maxPlausibleKwh = 25 * elapsedHours;

  if (deltaKwh > maxPlausibleKwh) {
    return {
      verified: false,
      reason: "generation_spike_rejected",
      deltaKwh,
      verifiedDeltaKwh: 0,
    };
  }

  return {
    verified: true,
    reason: "accepted",
    deltaKwh,
    verifiedDeltaKwh: deltaKwh,
  };
}

export async function ingestTelemetry(payload: Partial<TelemetryPayload>) {
  const validationError = validatePayload(payload);
  if (validationError) {
    return {
      ok: false as const,
      error: validationError,
    };
  }

  const normalizedWallet = normalizeWalletAddress(payload.walletAddress!);
  const normalizedDeviceId = payload.deviceId!.trim();
  const normalizedPayload: TelemetryPayload = {
    walletAddress: normalizedWallet,
    deviceId: normalizedDeviceId,
    cumulativeKwh: payload.cumulativeKwh!,
    irradianceWm2: payload.irradianceWm2!,
    timestamp: new Date(payload.timestamp!).toISOString(),
  };

  await ensureIndexes();

  const db = await getMongoDb();
  const deviceStates = db.collection<DeviceState>("deviceStates");
  const telemetryEvents = db.collection("telemetryEvents");

  const prev = await deviceStates.findOne({ deviceId: normalizedDeviceId });
  const verification = computeVerification(normalizedPayload, prev);

  const event: TelemetryEvent = {
    id: crypto.randomUUID(),
    walletAddress: normalizedWallet,
    deviceId: normalizedDeviceId,
    timestamp: normalizedPayload.timestamp,
    cumulativeKwh: normalizedPayload.cumulativeKwh,
    irradianceWm2: normalizedPayload.irradianceWm2,
    verified: verification.verified,
    reason: verification.reason,
    deltaKwh: round(verification.deltaKwh, 3),
    verifiedDeltaKwh: round(verification.verifiedDeltaKwh, 3),
  };

  await telemetryEvents.insertOne({
    ...event,
    timestamp: new Date(event.timestamp),
    createdAt: new Date(),
  });

  await deviceStates.updateOne(
    { deviceId: normalizedDeviceId },
    {
      $set: {
        deviceId: normalizedDeviceId,
        walletAddress: normalizedWallet,
        lastCumulativeKwh: normalizedPayload.cumulativeKwh,
        lastTimestampMs: Date.parse(normalizedPayload.timestamp),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return {
    ok: true as const,
    event,
    dashboard: await getWalletDashboard(normalizedWallet),
  };
}

export async function getWalletDashboard(
  walletAddress: string
): Promise<WalletDashboard> {
  const normalizedWallet = normalizeWalletAddress(walletAddress);

  await ensureIndexes();

  const db = await getMongoDb();
  const telemetryEvents =
    db.collection<TelemetryEventDocument>("telemetryEvents");
  const deviceStates = db.collection<DeviceState>("deviceStates");

  const [statsRow, recentEventsRaw, connectedDevices] = await Promise.all([
    telemetryEvents
      .aggregate<{
        rawKwh: number;
        verifiedKwh: number;
        totalEvents: number;
        verifiedEvents: number;
      }>([
        { $match: { walletAddress: normalizedWallet } },
        {
          $group: {
            _id: null,
            rawKwh: { $sum: "$deltaKwh" },
            verifiedKwh: { $sum: "$verifiedDeltaKwh" },
            totalEvents: { $sum: 1 },
            verifiedEvents: {
              $sum: {
                $cond: [{ $eq: ["$verified", true] }, 1, 0],
              },
            },
          },
        },
      ])
      .next(),
    telemetryEvents
      .find({ walletAddress: normalizedWallet })
      .sort({ timestamp: -1 })
      .limit(RECENT_EVENTS_LIMIT)
      .toArray(),
    deviceStates.countDocuments({ walletAddress: normalizedWallet }),
  ]);

  const aggregate: WalletAggregate = {
    rawKwh: statsRow?.rawKwh ?? 0,
    verifiedKwh: statsRow?.verifiedKwh ?? 0,
  };

  const mintSync = await syncMintJobsForWallet(
    normalizedWallet,
    aggregate.verifiedKwh
  );

  const [mintProgress, recentMints] = await Promise.all([
    getMintProgress(normalizedWallet),
    listRecentMintProofs(normalizedWallet, 5),
  ]);

  const totalEvents = statsRow?.totalEvents ?? 0;
  const verifiedEvents = statsRow?.verifiedEvents ?? 0;
  const verificationRate =
    totalEvents === 0 ? 0 : (verifiedEvents / totalEvents) * 100;

  const mintedCertCount = mintProgress.completedProofCount;
  const remainderKwh = aggregate.verifiedKwh % MINT_THRESHOLD_KWH;
  const kwhToNextMint = round(
    remainderKwh === 0 ? MINT_THRESHOLD_KWH : MINT_THRESHOLD_KWH - remainderKwh,
    2
  );

  const recentEvents: TelemetryEvent[] = recentEventsRaw.map((event) => ({
    id: event.id as string,
    walletAddress: event.walletAddress as string,
    deviceId: event.deviceId as string,
    timestamp: event.timestamp.toISOString(),
    cumulativeKwh: Number(event.cumulativeKwh),
    irradianceWm2: Number(event.irradianceWm2),
    verified: Boolean(event.verified),
    reason: String(event.reason),
    deltaKwh: Number(event.deltaKwh),
    verifiedDeltaKwh: Number(event.verifiedDeltaKwh),
  }));

  return {
    walletAddress: normalizedWallet,
    connectedDevices,
    rawKwh: round(aggregate.rawKwh, 3),
    verifiedKwh: round(aggregate.verifiedKwh, 3),
    avoidedCo2Tonnes: round(
      aggregate.verifiedKwh * EMISSION_FACTOR_TONNES_PER_KWH,
      4
    ),
    mintedCertCount,
    eligibleCertCount: mintSync.eligibleCertCount,
    pendingMintJobs: mintProgress.pendingJobCount,
    kwhToNextMint,
    mintReady: remainderKwh === 0 && aggregate.verifiedKwh > 0,
    verificationRate: round(verificationRate, 1),
    recentEvents,
    recentMints,
  };
}
