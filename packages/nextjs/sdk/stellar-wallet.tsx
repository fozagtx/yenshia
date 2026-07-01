import { createContext, useCallback, useContext, useMemo, useState } from "react";

type FreighterRuntime = typeof import("@stellar/freighter-api");

type FreighterResponse = {
  error?: {
    message?: string;
  };
};

type StellarWalletContextValue = {
  address: string | undefined;
  error: string | undefined;
  isConnecting: boolean;
  isConnected: boolean;
  connect: () => Promise<string>;
  disconnect: () => Promise<void>;
  showProfile: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  signTransaction: (xdr: string, networkPassphrase: string) => Promise<string>;
};

const TESTNET_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const WALLET_ADDRESS_STORAGE_KEY = "yenshia.stellar.address";

const StellarWalletContext = createContext<StellarWalletContextValue | null>(null);

let freighterRuntimePromise: Promise<FreighterRuntime> | null = null;

const loadFreighterRuntime = async () => {
  if (!freighterRuntimePromise) {
    freighterRuntimePromise = import("@stellar/freighter-api");
  }

  return freighterRuntimePromise;
};

const freighterErrorMessage = (response: FreighterResponse, defaultMessage: string) =>
  response.error?.message || defaultMessage;

const requireFreighterSuccess = (response: FreighterResponse, defaultMessage: string) => {
  if (response.error) {
    throw new Error(freighterErrorMessage(response, defaultMessage));
  }
};

const signedMessageToString = (signedMessage: string | Buffer | null) => {
  if (!signedMessage) {
    throw new Error("Freighter did not return a signed message.");
  }

  return typeof signedMessage === "string" ? signedMessage : signedMessage.toString("hex");
};

const readStoredAddress = () => {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage.getItem(WALLET_ADDRESS_STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
};

const storeAddress = (nextAddress: string | undefined) => {
  if (typeof window === "undefined") return;

  try {
    if (nextAddress) {
      window.localStorage.setItem(WALLET_ADDRESS_STORAGE_KEY, nextAddress);
    } else {
      window.localStorage.removeItem(WALLET_ADDRESS_STORAGE_KEY);
    }
  } catch {
    // Browser storage can be unavailable in private contexts. Wallet signing still remains the source of truth.
  }
};

export const StellarWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [address, setAddress] = useState<string | undefined>(() => readStoredAddress());
  const [error, setError] = useState<string | undefined>();
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(undefined);

    try {
      const freighter = await loadFreighterRuntime();
      const connection = await freighter.isConnected();
      requireFreighterSuccess(connection, "Freighter is not available.");

      if (!connection.isConnected) {
        throw new Error("Install or unlock Freighter to connect a Stellar wallet.");
      }

      const access = await freighter.requestAccess();
      requireFreighterSuccess(access, "Freighter did not grant wallet access.");

      if (!access.address) {
        throw new Error("Freighter did not return a Stellar address.");
      }

      storeAddress(access.address);
      setAddress(access.address);
      return access.address;
    } catch (event) {
      const message = event instanceof Error ? event.message : "Wallet connection was cancelled or unavailable.";
      setError(message);
      throw event;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setError(undefined);
    storeAddress(undefined);
    setAddress(undefined);
  }, []);

  const showProfile = useCallback(async () => {
    setError(undefined);

    try {
      const freighter = await loadFreighterRuntime();
      const currentAddress = await freighter.getAddress();
      requireFreighterSuccess(currentAddress, "Freighter address refresh failed.");
      const refreshedAddress = currentAddress.address || undefined;
      storeAddress(refreshedAddress);
      setAddress(refreshedAddress);
    } catch (event) {
      const message = event instanceof Error ? event.message : "Freighter address refresh failed.";
      setError(message);
    }
  }, []);

  const signMessage = useCallback(
    async (message: string) => {
      if (!address) {
        throw new Error("Connect a Stellar wallet before signing.");
      }

      const freighter = await loadFreighterRuntime();
      const response = await freighter.signMessage(message, {
        address,
        networkPassphrase: TESTNET_NETWORK_PASSPHRASE,
      });
      requireFreighterSuccess(response, "Freighter did not sign the message.");

      return signedMessageToString(response.signedMessage);
    },
    [address],
  );

  const signTransaction = useCallback(
    async (xdr: string, networkPassphrase: string) => {
      if (!address) {
        throw new Error("Connect a Stellar wallet before signing.");
      }

      const freighter = await loadFreighterRuntime();
      const response = await freighter.signTransaction(xdr, {
        address,
        networkPassphrase,
      });
      requireFreighterSuccess(response, "Freighter did not sign the transaction.");

      if (!response.signedTxXdr) {
        throw new Error("Freighter did not return a signed transaction.");
      }

      return response.signedTxXdr;
    },
    [address],
  );

  const value = useMemo(
    () => ({
      address,
      error,
      isConnecting,
      isConnected: !!address,
      connect,
      disconnect,
      showProfile,
      signMessage,
      signTransaction,
    }),
    [address, connect, disconnect, error, isConnecting, showProfile, signMessage, signTransaction],
  );

  return <StellarWalletContext.Provider value={value}>{children}</StellarWalletContext.Provider>;
};

export const useStellarWallet = () => {
  const context = useContext(StellarWalletContext);
  if (!context) {
    throw new Error("useStellarWallet must be used within StellarWalletProvider");
  }
  return context;
};
