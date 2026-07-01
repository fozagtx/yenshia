import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
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

const confirmationErrorMessage = (message: string) => {
  if (
    message.includes("YENSHIA_") ||
    message.includes("publicInputsBase64") ||
    message.includes("proofBytesBase64") ||
    message.includes("real Noir proof")
  ) {
    return "Confirmation is not ready yet.";
  }

  if (message.includes("STELLAR_") || message.includes("verifier contract")) {
    return "Confirmation is not ready yet.";
  }

  if (message.includes("transaction") || message.includes("XDR") || message.includes("Soroban")) {
    return "Confirmation could not be finished.";
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
  const [proofResult, setProofResult] = useState<SubmitProofApiResponse | null>(null);
  const sharingReady = !!address && !!publicKey && derivedAccountReady;
  const isLinkOwner =
    !!publicKey && !!derivedAccount && publicKey.toLowerCase() === derivedAccount.publicKey.toLowerCase();

  const {
    coords: otherCoords,
    location: peerLocation,
    receiveError,
    relayError: receiveRelayError,
  } = useReceiveLocation({
    enabled: sharingReady,
    expectedSenderPublicKey: isLinkOwner ? undefined : publicKey,
    linkPublicKey: sharingReady ? publicKey : undefined,
  });
  const recipientPublicKey = sharingReady ? (isLinkOwner ? peerLocation?.senderPublicKey : publicKey) : undefined;
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
    linkPublicKey: sharingReady ? publicKey : undefined,
    recipientPublicKey: canSendToPeer ? recipientPublicKey : undefined,
  });

  const {
    mutateAsync: verifyProof,
    error: verificationError,
    isLoading: isVerifying,
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
        throw new Error(prepared.success ? "Confirmation could not be prepared." : prepared.error);
      }

      if (!prepared.success) {
        throw new Error(prepared.error || "Confirmation could not be prepared.");
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
        throw new Error(payload.error || "Confirmation could not be finished.");
      }

      return payload;
    },
  });

  const onVerifyProof = async () => {
    setProofResult(null);

    try {
      if (!address) {
        throw new Error("Connect your wallet before continuing.");
      }

      const result = await verifyProof(address);
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

  if (!hasMounted) {
    return null;
  }

  if (!publicKey) {
    return (
      <>
        <MetaHeader title="Yenshia | Invalid Invite" />
        <section className="soft-panel mx-auto max-w-2xl space-y-4 p-5 text-center sm:p-6">
          <p className="status-pill mx-auto">Invalid invite</p>
          <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">This invite is not valid.</h1>
          <p className="muted-copy leading-7">Ask for a fresh Yenshia link before starting private location sharing.</p>
        </section>
      </>
    );
  }

  if (!address) {
    return (
      <>
        <MetaHeader title="Yenshia | Start" />
        <section className="soft-panel mx-auto grid max-w-4xl gap-5 overflow-hidden p-5 sm:p-6 md:grid-cols-[0.9fr_1.1fr]">
          <Image
            src="/illustrations/yenshia-illustration-invite.png"
            alt="People preparing private location sharing"
            width={720}
            height={560}
            priority
            className="proof-illustration mx-auto w-full max-w-[18rem] md:max-w-[23rem]"
          />
          <div className="flex flex-col justify-center gap-4 text-center md:text-left">
            <p className="status-pill mx-auto md:mx-0">Start from home</p>
            <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">Open Yenshia home first.</h1>
          </div>
        </section>
      </>
    );
  }

  if (!derivedAccountReady) {
    return (
      <>
        <MetaHeader title="Yenshia | Share Location" />
        <section className="soft-panel mx-auto max-w-2xl space-y-4 p-5 text-center sm:p-6">
          <p className="status-pill mx-auto">{derivingAccount ? "Waiting for wallet" : "Private"}</p>
          <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">Start sharing location.</h1>
          <p className="muted-copy leading-7">Confirm once in your wallet so sharing stays private.</p>
          {derivationError && <p className="text-sm text-[var(--error-red)]">{derivationError.message}</p>}
          <Button
            className="mx-auto whitespace-nowrap"
            disabled={derivingAccount}
            loading={derivingAccount}
            onClick={onStartPrivateSharing}
          >
            Confirm in wallet
          </Button>
        </section>
      </>
    );
  }

  const relayError = sendRelayError || receiveRelayError;
  const locationError = sendError || receiveError || relayError;
  const waitingForPeer = sharingReady && isLinkOwner && !peerLocation;
  const hasLocationPair = !!coords && !!otherCoords && canSendToPeer;
  const locationStatus = locationError
    ? locationErrorMessage(locationError.message)
    : waitingForPeer
    ? "Waiting for the other phone to open your link."
    : !canSendToPeer
    ? "Waiting for the other phone."
    : !isGeolocationAvailable
    ? "Location is not available in this browser."
    : !isGeolocationEnabled
    ? "Allow location to continue."
    : hasLocationPair
    ? "Both phones are sharing location."
    : "Waiting for both phones.";
  const locationPanelTitle = locationError ? "Location paused" : hasLocationPair ? "Ready" : "Waiting for location";

  return (
    <>
      <MetaHeader title="Yenshia | Share Location" />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl md:text-5xl">Share location</h1>
          {proofResult?.success && <span className="status-pill">Complete</span>}
        </div>

        <section className="soft-panel overflow-hidden p-4 md:p-6">
          {hasLocationPair ? (
            <Map
              position1={[coords.latitude, coords.longitude]}
              position2={[otherCoords.latitude, otherCoords.longitude]}
            />
          ) : (
            <div className="grid min-h-[18rem] place-items-center text-center">
              <div className="max-w-md space-y-3">
                <h2 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">{locationPanelTitle}</h2>
                <p className={locationError ? "leading-7 text-[var(--error-red)]" : "muted-copy leading-7"}>
                  {locationStatus}
                </p>
              </div>
            </div>
          )}
        </section>

        {hasLocationPair && (
          <section className="soft-panel flex w-full flex-col gap-4 p-5 md:p-6" aria-busy={isVerifying}>
            <div className="space-y-2">
              <h2 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">Ready to confirm</h2>
              <p className="muted-copy max-w-3xl leading-7">
                Both phones are sharing location. Confirm once in your wallet to finish.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--neutral-muted)]">
                {proofResult?.success ? "Confirmed." : "Your wallet will ask for one confirmation."}
              </p>
              <Button
                className="self-start whitespace-nowrap sm:self-auto"
                type="button"
                disabled={isVerifying || proofResult?.success}
                loading={isVerifying}
                onClick={onVerifyProof}
              >
                Confirm
              </Button>
            </div>

            {verificationError && (
              <p className="break-words text-sm text-[var(--error-red)]">
                {confirmationErrorMessage(verificationError.message)}
              </p>
            )}

            {proofResult && (
              <div className="soft-card space-y-2 break-words p-4 text-sm">
                <p
                  className={
                    proofResult.success ? "font-semibold text-[var(--navy)]" : "font-semibold text-[var(--error-red)]"
                  }
                >
                  {proofResult.success ? "Confirmed" : "Needs attention"}
                </p>
                {proofResult.hash && (
                  <p>
                    <span className="font-semibold">Reference:</span> {proofResult.hash}
                  </p>
                )}
                {proofResult.error && (
                  <p className="text-[var(--error-red)]">{confirmationErrorMessage(proofResult.error)}</p>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
};

export default ShareLocationPage;
