import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useMutation } from "@tanstack/react-query";
import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";
import { Button } from "~~/components/ui/Button";
import { useHasMounted } from "~~/hooks/useHasMounted";
import { useDerivedAccount } from "~~/sdk/crypto";
import { useReceiveLocation } from "~~/sdk/hooks/useReceiveLocation";
import { useSendLocation } from "~~/sdk/hooks/useSendLocation";
import { useStellarWallet } from "~~/sdk/stellar-wallet";

const Map = dynamic(() => import("../../components/my-map/my-map"), {
  ssr: false,
});

type PrepareProofApiResponse =
  | {
      success: true;
      contractId: string;
      networkPassphrase: string;
      unsignedTransactionXdr: string;
    }
  | {
      success: false;
      error: string;
    };

type SubmitProofApiResponse = {
  success: boolean;
  hash?: string;
  submitStatus?: string;
  finalStatus?: string;
  latestLedger?: number;
  ledger?: number;
  resultXdr?: string;
  returnValueXdr?: string;
  error?: string;
};

const finishErrorMessage = (message: string) => {
  if (
    message.includes("YENSHIA_") ||
    message.includes("publicInputsBase64") ||
    message.includes("proofBytesBase64") ||
    message.includes("real Noir proof")
  ) {
    return "Finish is not ready yet.";
  }

  if (message.includes("STELLAR_") || message.includes("verifier contract")) {
    return "Finish is not ready yet.";
  }

  if (message.includes("transaction") || message.includes("XDR") || message.includes("Soroban")) {
    return "Could not finish.";
  }

  return message;
};

const locationErrorMessage = (message: string) => {
  if (message.toLowerCase().includes("relay")) {
    return "Still connecting. Keep this page open.";
  }

  return message;
};

const ShareLocationPage: NextPage = () => {
  const router = useRouter();
  const routePublicKey = router.query.publicKey?.toString();
  const publicKey =
    routePublicKey && /^0x04[0-9a-fA-F]{128}$/.test(routePublicKey) ? (routePublicKey as `0x${string}`) : undefined;

  const hasMounted = useHasMounted();
  const { address, signTransaction } = useStellarWallet();
  const { derivationError, derivedAccount, derivedAccountReady, deriveAccount, derivingAccount } = useDerivedAccount();
  const [locationRequested, setLocationRequested] = useState(false);
  const shareFromInvite = router.query.share === "1";
  const [proofResult, setProofResult] = useState<SubmitProofApiResponse | null>(null);
  const sharePageReady = !!address && !!publicKey;
  const privateSharingReady = sharePageReady && derivedAccountReady;
  const isLinkOwner =
    !!publicKey && !!derivedAccount && publicKey.toLowerCase() === derivedAccount.publicKey.toLowerCase();

  const {
    coords: otherCoords,
    location: peerLocation,
    receiveError,
    relayError: receiveRelayError,
  } = useReceiveLocation({
    enabled: privateSharingReady,
    expectedSenderPublicKey: isLinkOwner ? undefined : publicKey,
    linkPublicKey: privateSharingReady ? publicKey : undefined,
  });
  const recipientPublicKey = privateSharingReady
    ? isLinkOwner
      ? peerLocation?.senderPublicKey
      : publicKey
    : undefined;
  const canSendToPeer =
    !!recipientPublicKey &&
    !!derivedAccount &&
    recipientPublicKey.toLowerCase() !== derivedAccount.publicKey.toLowerCase();
  const {
    coords,
    isGeolocationAvailable,
    isGeolocationEnabled,
    relayError: sendRelayError,
    sendError,
  } = useSendLocation({
    enabled: locationRequested,
    linkPublicKey: publicKey,
    recipientPublicKey: canSendToPeer ? recipientPublicKey : undefined,
  });

  const {
    mutateAsync: finishSharing,
    error: finishError,
    isLoading: isFinishing,
  } = useMutation<SubmitProofApiResponse, Error, string>({
    mutationFn: async walletAddress => {
      const prepareResponse = await fetch("/api/stellar/prepare-proof", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceAddress: walletAddress,
        }),
      });

      const prepared = (await prepareResponse.json()) as PrepareProofApiResponse;
      if (!prepareResponse.ok) {
        throw new Error(prepared.success ? "Could not finish." : prepared.error);
      }

      if (!prepared.success) {
        throw new Error(prepared.error || "Could not finish.");
      }

      const signedTransactionXdr = await signTransaction(prepared.unsignedTransactionXdr, prepared.networkPassphrase);
      const response = await fetch("/api/stellar/submit-proof", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signedTransactionXdr,
        }),
      });

      const payload = (await response.json()) as SubmitProofApiResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Could not finish.");
      }

      return payload;
    },
  });

  const onFinishSharing = async () => {
    setProofResult(null);

    try {
      if (!address) {
        throw new Error("Connect your wallet before continuing.");
      }

      const result = await finishSharing(address);
      setProofResult(result);
    } catch {
      setProofResult(null);
    }
  };

  const onStartPrivateSharing = () => {
    void deriveAccount().catch(() => undefined);
  };

  useEffect(() => {
    if (hasMounted && router.isReady && publicKey && !address) {
      void router.replace(`/?next=${encodeURIComponent(router.asPath)}`);
    }
  }, [address, hasMounted, publicKey, router]);

  useEffect(() => {
    if (router.isReady && shareFromInvite) {
      setLocationRequested(true);
    }
  }, [router.isReady, shareFromInvite]);

  if (!hasMounted) {
    return null;
  }

  if (!publicKey) {
    return (
      <>
        <MetaHeader title="Yenshia | Invalid Invite" />
        <section className="soft-panel mx-auto max-w-2xl space-y-4 p-5 text-center sm:p-6">
          <p className="status-pill mx-auto">Invalid link</p>
          <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">This link is not valid.</h1>
          <p className="muted-copy leading-7">Ask for a fresh Yenshia link before sharing location.</p>
        </section>
      </>
    );
  }

  if (!address) {
    return (
      <>
        <MetaHeader title="Yenshia | Start" />
        <section className="soft-panel mx-auto max-w-2xl space-y-4 p-5 text-center sm:p-6">
          <p className="status-pill mx-auto">Connect wallet</p>
          <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">Start from Yenshia home.</h1>
        </section>
      </>
    );
  }

  const locationError = sendError || receiveError || sendRelayError || receiveRelayError;
  const hasOwnLocation = !!coords;
  const hasPeerLocation = !!otherCoords && canSendToPeer;
  const hasLocationPair = hasOwnLocation && hasPeerLocation;
  const mapPosition2 = hasPeerLocation
    ? ([otherCoords.latitude, otherCoords.longitude] as [number, number])
    : undefined;
  const shareMessage = !locationRequested
    ? "Choose when to share your location."
    : locationError
    ? locationErrorMessage(locationError.message)
    : !isGeolocationAvailable
    ? "Location is not available in this browser."
    : !isGeolocationEnabled
    ? "Turn on location access."
    : hasLocationPair
    ? "Both people are sharing location."
    : hasOwnLocation
    ? derivedAccountReady
      ? "Your location is shared. Waiting for the other person."
      : "Location is on."
    : "Waiting for your location.";
  const bottomMessage = proofResult?.success ? "Done." : shareMessage;

  return (
    <>
      <MetaHeader title="Yenshia | Share Location" />

      <section className="relative min-h-[calc(100dvh-8.5rem)] overflow-hidden rounded-[1.75rem] bg-[var(--blue-pale)] shadow-[var(--shadow-card)]">
        {hasOwnLocation ? (
          <Map position1={[coords.latitude, coords.longitude]} position2={mapPosition2} />
        ) : (
          <div className="grid min-h-[calc(100dvh-8.5rem)] place-items-center px-5 pb-28 pt-10 text-center sm:min-h-[34rem]">
            <div className="max-w-sm space-y-4">
              <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">
                {locationRequested ? "Waiting for location" : "Share location"}
              </h1>
              <p className={locationError ? "leading-7 text-[var(--error-red)]" : "muted-copy leading-7"}>
                {shareMessage}
              </p>
              {!locationRequested && (
                <Button className="mx-auto whitespace-nowrap" type="button" onClick={() => setLocationRequested(true)}>
                  Share location
                </Button>
              )}
            </div>
          </div>
        )}

        {hasOwnLocation && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4">
            <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl bg-white/95 p-3 shadow-[var(--shadow-search)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <p
                className={
                  locationError
                    ? "text-sm font-semibold text-[var(--error-red)]"
                    : "text-sm font-semibold text-[var(--navy)]"
                }
              >
                {bottomMessage}
              </p>
              {!derivedAccountReady ? (
                <Button
                  className="self-start whitespace-nowrap sm:self-auto"
                  type="button"
                  disabled={derivingAccount}
                  loading={derivingAccount}
                  onClick={onStartPrivateSharing}
                >
                  Share privately
                </Button>
              ) : (
                hasLocationPair &&
                !proofResult?.success && (
                  <Button
                    className="self-start whitespace-nowrap sm:self-auto"
                    type="button"
                    disabled={isFinishing}
                    loading={isFinishing}
                    onClick={onFinishSharing}
                  >
                    Done
                  </Button>
                )
              )}
            </div>
          </div>
        )}
      </section>

      {(derivationError || finishError || proofResult?.error) && (
        <p className="mt-3 break-words text-sm text-[var(--error-red)]">
          {derivationError?.message || finishErrorMessage((finishError || new Error(proofResult?.error)).message)}
        </p>
      )}
    </>
  );
};

export default ShareLocationPage;
