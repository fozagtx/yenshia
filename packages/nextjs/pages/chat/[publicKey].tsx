import { FormEvent, useEffect, useState } from "react";
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

const TESTNET_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

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

const LocationSessionPage: NextPage = () => {
  const router = useRouter();
  const routePublicKey = router.query.publicKey?.toString();
  const publicKey =
    routePublicKey && /^0x04[0-9a-fA-F]{128}$/.test(routePublicKey) ? (routePublicKey as `0x${string}`) : undefined;

  const hasMounted = useHasMounted();
  const { address, signTransaction } = useStellarWallet();
  const { derivationError, derivedAccount, derivedAccountReady, deriveAccount, derivingAccount } = useDerivedAccount();
  const [unsignedTransactionXdr, setUnsignedTransactionXdr] = useState("");
  const [signedTransactionXdr, setSignedTransactionXdr] = useState("");
  const [proofResult, setProofResult] = useState<SubmitProofApiResponse | null>(null);
  const [signingError, setSigningError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const sessionReady = !!address && !!publicKey && derivedAccountReady;
  const isSessionOwner =
    !!publicKey && !!derivedAccount && publicKey.toLowerCase() === derivedAccount.publicKey.toLowerCase();

  const {
    coords: otherCoords,
    location: peerLocation,
    receiveError,
    relayError: receiveRelayError,
    relayReady: receiveRelayReady,
    relayStatus: receiveRelayStatus,
  } = useReceiveLocation({
    enabled: sessionReady,
    expectedSenderPublicKey: isSessionOwner ? undefined : publicKey,
    sessionPublicKey: sessionReady ? publicKey : undefined,
  });
  const recipientPublicKey = sessionReady ? (isSessionOwner ? peerLocation?.senderPublicKey : publicKey) : undefined;
  const canSendToPeer =
    !!recipientPublicKey &&
    !!derivedAccount &&
    recipientPublicKey.toLowerCase() !== derivedAccount.publicKey.toLowerCase();
  const {
    coords,
    isGeolocationAvailable,
    isGeolocationEnabled,
    relayError: sendRelayError,
    relayReady: sendRelayReady,
    relayStatus: sendRelayStatus,
    sendError,
  } = useSendLocation({
    recipientPublicKey: canSendToPeer ? recipientPublicKey : undefined,
    sessionPublicKey: sessionReady ? publicKey : undefined,
  });

  const {
    mutateAsync: submitProof,
    error: submitProofError,
    isLoading,
  } = useMutation<SubmitProofApiResponse, Error, string>({
    mutationFn: async xdr => {
      const response = await fetch("/api/stellar/submit-proof", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signedTransactionXdr: xdr,
        }),
      });

      const payload = (await response.json()) as SubmitProofApiResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Stellar transaction submission failed.");
      }

      return payload;
    },
  });

  const onSubmitProof = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProofResult(null);

    try {
      const result = await submitProof(signedTransactionXdr.trim());
      setProofResult(result);
    } catch {
      setProofResult(null);
    }
  };

  const onSignTransaction = async () => {
    setSigningError(null);
    setIsSigning(true);

    try {
      const signedXdr = await signTransaction(unsignedTransactionXdr.trim(), TESTNET_NETWORK_PASSPHRASE);
      setSignedTransactionXdr(signedXdr);
    } catch (error) {
      setSigningError(error instanceof Error ? error.message : "Stellar wallet signing failed.");
    } finally {
      setIsSigning(false);
    }
  };

  const onPrepareSessionKey = () => {
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
            alt="People preparing a private location session"
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
        <MetaHeader title="Yenshia | Private Session" />
        <section className="soft-panel mx-auto max-w-2xl space-y-4 p-5 text-center sm:p-6">
          <p className="status-pill mx-auto">{derivingAccount ? "Waiting for wallet" : "Private session"}</p>
          <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">Start the private session.</h1>
          <p className="muted-copy leading-7">Confirm once in your wallet so this location session can stay private.</p>
          {derivationError && <p className="text-sm text-[var(--error-red)]">{derivationError.message}</p>}
          <Button
            className="mx-auto whitespace-nowrap"
            disabled={derivingAccount}
            loading={derivingAccount}
            onClick={onPrepareSessionKey}
          >
            Confirm in wallet
          </Button>
        </section>
      </>
    );
  }

  const relayError = sendRelayError || receiveRelayError;
  const relayStatus =
    receiveRelayStatus === "loading" || sendRelayStatus === "loading" ? "loading" : receiveRelayStatus;
  const sessionError = sendError || receiveError || relayError;
  const waitingForPeer = sessionReady && isSessionOwner && !peerLocation;
  const hasLocationPair = !!coords && !!otherCoords && canSendToPeer;
  const locationStatus = sessionError
    ? sessionError.message
    : relayStatus === "loading" || !receiveRelayReady || (canSendToPeer && !sendRelayReady)
    ? "Connecting to the real location relay."
    : waitingForPeer
    ? "Waiting for the other phone to open your link."
    : !canSendToPeer
    ? "Waiting for the other phone."
    : !isGeolocationAvailable
    ? "Geolocation is not available in this browser."
    : !isGeolocationEnabled
    ? "Enable geolocation to share a real location."
    : hasLocationPair
    ? "Both locations are ready."
    : "Waiting for both phones.";
  const locationPanelTitle = sessionError
    ? "Location sharing is blocked"
    : waitingForPeer
    ? "Waiting for the other phone"
    : !canSendToPeer
    ? "Waiting for a real peer"
    : "Location access needed";

  return (
    <>
      <MetaHeader title="Yenshia | Location Session" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="status-pill w-fit">
              <span className={hasLocationPair ? "status-dot" : "h-2 w-2 rounded-full bg-[var(--blue-sky)]"} />
              {hasLocationPair ? "Location ready" : "Location session"}
            </p>
            <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl md:text-5xl">Private location session</h1>
          </div>
          {proofResult?.finalStatus && <span className="status-pill">{proofResult.finalStatus}</span>}
        </div>

        <section className="soft-panel overflow-hidden p-4 md:p-6">
          {hasLocationPair ? (
            <Map
              position1={[coords.latitude, coords.longitude]}
              position2={[otherCoords.latitude, otherCoords.longitude]}
            />
          ) : (
            <div className="grid min-h-[18rem] items-center gap-5 md:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4 text-center md:text-left">
                <h2 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">{locationPanelTitle}</h2>
                <p className={sessionError ? "leading-7 text-[var(--error-red)]" : "muted-copy leading-7"}>
                  {locationStatus}
                </p>
              </div>
              <Image
                src="/illustrations/yenshia-human-location-strip-transparent.png"
                alt="People sharing a private location session"
                width={1945}
                height={808}
                className="proof-illustration mx-auto w-full max-w-[22rem] md:max-w-[28rem]"
              />
            </div>
          )}
        </section>

        <section className="soft-panel flex w-full flex-col gap-4 p-5 md:p-6">
          <div className="space-y-2">
            <h2 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">Sign Stellar transaction</h2>
            <p className="muted-copy leading-7">
              Paste the unsigned Stellar transaction, then sign it with your wallet.
            </p>
          </div>

          <label className="text-sm font-semibold text-[var(--navy)]" htmlFor="unsigned-transaction-xdr">
            Unsigned transaction
          </label>
          <textarea
            id="unsigned-transaction-xdr"
            className="textarea min-h-[8rem] w-full font-mono text-xs"
            value={unsignedTransactionXdr}
            onChange={event => setUnsignedTransactionXdr(event.target.value)}
            placeholder="Paste unsigned Stellar transaction"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--neutral-muted)]">Only a signed Stellar transaction can be sent.</p>
            <Button
              className="self-start whitespace-nowrap sm:self-auto"
              type="button"
              disabled={!hasLocationPair || !address || isSigning || unsignedTransactionXdr.trim().length === 0}
              loading={isSigning}
              onClick={onSignTransaction}
            >
              Sign with Stellar
            </Button>
          </div>

          {signingError && <p className="break-words text-sm text-[var(--error-red)]">{signingError}</p>}
        </section>

        <form className="soft-panel flex w-full flex-col gap-4 p-5 md:p-6" onSubmit={onSubmitProof}>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">Send signed transaction</h2>
            <p className="muted-copy leading-7">
              Paste the signed Stellar transaction for the real on-chain call. Empty or unsigned data stays blocked.
            </p>
          </div>

          <label className="text-sm font-semibold text-[var(--navy)]" htmlFor="signed-transaction-xdr">
            Signed transaction
          </label>
          <textarea
            id="signed-transaction-xdr"
            className="textarea min-h-[11rem] w-full font-mono text-xs"
            value={signedTransactionXdr}
            onChange={event => setSignedTransactionXdr(event.target.value)}
            placeholder="Paste signed Stellar transaction"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--neutral-muted)]">{locationStatus}</p>
            <Button
              className="self-start whitespace-nowrap sm:self-auto"
              type="submit"
              disabled={!hasLocationPair || isLoading || signedTransactionXdr.trim().length === 0}
              loading={isLoading}
            >
              Send transaction
            </Button>
          </div>

          {submitProofError && (
            <p className="break-words text-sm text-[var(--error-red)]">{submitProofError.message}</p>
          )}

          {proofResult && (
            <div className="soft-card space-y-2 break-words p-4 text-sm">
              {proofResult.hash && (
                <p>
                  <span className="font-semibold">Hash:</span> {proofResult.hash}
                </p>
              )}
              {proofResult.submitStatus && (
                <p>
                  <span className="font-semibold">Submitted:</span> {proofResult.submitStatus}
                </p>
              )}
              {proofResult.ledger && (
                <p>
                  <span className="font-semibold">Ledger:</span> {proofResult.ledger}
                </p>
              )}
              {proofResult.error && <p className="text-[var(--error-red)]">{proofResult.error}</p>}
            </div>
          )}
        </form>
      </div>
    </>
  );
};

export default LocationSessionPage;
