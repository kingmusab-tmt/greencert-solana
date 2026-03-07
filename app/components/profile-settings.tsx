"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { UserRound } from "lucide-react";

type ProfilePayload = {
  profile: {
    profileName: string;
    profilePhone: string;
    profileCompany: string;
    profileCountry: string;
    profileRole: string;
    profileWebsite: string;
    profileBio: string;
  };
  details: {
    userId: string;
    googleEmail: string | null;
    walletAddress: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

type ProfileFormState = ProfilePayload["profile"];

const DEFAULT_FORM: ProfileFormState = {
  profileName: "",
  profilePhone: "",
  profileCompany: "",
  profileCountry: "",
  profileRole: "",
  profileWebsite: "",
  profileBio: "",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }
  return date.toLocaleString();
}

export function ProfileSettings() {
  const { status, update } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [details, setDetails] = useState<ProfilePayload["details"] | null>(
    null
  );
  const [form, setForm] = useState<ProfileFormState>(DEFAULT_FORM);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      const payload = (await response.json()) as
        | { error: string }
        | ProfilePayload;

      if (!response.ok || "error" in payload) {
        throw new Error(
          "error" in payload ? payload.error : "Failed to load profile"
        );
      }

      setDetails(payload.details);
      setForm(payload.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load profile");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      loadProfile();
    }
  }, [status, loadProfile]);

  const canSave = useMemo(() => !isSaving && !isLoading, [isSaving, isLoading]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });

        const payload = (await response.json()) as
          | { error: string }
          | ProfilePayload;

        if (!response.ok || "error" in payload) {
          throw new Error(
            "error" in payload ? payload.error : "Failed to save profile"
          );
        }

        setDetails(payload.details);
        setForm(payload.profile);
        setSuccess("Profile updated successfully.");
        await update();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save profile");
      } finally {
        setIsSaving(false);
      }
    },
    [form, update]
  );

  if (status === "loading" || isLoading) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <p className="text-sm text-foreground-secondary">Loading profile...</p>
      </section>
    );
  }

  if (status !== "authenticated") {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <p className="text-sm text-foreground-secondary">
          Sign in to view and edit your profile.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
        Profile
      </p>
      <h2 className="mt-2 inline-flex items-center gap-2 text-xl font-semibold text-foreground">
        <UserRound className="h-5 w-5" />
        Profile Details
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={form.profileName}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, profileName: event.target.value }))
            }
            placeholder="Full Name"
            className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
          />
          <input
            value={form.profilePhone}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, profilePhone: event.target.value }))
            }
            placeholder="Phone"
            className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
          />
          <input
            value={form.profileCompany}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                profileCompany: event.target.value,
              }))
            }
            placeholder="Company"
            className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
          />
          <input
            value={form.profileRole}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, profileRole: event.target.value }))
            }
            placeholder="Role"
            className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
          />
          <input
            value={form.profileCountry}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                profileCountry: event.target.value,
              }))
            }
            placeholder="Country"
            className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
          />
          <input
            value={form.profileWebsite}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                profileWebsite: event.target.value,
              }))
            }
            placeholder="Website"
            className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
          />
        </div>

        <textarea
          value={form.profileBio}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, profileBio: event.target.value }))
          }
          placeholder="Bio"
          rows={5}
          className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
        />

        <button
          type="submit"
          disabled={!canSave}
          className="inline-flex w-fit items-center rounded-lg gradient-bg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      {success && (
        <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {success}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
          Stored Account Details
        </p>
        <div className="mt-3 grid gap-2 text-sm text-foreground-secondary">
          <p>
            <span className="text-foreground-tertiary">User ID:</span>{" "}
            {details?.userId ?? "-"}
          </p>
          <p>
            <span className="text-foreground-tertiary">Google:</span>{" "}
            {details?.googleEmail ?? "Not linked"}
          </p>
          <p>
            <span className="text-foreground-tertiary">Wallet:</span>{" "}
            {details?.walletAddress ?? "Not linked"}
          </p>
          <p>
            <span className="text-foreground-tertiary">Created:</span>{" "}
            {details?.createdAt ? formatDate(details.createdAt) : "-"}
          </p>
          <p>
            <span className="text-foreground-tertiary">Last Updated:</span>{" "}
            {details?.updatedAt ? formatDate(details.updatedAt) : "-"}
          </p>
        </div>
      </div>
    </section>
  );
}
