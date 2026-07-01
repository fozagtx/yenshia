import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import type { NextPage } from "next";
import { ArrowLeftIcon, ClipboardDocumentIcon } from "@heroicons/react/24/solid";
import { MetaHeader } from "~~/components/MetaHeader";
import { QrCode } from "~~/components/QrCode";
import { Button } from "~~/components/ui/Button";
import { CopyButton } from "~~/components/ui/CopyButton";
import { useHasMounted } from "~~/hooks/useHasMounted";
import { useDerivedAccount } from "~~/sdk/crypto";
import { useStellarWallet } from "~~/sdk/stellar-wallet";

const shortenAddress = (address: string) => `${address.slice(0, 5)}...${address.slice(-4)}`;

const InvitePage: NextPage = () => {
  const router = useRouter();
  const { address } = useStellarWallet();
  const { derivationError, derivedAccount, deriveAccount, derivingAccount } = useDerivedAccount();
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);

  const hasMounted = useHasMounted();

  useEffect(() => {
    if (hasMounted && !address) {
      void router.replace("/");
    }
  }, [address, hasMounted, router]);

  if (!hasMounted) {
    return null;
  }

  if (!address) {
    return (
      <>
        <MetaHeader title="Yenshia | Start" />
        <section className="soft-panel mx-auto max-w-xl space-y-4 p-5 text-center sm:p-6">
          <p className="status-pill mx-auto">Start from home</p>
          <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">Open Yenshia home first.</h1>
        </section>
      </>
    );
  }

  const inviteLink = derivedAccount ? `${window.location.origin}/invite/${derivedAccount.publicKey}` : "";
  const onCreateInvite = () => {
    void deriveAccount().catch(() => undefined);
  };
  const onShareLocation = () => {
    if (!derivedAccount) return;

    setLocationError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Location is not available in this browser.");
      return;
    }

    setRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        void router.push(`/share/${derivedAccount.publicKey}?start=1`);
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
    <div className="space-y-4">
      <MetaHeader title="Yenshia | Location Invite" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={"/"} className="inline-flex">
          <Button className="whitespace-nowrap" color={"secondary"} leftIcon={<ArrowLeftIcon className="h-5 w-5" />}>
            Back
          </Button>
        </Link>
        <p className="status-pill w-fit font-mono">
          <span className="status-dot" />
          {shortenAddress(address)}
        </p>
      </div>

      <section className="soft-panel mx-auto w-full max-w-2xl p-4 sm:p-5">
        {derivedAccount ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="space-y-2">
              <p className="status-pill mx-auto">
                <span className="status-dot" />
                Link ready
              </p>
              <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">Share this link</h1>
            </div>

            <div className="rounded-2xl bg-white p-2 shadow-[var(--shadow-search)]">
              <QrCode address={inviteLink} />
            </div>

            <p className="w-full break-words rounded-xl border border-[rgba(189,215,255,0.28)] bg-white/80 p-3 font-mono text-sm text-[var(--navy)]">
              {inviteLink}
            </p>

            {locationError && <p className="text-sm text-[var(--error-red)]">{locationError}</p>}

            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <CopyButton
                text={inviteLink}
                className="self-center"
                leftIcon={<ClipboardDocumentIcon className="h-5 w-5" />}
              >
                Copy link
              </CopyButton>
              <Button disabled={requestingLocation} loading={requestingLocation} onClick={onShareLocation}>
                Share location
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-3 text-center">
            <p className="status-pill mx-auto">Private link</p>
            <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">Create a location link</h1>
            <p className="muted-copy max-w-[28rem] leading-7">
              Make one private link for the person you want to share location with.
            </p>
            {derivingAccount && <p className="muted-copy leading-7">Confirm in your wallet.</p>}
            {derivationError && <p className="text-sm text-[var(--error-red)]">{derivationError.message}</p>}
            <Button
              className="self-center whitespace-nowrap"
              disabled={derivingAccount}
              loading={derivingAccount}
              onClick={onCreateInvite}
            >
              Create link
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default InvitePage;
