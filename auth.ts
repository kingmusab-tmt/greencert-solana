import NextAuth, { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { getMongoDb } from "@/app/lib/mongodb";
import { parseSolanaSignInMessage } from "@/app/lib/solana-auth";
import {
  getAuthUserById,
  getOrCreateAuthUserForGoogle,
  getOrCreateAuthUserForWallet,
} from "@/app/lib/auth-users";

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;

const googleProvider =
  googleClientId && googleClientSecret
    ? [
        Google({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        }),
      ]
    : [];

function parseEmailList(raw: string | undefined): Set<string> {
  return new Set(
    String(raw ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

const adminEmails = parseEmailList(process.env.AUTH_ADMIN_EMAILS);
const managerEmails = parseEmailList(process.env.AUTH_MANAGER_EMAILS);

function resolveUserRole(googleEmail?: string): "member" | "manager" | "admin" {
  const normalizedEmail = String(googleEmail ?? "")
    .trim()
    .toLowerCase();
  if (normalizedEmail && adminEmails.has(normalizedEmail)) {
    return "admin";
  }
  if (normalizedEmail && managerEmails.has(normalizedEmail)) {
    return "manager";
  }
  return "member";
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    ...googleProvider,
    Credentials({
      id: "solana-wallet",
      name: "Solana Wallet",
      credentials: {
        walletAddress: { label: "Wallet Address", type: "text" },
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        const walletAddress = String(credentials?.walletAddress ?? "").trim();
        const message = String(credentials?.message ?? "");
        const signatureBase64 = String(credentials?.signature ?? "");

        if (
          walletAddress.length < 32 ||
          message.length === 0 ||
          signatureBase64.length === 0
        ) {
          return null;
        }

        const parsedMessage = parseSolanaSignInMessage(message);
        if (!parsedMessage || parsedMessage.walletAddress !== walletAddress) {
          return null;
        }

        const db = await getMongoDb();
        const nonces = db.collection("authNonces");

        const nonceRecord = await nonces.findOne({
          nonce: parsedMessage.nonce,
          walletAddress,
          used: false,
          expiresAt: { $gt: new Date() },
        });

        if (!nonceRecord || nonceRecord.message !== message) {
          return null;
        }

        let isValid = false;
        try {
          const publicKey = bs58.decode(walletAddress);
          const signature = Buffer.from(signatureBase64, "base64");
          const messageBytes = new TextEncoder().encode(message);

          isValid = nacl.sign.detached.verify(
            messageBytes,
            signature,
            publicKey
          );
        } catch {
          isValid = false;
        }

        if (!isValid) {
          return null;
        }

        const nonceConsumeResult = await nonces.updateOne(
          {
            nonce: parsedMessage.nonce,
            walletAddress,
            used: false,
          },
          {
            $set: {
              used: true,
              usedAt: new Date(),
            },
          }
        );

        if (nonceConsumeResult.modifiedCount !== 1) {
          return null;
        }

        const appUser = await getOrCreateAuthUserForWallet(walletAddress);

        return {
          id: appUser._id,
          name: appUser.googleName ?? "Solana Wallet User",
          email: appUser.googleEmail,
          image: appUser.googleImage,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      const googleSub =
        typeof profile?.sub === "string" ? profile.sub : undefined;

      if (!googleSub) {
        return false;
      }

      const appUser = await getOrCreateAuthUserForGoogle({
        sub: googleSub,
        email: user.email,
        name: user.name,
        image: user.image,
      });

      user.id = appUser._id;
      user.email = appUser.googleEmail ?? user.email;
      user.name = appUser.googleName ?? user.name;
      user.image = appUser.googleImage ?? user.image;

      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.appUserId = user.id;
      }

      if (account?.provider) {
        token.authProvider = account.provider;
      }

      const appUserId =
        typeof token.appUserId === "string" ? token.appUserId : undefined;

      if (appUserId) {
        const authUser = await getAuthUserById(appUserId);
        if (authUser) {
          token.linkedWalletAddress = authUser.walletAddress;
          token.linkedGoogleEmail = authUser.googleEmail;
          token.userRole = resolveUserRole(authUser.googleEmail);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        return session;
      }

      session.user.id =
        typeof token.appUserId === "string"
          ? token.appUserId
          : typeof token.sub === "string"
            ? token.sub
            : "";

      session.user.role =
        typeof token.userRole === "string" ? token.userRole : "member";

      session.user.authProvider =
        typeof token.authProvider === "string" ? token.authProvider : "unknown";

      session.user.linkedWalletAddress =
        typeof token.linkedWalletAddress === "string"
          ? token.linkedWalletAddress
          : undefined;

      session.user.linkedGoogleEmail =
        typeof token.linkedGoogleEmail === "string"
          ? token.linkedGoogleEmail
          : undefined;

      if (!session.user.email && session.user.linkedGoogleEmail) {
        session.user.email = session.user.linkedGoogleEmail;
      }

      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
};

const nextAuthHandler = NextAuth(authOptions);

export const handlers = {
  GET: nextAuthHandler,
  POST: nextAuthHandler,
};

export function auth() {
  return getServerSession(authOptions);
}
