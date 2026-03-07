import { randomUUID } from "crypto";
import { getMongoDb } from "@/app/lib/mongodb";

export type AuthUserDoc = {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  googleSub?: string;
  googleEmail?: string;
  googleName?: string;
  googleImage?: string;
  walletAddress?: string;
  profileName?: string;
  profilePhone?: string;
  profileCompany?: string;
  profileCountry?: string;
  profileRole?: string;
  profileWebsite?: string;
  profileBio?: string;
};

export type AuthUserProfileInput = {
  profileName?: string;
  profilePhone?: string;
  profileCompany?: string;
  profileCountry?: string;
  profileRole?: string;
  profileWebsite?: string;
  profileBio?: string;
};

export type GoogleIdentity = {
  sub: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

let authUserIndexesInitPromise: Promise<void> | null = null;

async function getAuthUsersCollection() {
  const db = await getMongoDb();
  return db.collection<AuthUserDoc>("authUsers");
}

export async function ensureAuthUserIndexes() {
  if (!authUserIndexesInitPromise) {
    authUserIndexesInitPromise = (async () => {
      const users = await getAuthUsersCollection();
      await Promise.all([
        users.createIndex({ googleSub: 1 }, { unique: true, sparse: true }),
        users.createIndex({ walletAddress: 1 }, { unique: true, sparse: true }),
      ]);
    })();
  }

  await authUserIndexesInitPromise;
}

function normalizeEmail(email?: string | null): string | undefined {
  const value = String(email ?? "")
    .trim()
    .toLowerCase();
  return value.length > 0 ? value : undefined;
}

export async function getAuthUserById(
  userId: string
): Promise<AuthUserDoc | null> {
  await ensureAuthUserIndexes();
  const users = await getAuthUsersCollection();
  return users.findOne({ _id: userId });
}

export async function getOrCreateAuthUserForWallet(
  walletAddress: string
): Promise<AuthUserDoc> {
  await ensureAuthUserIndexes();

  const users = await getAuthUsersCollection();
  const existing = await users.findOne({ walletAddress });
  if (existing) {
    return existing;
  }

  const now = new Date();
  const created: AuthUserDoc = {
    _id: randomUUID(),
    walletAddress,
    createdAt: now,
    updatedAt: now,
  };

  await users.insertOne(created);
  return created;
}

export async function getOrCreateAuthUserForGoogle(
  identity: GoogleIdentity
): Promise<AuthUserDoc> {
  await ensureAuthUserIndexes();

  const users = await getAuthUsersCollection();
  const normalizedEmail = normalizeEmail(identity.email);

  const existingBySub = await users.findOne({ googleSub: identity.sub });
  if (existingBySub) {
    const patch: Partial<AuthUserDoc> = {
      updatedAt: new Date(),
    };

    if (normalizedEmail) {
      patch.googleEmail = normalizedEmail;
    }

    if (identity.name) {
      patch.googleName = identity.name;
    }

    if (identity.image) {
      patch.googleImage = identity.image;
    }

    await users.updateOne({ _id: existingBySub._id }, { $set: patch });
    return { ...existingBySub, ...patch };
  }

  const now = new Date();
  const created: AuthUserDoc = {
    _id: randomUUID(),
    googleSub: identity.sub,
    googleEmail: normalizedEmail,
    googleName: identity.name ?? undefined,
    googleImage: identity.image ?? undefined,
    createdAt: now,
    updatedAt: now,
  };

  await users.insertOne(created);
  return created;
}

export async function attachWalletToUser(
  userId: string,
  walletAddress: string,
  options?: { transferFromUserId?: string }
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await ensureAuthUserIndexes();

  const users = await getAuthUsersCollection();
  const target = await users.findOne({ _id: userId });
  if (!target) {
    return { ok: false, reason: "User record not found." };
  }

  const owner = await users.findOne({ walletAddress });

  if (owner && owner._id !== userId) {
    if (
      !options?.transferFromUserId ||
      owner._id !== options.transferFromUserId
    ) {
      return {
        ok: false,
        reason: "This wallet is already linked to another account.",
      };
    }

    await users.updateOne(
      { _id: owner._id },
      {
        $unset: { walletAddress: "" },
        $set: { updatedAt: new Date() },
      }
    );
  }

  await users.updateOne(
    { _id: userId },
    {
      $set: {
        walletAddress,
        updatedAt: new Date(),
      },
    }
  );

  return { ok: true };
}

export async function attachGoogleToUser(
  userId: string,
  identity: GoogleIdentity,
  options?: { transferFromUserId?: string }
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await ensureAuthUserIndexes();

  const users = await getAuthUsersCollection();
  const target = await users.findOne({ _id: userId });
  if (!target) {
    return { ok: false, reason: "User record not found." };
  }

  const owner = await users.findOne({ googleSub: identity.sub });
  if (owner && owner._id !== userId) {
    if (
      !options?.transferFromUserId ||
      owner._id !== options.transferFromUserId
    ) {
      return {
        ok: false,
        reason: "This Google account is already linked to another user.",
      };
    }

    await users.updateOne(
      { _id: owner._id },
      {
        $unset: {
          googleSub: "",
          googleEmail: "",
          googleName: "",
          googleImage: "",
        },
        $set: { updatedAt: new Date() },
      }
    );
  }

  const normalizedEmail = normalizeEmail(identity.email);

  await users.updateOne(
    { _id: userId },
    {
      $set: {
        googleSub: identity.sub,
        googleEmail: normalizedEmail,
        googleName: identity.name ?? undefined,
        googleImage: identity.image ?? undefined,
        updatedAt: new Date(),
      },
    }
  );

  return { ok: true };
}

export async function unlinkWalletFromUser(
  userId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await ensureAuthUserIndexes();

  const users = await getAuthUsersCollection();
  const target = await users.findOne({ _id: userId });

  if (!target) {
    return { ok: false, reason: "User record not found." };
  }

  if (!target.walletAddress) {
    return { ok: false, reason: "No wallet is linked to this account." };
  }

  if (!target.googleSub) {
    return {
      ok: false,
      reason: "Link Google first before unlinking your wallet.",
    };
  }

  await users.updateOne(
    { _id: userId },
    {
      $unset: { walletAddress: "" },
      $set: { updatedAt: new Date() },
    }
  );

  return { ok: true };
}

export async function unlinkGoogleFromUser(
  userId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await ensureAuthUserIndexes();

  const users = await getAuthUsersCollection();
  const target = await users.findOne({ _id: userId });

  if (!target) {
    return { ok: false, reason: "User record not found." };
  }

  if (!target.googleSub) {
    return { ok: false, reason: "No Google account is linked." };
  }

  if (!target.walletAddress) {
    return {
      ok: false,
      reason: "Link a wallet first before unlinking Google.",
    };
  }

  await users.updateOne(
    { _id: userId },
    {
      $unset: {
        googleSub: "",
        googleEmail: "",
        googleName: "",
        googleImage: "",
      },
      $set: { updatedAt: new Date() },
    }
  );

  return { ok: true };
}

export async function updateAuthUserProfile(
  userId: string,
  profile: AuthUserProfileInput
): Promise<{ ok: true; user: AuthUserDoc } | { ok: false; reason: string }> {
  await ensureAuthUserIndexes();

  const users = await getAuthUsersCollection();
  const target = await users.findOne({ _id: userId });

  if (!target) {
    return { ok: false, reason: "User record not found." };
  }

  const patch: Partial<AuthUserDoc> = {
    profileName: profile.profileName,
    profilePhone: profile.profilePhone,
    profileCompany: profile.profileCompany,
    profileCountry: profile.profileCountry,
    profileRole: profile.profileRole,
    profileWebsite: profile.profileWebsite,
    profileBio: profile.profileBio,
    updatedAt: new Date(),
  };

  await users.updateOne({ _id: userId }, { $set: patch });

  return {
    ok: true,
    user: {
      ...target,
      ...patch,
    },
  };
}
