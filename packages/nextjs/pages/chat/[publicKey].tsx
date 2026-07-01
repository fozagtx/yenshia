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
  const { derivationError, derivedAccountReady, deriveAccount, derivingAccount } = useDerivedAccount();
  const [unsignedTransactionXdr, setUnsignedTransactionXdr] = useState("");
  const [signedTransactionXdr, setSignedTransactionXdr] = useState("");
  const [proofResult, setProofResult] = useState<SubmitProofApiResponse | null>(null);
  const [signingError, setSigningError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const sessionReady = !!address && !!publicKey && derivedAccountReady;

  const { coords, isGeolocationAvailable, isGeolocationEnabled } = useSendLocation({
    publicKey: sessionReady ? publicKey : undefined,
  });
  const { coords: otherCoords } = useReceiveLocation({ enabled: sessionReady });

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
        <section className="soft-panel mx-auto max-w-3xl space-y-4 p-6 text-center md:p-8">
          <p className="status-pill mx-auto">Invalid invite</p>
          <h1 className="font-serif text-4xl text-[var(--navy)]">This invite is not valid.</h1>
          <p className="muted-copy leading-7">
            Open a valid Yenshia invite link before starting private location sharing.
          </p>
        </section>
      </>
    );
  }

  if (!address) {
    return (
      <>
        <MetaHeader title="Yenshia | Start" />
        <section className="soft-panel mx-auto grid max-w-5xl gap-8 overflow-hidden p-6 md:grid-cols-[0.9fr_1.1fr] md:p-8">
          <Image
            src="/illustrations/yenshia-illustration-invite.png"
            alt="People preparing a private location session"
            width={720}
            height={560}
            priority
            className="proof-illustration mx-auto w-full max-w-[24rem]"
          />
          <div className="flex flex-col justify-center gap-4 text-center md:text-left">
            <p className="status-pill mx-auto md:mx-0">Start on Yenshia home</p>
            <h1 className="font-serif text-4xl text-[var(--navy)]">Open Yenshia home first.</h1>
          </div>
        </section>
      </>
    );
  }

  if (!derivedAccountReady) {
    return (
      <>
        <MetaHeader title="Yenshia | Wallet Signature Required" />
        <section className="soft-panel mx-auto max-w-3xl space-y-4 p-6 text-center md:p-8">
          <p className="status-pill mx-auto">
            {derivingAccount ? "Waiting for wallet signature" : "Signature required"}
          </p>
          <h1 className="font-serif text-4xl text-[var(--navy)]">Session key is not ready.</h1>
          <p className="muted-copy leading-7">
            Prepare the private session key when you are ready to start encrypted location sharing.
          </p>
          {derivationError && <p className="text-sm text-[var(--error-red)]">{derivationError.message}</p>}
          <Button disabled={derivingAccount} loading={derivingAccount} onClick={onPrepareSessionKey}>
            Prepare session key
          </Button>
        </section>
      </>
    );
  }

  const hasLocationPair = !!coords && !!otherCoords;
  const locationStatus = !isGeolocationAvailable
    ? "Geolocation is not available in this browser."
    : !isGeolocationEnabled
    ? "Enable geolocation to share a real location."
    : hasLocationPair
    ? "Live locations received."
    : "Waiting for both live locations.";

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
            <h1 className="font-serif text-4xl text-[var(--navy)] md:text-5xl">Private location session</h1>
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
            <div className="grid min-h-[22rem] items-center gap-6 md:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4 text-center md:text-left">
                <h2 className="font-serif text-3xl text-[var(--navy)]">Real location required</h2>
                <p className="muted-copy leading-7">{locationStatus}</p>
              </div>
              <Image
                src="/illustrations/yenshia-human-location-strip-transparent.png"
                alt="People sharing a private location session"
                width={1945}
                height={808}
                className="proof-illustration mx-auto w-full max-w-[30rem]"
              />
            </div>
          )}
        </section>

        <section className="soft-panel flex w-full flex-col gap-4 p-5 md:p-6">
          <div className="space-y-2">
            <h2 className="font-serif text-3xl text-[var(--navy)]">Sign Stellar XDR</h2>
            <p className="muted-copy leading-7">
              Paste unsigned Stellar transaction XDR, then sign it with your Stellar wallet.
            </p>
          </div>

          <textarea
            className="textarea min-h-[8rem] w-full font-mono text-xs"
            value={unsignedTransactionXdr}
            onChange={event => setUnsignedTransactionXdr(event.target.value)}
            placeholder="Unsigned Stellar transaction XDR"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--neutral-muted)]">Only signed Stellar XDR can be submitted.</p>
            <Button
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
            <h2 className="font-serif text-3xl text-[var(--navy)]">Submit signed XDR</h2>
            <p className="muted-copy leading-7">
              Paste the signed Stellar transaction XDR for the real verifier call. Empty or unsigned data stays blocked.
            </p>
          </div>

          <textarea
            className="textarea min-h-[11rem] w-full font-mono text-xs"
            value={signedTransactionXdr}
            onChange={event => setSignedTransactionXdr(event.target.value)}
            placeholder="Signed Stellar transaction XDR"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--neutral-muted)]">{locationStatus}</p>
            <Button
              type="submit"
              disabled={!hasLocationPair || isLoading || signedTransactionXdr.trim().length === 0}
              loading={isLoading}
            >
              Submit transaction
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
