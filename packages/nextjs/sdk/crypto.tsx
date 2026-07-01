import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { useStellarWallet } from "~~/sdk/stellar-wallet";

type Hex = `0x${string}`;

const DERIVATION_MESSAGE =
  "Yenshia Stellar wallet encryption key derivation. Sign only inside Yenshia private location sessions.";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");

const hexToBytes = (hex: string) => {
  const cleanHex = hex.replace(/^0x/, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex value.");
  }

  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = parseInt(cleanHex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
};

const concatBytes = (...chunks: Uint8Array[]) => {
  const totalLength = chunks.reduce((length, chunk) => length + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach(chunk => {
    result.set(chunk, offset);
    offset += chunk.length;
  });

  return result;
};

const toArrayBuffer = (bytes: Uint8Array) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

const derivePrivateKeyBytes = (seed: string) => {
  let candidate = sha256(textEncoder.encode(seed));
  let counter = 0;

  while (!secp256k1.utils.isValidPrivateKey(candidate)) {
    candidate = sha256(concatBytes(textEncoder.encode(seed), new Uint8Array([counter])));
    counter += 1;
  }

  return candidate;
};

const importAesKey = async (sharedSecret: Uint8Array, keyUsage: KeyUsage[]) => {
  const keyBytes = sha256(sharedSecret);
  return crypto.subtle.importKey("raw", toArrayBuffer(keyBytes), { name: "AES-GCM" }, false, keyUsage);
};

const generateDerivedAccount = async (walletAddress: string, signMessage: (message: string) => Promise<string>) => {
  const signedMessage = await signMessage(DERIVATION_MESSAGE);
  const privateKeyBytes = derivePrivateKeyBytes(`${walletAddress}:${signedMessage}:${DERIVATION_MESSAGE}`);
  const publicKeyBytes = secp256k1.getPublicKey(privateKeyBytes, false);

  return {
    privateKey: `0x${bytesToHex(privateKeyBytes)}` as Hex,
    publicKey: `0x${bytesToHex(publicKeyBytes)}` as Hex,
    walletAddress,
  };
};

type DerivedAccount = {
  privateKey: Hex;
  publicKey: Hex;
  walletAddress: string;
};

interface DerivedAccountContextType {
  derivedAccount: DerivedAccount | undefined;
  derivedAccountReady: boolean;
  derivingAccount: boolean;
  derivationError: Error | null;
  deriveAccount: () => Promise<DerivedAccount>;
}

const DerivedAccountContext = createContext<DerivedAccountContextType | null>(null);

const derivedAccountsCache = new Map<string, DerivedAccount>();

export const DerivedAccountProvider = ({ children }: { children: React.ReactNode }) => {
  const { address, signMessage } = useStellarWallet();
  const [derivedAccount, setDerivedAccount] = useState<DerivedAccount | undefined>();
  const [derivationError, setDerivationError] = useState<Error | null>(null);
  const [derivingAccount, setDerivingAccount] = useState(false);

  useEffect(() => {
    setDerivationError(null);
    setDerivedAccount(address && derivedAccountsCache.has(address) ? derivedAccountsCache.get(address) : undefined);
  }, [address]);

  const deriveAccount = useCallback(async () => {
    if (!address) throw new Error("Stellar wallet is not connected.");

    const cachedAccount = derivedAccountsCache.get(address);
    if (cachedAccount) {
      setDerivedAccount(cachedAccount);
      return cachedAccount;
    }

    setDerivingAccount(true);
    setDerivationError(null);

    try {
      const nextDerivedAccount = await generateDerivedAccount(address, signMessage);
      derivedAccountsCache.set(address, nextDerivedAccount);
      setDerivedAccount(nextDerivedAccount);
      return nextDerivedAccount;
    } catch (error) {
      const nextError = error instanceof Error ? error : new Error("Wallet signature failed.");
      setDerivationError(nextError);
      throw nextError;
    } finally {
      setDerivingAccount(false);
    }
  }, [address, signMessage]);

  const value = {
    derivedAccount,
    derivedAccountReady: !!derivedAccount,
    derivingAccount,
    derivationError,
    deriveAccount,
  };

  return <DerivedAccountContext.Provider value={value}>{children}</DerivedAccountContext.Provider>;
};

export const useDerivedAccount = () => {
  const derivedAccount = useContext(DerivedAccountContext);
  if (!derivedAccount) {
    throw new Error("useDerivedAccount must be used within a DerivedAccountProvider");
  }
  return derivedAccount;
};

export const useDerivedAccountEncryption = () => {
  const { derivedAccount } = useDerivedAccount();

  const decryptMessage = async (encryptedMessage: EncryptedMessage) => {
    if (!derivedAccount) throw new Error("Derived account not initialized");
    const sharedSecret = secp256k1.getSharedSecret(
      hexToBytes(derivedAccount.privateKey),
      hexToBytes(encryptedMessage.ephemeralPublicKey),
      false,
    );
    const aesKey = await importAesKey(sharedSecret, ["decrypt"]);
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(hexToBytes(encryptedMessage.iv)),
      },
      aesKey,
      toArrayBuffer(hexToBytes(encryptedMessage.ciphertext)),
    );

    return textDecoder.decode(decrypted);
  };

  return { decryptMessage, derivedAccountReady: !!derivedAccount };
};

export type EncryptedMessage = {
  version: "yenshia-ecies-v1";
  ephemeralPublicKey: Hex;
  iv: Hex;
  ciphertext: Hex;
};

export const generateEncryptionClient = (publicKey: `0x${string}`) => {
  const encryptMessage = async (message: string) => {
    const recipientPublicKey = hexToBytes(publicKey);
    const ephemeralPrivateKey = secp256k1.utils.randomPrivateKey();
    const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey, false);
    const sharedSecret = secp256k1.getSharedSecret(ephemeralPrivateKey, recipientPublicKey, false);
    const aesKey = await importAesKey(sharedSecret, ["encrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      aesKey,
      toArrayBuffer(textEncoder.encode(message)),
    );

    return {
      version: "yenshia-ecies-v1",
      ephemeralPublicKey: `0x${bytesToHex(ephemeralPublicKey)}` as Hex,
      iv: `0x${bytesToHex(iv)}` as Hex,
      ciphertext: `0x${bytesToHex(new Uint8Array(ciphertext))}` as Hex,
    } satisfies EncryptedMessage;
  };

  return { encryptMessage };
};
