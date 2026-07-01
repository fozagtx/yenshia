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

const locationErrorMessage = (message: string) => message;

const createParticipantId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  }

  throw new Error("Secure browser identity is not available.");
};

const ShareLocationPage: NextPage = () => {
  const router = useRouter();
  const routePublicKey = router.query.publicKey?.toString();
  const publicKey =
    routePublicKey && /^0x04[0-9a-fA-F]{128}$/.test(routePublicKey) ? (routePublicKey as `0x${string}`) : undefined;

  const hasMounted = useHasMounted();
  const { address, signTransaction } = useStellarWallet();
  const { derivationError, derivedAccount, derivedAccountReady, deriveAccount, derivingAccount } = useDerivedAccount();
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantIdentityError, setParticipantIdentityError] = useState<Error | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const joinFromInvite = router.query.join === "1" || router.query.share === "1";
  const startFromInvite = router.query.start === "1";
  const [proofResult, setProofResult] = useState<SubmitProofApiResponse | null>(null);
  const sharePageReady = !!address && !!publicKey && !!participantId && !participantIdentityError;
  const privateSharingReady = sharePageReady && derivedAccountReady;
  const isInviteParticipant = joinFromInvite;
  const isLinkOwner =
    !!publicKey &&
    !!derivedAccount &&
    !isInviteParticipant &&
    publicKey.toLowerCase() === derivedAccount.publicKey.toLowerCase();

  const {
    coords: otherCoords,
    location: peerLocation,
    receiveError,
  } = useReceiveLocation({
    enabled: privateSharingReady,
    expectedSenderPublicKey: isLinkOwner ? undefined : publicKey,
    linkPublicKey: privateSharingReady ? publicKey : undefined,
    ownParticipantId: participantId ?? undefined,
  });
  const recipientPublicKey = privateSharingReady
    ? isLinkOwner
      ? peerLocation?.senderPublicKey
      : publicKey
    : undefined;
  const peerParticipantId = peerLocation?.participantId;
  const canSendToPeer =
    !!recipientPublicKey &&
    !!derivedAccount &&
    (isInviteParticipant ||
      !!peerParticipantId ||
      recipientPublicKey.toLowerCase() !== derivedAccount.publicKey.toLowerCase());
  const {
    coords,
    isGeolocationAvailable,
    isGeolocationEnabled,
    lastSentAt,
    locationError: locationAccessError,
    relayError: sendRelayError,
    relayReady: sendRelayReady,
    relayStatus: sendRelayStatus,
    sendError,
  } = useSendLocation({
    enabled: locationRequested,
    linkPublicKey: publicKey,
    participantId: participantId ?? undefined,
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
    try {
      setParticipantId(createParticipantId());
      setParticipantIdentityError(null);
    } catch (error) {
      setParticipantId(null);
      setParticipantIdentityError(
        error instanceof Error ? error : new Error("Secure browser identity is not available."),
      );
    }
  }, []);

  useEffect(() => {
    if (hasMounted && router.isReady && publicKey && !address) {
      void router.replace(`/?next=${encodeURIComponent(router.asPath)}`);
    }
  }, [address, hasMounted, publicKey, router]);

  useEffect(() => {
    if (router.isReady && (joinFromInvite || startFromInvite)) {
      setLocationRequested(true);
    }
  }, [joinFromInvite, router.isReady, startFromInvite]);

  useEffect(() => {
    if (
      !address ||
      !locationRequested ||
      !coords ||
      !participantId ||
      derivedAccountReady ||
      derivingAccount ||
      derivationError
    ) {
      return;
    }

    void deriveAccount().catch(() => undefined);
  }, [
    address,
    coords,
    derivationError,
    deriveAccount,
    derivedAccountReady,
    derivingAccount,
    locationRequested,
    participantId,
  ]);

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

  const privateSharingError =
    !sendRelayReady && (sendRelayStatus === "error" || sendRelayError)
      ? new Error("Private sharing could not start. Refresh and try again.")
      : null;
  const locationError =
    locationAccessError ||
    sendError ||
    privateSharingError ||
    participantIdentityError ||
    derivationError ||
    receiveError;
  const hasOwnLocation = !!coords;
  const hasPeerLocation = !!otherCoords && canSendToPeer;
  const hasLocationPair = hasOwnLocation && hasPeerLocation;
  const hasPublishedLocation = !!lastSentAt && canSendToPeer;
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
    : hasOwnLocation && derivingAccount
    ? "Confirm in your wallet to share privately."
    : hasOwnLocation && !derivedAccountReady
    ? "Wallet confirmation is needed to share privately."
    : hasOwnLocation && !sendRelayReady
    ? "Connecting privately."
    : hasLocationPair && hasPublishedLocation
    ? "Both people are sharing location."
    : hasPublishedLocation
    ? "Your location is shared. Waiting for the other person."
    : hasOwnLocation && !canSendToPeer && isLinkOwner
    ? "Your location is on this phone. Waiting for the other person."
    : hasOwnLocation && !canSendToPeer
    ? "Waiting for the other person."
    : hasOwnLocation
    ? "Sending your location privately."
    : "Waiting for your location.";
  const bottomMessage = proofResult?.success ? "Done." : shareMessage;
  const privateStatusText = locationError
    ? "Needs attention"
    : hasPublishedLocation
    ? "Sent privately"
    : hasOwnLocation && derivingAccount
    ? "Confirm wallet"
    : hasOwnLocation && !derivedAccountReady
    ? "Wallet needed"
    : hasOwnLocation && !sendRelayReady
    ? sendRelayStatus === "loading"
      ? "Connecting"
      : "Connection blocked"
    : hasOwnLocation && !canSendToPeer
    ? "Waiting for peer"
    : hasOwnLocation
    ? "Sending"
    : "Waiting";
  const peerStatusText = hasPeerLocation ? "Visible on map" : "Waiting for other person";

  return (
    <>
      <MetaHeader title="Yenshia | Share Location" />

      <section className="relative min-h-[21rem] overflow-hidden rounded-2xl bg-[var(--blue-pale)] shadow-[var(--shadow-card)]">
        {hasOwnLocation ? (
          <Map position1={[coords.latitude, coords.longitude]} position2={mapPosition2} />
        ) : (
          <div className="grid min-h-[21rem] place-items-center px-4 pb-24 pt-6 text-center sm:min-h-[24rem]">
            <div className="max-w-sm space-y-3">
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
          <div className="pointer-events-none absolute inset-x-2 top-2 z-20 sm:left-3 sm:right-auto sm:top-3">
            <div className="pointer-events-auto w-full max-w-sm rounded-xl bg-white/95 p-3 text-[var(--navy)] shadow-[var(--shadow-search)] backdrop-blur">
              <p className="text-sm font-semibold">Live location</p>
              <div className="mt-2 grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--neutral-muted)]">Your location</span>
                  <span className="font-semibold">On map</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--neutral-muted)]">Private share</span>
                  <span className={locationError ? "font-semibold text-[var(--error-red)]" : "font-semibold"}>
                    {privateStatusText}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--neutral-muted)]">Other person</span>
                  <span className="font-semibold">{peerStatusText}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {hasOwnLocation && (
          <div className="pointer-events-none absolute inset-x-2 bottom-2 z-20 sm:inset-x-3 sm:bottom-3">
            <div className="pointer-events-auto flex flex-col gap-2 rounded-xl bg-white/95 p-2.5 shadow-[var(--shadow-search)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-3">
              <p
                className={
                  locationError
                    ? "text-sm font-semibold text-[var(--error-red)]"
                    : "text-sm font-semibold text-[var(--navy)]"
                }
              >
                {bottomMessage}
              </p>
              {!derivedAccountReady && derivationError ? (
                <Button
                  className="self-start whitespace-nowrap sm:self-auto"
                  type="button"
                  disabled={derivingAccount}
                  loading={derivingAccount}
                  onClick={onStartPrivateSharing}
                >
                  Try again
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

      {(finishError || proofResult?.error) && (
        <p className="mt-3 break-words text-sm text-[var(--error-red)]">
          {finishErrorMessage((finishError || new Error(proofResult?.error)).message)}
        </p>
      )}
    </>
  );
};

export default ShareLocationPage;
