import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";
import { Button } from "~~/components/ui/Button";
import { useHasMounted } from "~~/hooks/useHasMounted";
import { useStellarWallet } from "~~/sdk/stellar-wallet";

const InvitePage: NextPage = () => {
  const router = useRouter();
  const inviterPublicKey = router.query.publicKey?.toString();
  const hasMounted = useHasMounted();
  const isValidInviteKey = !!inviterPublicKey && /^0x04[0-9a-fA-F]{128}$/.test(inviterPublicKey);
  const { address, isConnecting, isConnected } = useStellarWallet();
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);

  useEffect(() => {
    if (hasMounted && router.isReady && isValidInviteKey && (!address || !isConnected)) {
      void router.replace(`/?next=${encodeURIComponent(router.asPath)}`);
    }
  }, [address, hasMounted, isConnected, isValidInviteKey, router]);

  if (!hasMounted || !router.isReady || isConnecting) {
    return <div className="my-14 flex justify-center text-sm font-semibold text-[var(--neutral-muted)]">Loading…</div>;
  }

  if (!isValidInviteKey) {
    return (
      <>
        <MetaHeader title="Yenshia | Invalid Invite" />
        <section className="soft-panel mx-auto max-w-xl space-y-4 p-5 text-center sm:p-6">
          <p className="status-pill mx-auto">Invalid link</p>
          <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">This link is not valid.</h1>
          <p className="muted-copy leading-7">Ask for a fresh Yenshia link before sharing location.</p>
          <Link href="/" className="inline-flex">
            <Button color="secondary">Back</Button>
          </Link>
        </section>
      </>
    );
  }

  if (!address || !isConnected) {
    return (
      <>
        <MetaHeader title="Yenshia | Start" />
        <section className="soft-panel mx-auto max-w-xl space-y-4 p-5 text-center sm:p-6">
          <p className="status-pill mx-auto">Connect wallet</p>
          <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">Connect your wallet first.</h1>
        </section>
      </>
    );
  }

  const onShareLocation = () => {
    if (!isValidInviteKey || !inviterPublicKey) return;

    setLocationError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Location is not available in this browser.");
      return;
    }

    setRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        void router.push(`/share/${inviterPublicKey}?join=1`);
      },
      error => {
        setRequestingLocation(false);
        setLocationError(error.message || "Turn on location access.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    );
  };

  return (
    <>
      <MetaHeader title="Yenshia | Share Location" />
      <section className="mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-y-3 py-5 sm:py-6">
        <h1 className="w-full text-center font-serif text-3xl text-[var(--navy)] sm:text-4xl">Share your location</h1>
        <p className="muted-copy max-w-md text-center leading-7">
          Press once. Your browser will ask for location access.
        </p>
        {locationError && <p className="text-center text-sm text-[var(--error-red)]">{locationError}</p>}
        <div className="mt-2 flex w-full flex-col items-center justify-center gap-y-3">
          <Button
            className="min-w-[15rem]"
            loading={requestingLocation}
            disabled={requestingLocation}
            onClick={onShareLocation}
          >
            Share location
          </Button>
          <Link href="/">
            <Button color="secondary" className="min-w-[15rem]">
              Decline
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
};

export default InvitePage;
