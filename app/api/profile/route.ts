import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAuthUserById, updateAuthUserProfile } from "@/app/lib/auth-users";

export const runtime = "nodejs";

type ProfileFormPayload = {
  profileName?: unknown;
  profilePhone?: unknown;
  profileCompany?: unknown;
  profileCountry?: unknown;
  profileRole?: unknown;
  profileWebsite?: unknown;
  profileBio?: unknown;
};

function sanitizeText(input: unknown, maxLength: number): string {
  const value = String(input ?? "").trim();
  if (!value) {
    return "";
  }
  return value.slice(0, maxLength);
}

function toProfileResponse(
  user: NonNullable<Awaited<ReturnType<typeof getAuthUserById>>>
) {
  return {
    profile: {
      profileName: user.profileName ?? user.googleName ?? "",
      profilePhone: user.profilePhone ?? "",
      profileCompany: user.profileCompany ?? "",
      profileCountry: user.profileCountry ?? "",
      profileRole: user.profileRole ?? "",
      profileWebsite: user.profileWebsite ?? "",
      profileBio: user.profileBio ?? "",
    },
    details: {
      userId: user._id,
      googleEmail: user.googleEmail ?? null,
      walletAddress: user.walletAddress ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
  };
}

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getAuthUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(toProfileResponse(user));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: ProfileFormPayload;
    try {
      body = (await request.json()) as ProfileFormPayload;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const result = await updateAuthUserProfile(userId, {
      profileName: sanitizeText(body.profileName, 100),
      profilePhone: sanitizeText(body.profilePhone, 40),
      profileCompany: sanitizeText(body.profileCompany, 120),
      profileCountry: sanitizeText(body.profileCountry, 80),
      profileRole: sanitizeText(body.profileRole, 80),
      profileWebsite: sanitizeText(body.profileWebsite, 200),
      profileBio: sanitizeText(body.profileBio, 1000),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    return NextResponse.json(toProfileResponse(result.user));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
