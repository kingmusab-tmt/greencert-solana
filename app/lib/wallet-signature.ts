type WalletSignMessageFeature = {
  signMessage: (...args: unknown[]) => Promise<unknown>;
};

type WalletLike = {
  account?: unknown;
  features?: Record<string, unknown>;
  signMessage?: (...args: unknown[]) => Promise<unknown>;
};

function toBytesFromString(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function pickSignatureBytes(result: unknown): Uint8Array | null {
  if (result instanceof Uint8Array) {
    return result;
  }

  if (Array.isArray(result)) {
    if (result.length === 0) {
      return null;
    }

    const first = result[0] as { signature?: unknown };

    if (first?.signature instanceof Uint8Array) {
      return first.signature;
    }

    if (Array.isArray(first?.signature)) {
      return new Uint8Array(first.signature as number[]);
    }

    if (typeof first?.signature === "string") {
      try {
        return toBytesFromString(first.signature);
      } catch {
        return null;
      }
    }

    return null;
  }

  const single = result as { signature?: unknown };

  if (single?.signature instanceof Uint8Array) {
    return single.signature;
  }

  if (Array.isArray(single?.signature)) {
    return new Uint8Array(single.signature as number[]);
  }

  if (typeof single?.signature === "string") {
    try {
      return toBytesFromString(single.signature);
    } catch {
      return null;
    }
  }

  return null;
}

export async function signWalletMessage(
  wallet: unknown,
  messageBytes: Uint8Array
): Promise<Uint8Array> {
  const walletLike = (wallet ?? null) as WalletLike | null;
  const signFeature = walletLike?.features?.["solana:signMessage"] as
    | WalletSignMessageFeature
    | undefined;

  const attempts: Array<() => Promise<unknown>> = [];

  if (signFeature?.signMessage) {
    attempts.push(() =>
      signFeature.signMessage({
        account: walletLike?.account,
        message: messageBytes,
      })
    );

    // Some wallet implementations accept raw bytes directly.
    attempts.push(() => signFeature.signMessage(messageBytes));
  }

  if (typeof walletLike?.signMessage === "function") {
    attempts.push(() => walletLike.signMessage!(messageBytes));
    attempts.push(() =>
      walletLike.signMessage!({
        account: walletLike.account,
        message: messageBytes,
      })
    );
  }

  if (attempts.length === 0) {
    throw new Error(
      "Connected wallet does not support message signing in this browser."
    );
  }

  for (const attempt of attempts) {
    try {
      const signedResult = await attempt();
      const signatureBytes = pickSignatureBytes(signedResult);

      if (signatureBytes && signatureBytes.length > 0) {
        return signatureBytes;
      }
    } catch {
      // Try the next compatible signing method.
    }
  }

  throw new Error(
    "Wallet is connected but message signing failed. Try Phantom or Solflare."
  );
}
