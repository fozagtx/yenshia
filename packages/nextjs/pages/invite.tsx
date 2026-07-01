import { useEffect } from "react";
import Image from "next/image";
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

const InvitePage: NextPage = () => {
  const router = useRouter();
  const { address } = useStellarWallet();
  const { derivationError, derivedAccount, deriveAccount, derivingAccount } = useDerivedAccount();

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
        <MetaHeader title="Yenshia | Connect Wallet" />
        <section className="soft-panel mx-auto max-w-xl space-y-4 p-6 text-center">
          <p className="status-pill mx-auto">Landing page required</p>
          <h1 className="font-serif text-4xl text-[var(--navy)]">Connect from the landing page.</h1>
        </section>
      </>
    );
  }

  const inviteLink = derivedAccount ? `${window.location.origin}/invite/${derivedAccount.publicKey}` : "";
  const onCreateInvite = () => {
    void deriveAccount().catch(() => undefined);
  };

  return (
    <div className="space-y-6">
      <MetaHeader title="Yenshia | Location Invite" />

      <Link href={"/"} className="inline-flex">
        <Button className="whitespace-nowrap" color={"secondary"} leftIcon={<ArrowLeftIcon className="h-5 w-5" />}>
          Back
        </Button>
      </Link>

      <section className="soft-panel grid gap-8 p-6 md:grid-cols-[0.8fr_1.2fr] md:p-8">
        <Image
          src="/illustrations/yenshia-human-location-strip-transparent.png"
          alt="People sharing a private location link"
          width={1945}
          height={808}
          className="proof-illustration mx-auto w-full max-w-[30rem]"
        />

        {inviteLink ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="space-y-2">
              <p className="status-pill mx-auto">
                <span className="status-dot" />
                Invite key ready
              </p>
              <h1 className="font-serif text-4xl text-[var(--navy)]">Share location link</h1>
            </div>

            <div className="rounded-[32px] bg-white p-3 shadow-[var(--shadow-search)]">
              <QrCode address={inviteLink} />
            </div>

            <p className="w-full max-w-[32rem] break-words rounded-xl border border-[rgba(189,215,255,0.28)] bg-white/80 p-4 font-mono text-sm text-[var(--navy)]">
              {inviteLink}
            </p>

            <CopyButton
              text={inviteLink}
              className="min-w-[15rem]"
              leftIcon={<ClipboardDocumentIcon className="h-5 w-5" />}
            >
              Copy link
            </CopyButton>
          </div>
        ) : (
          <div className="flex flex-col justify-center gap-4 text-center md:text-left">
            <p className="status-pill mx-auto md:mx-0">Wallet-derived key required</p>
            <h1 className="font-serif text-4xl text-[var(--navy)]">No invite key yet</h1>
            <p className="muted-copy leading-7">Create the private link when you are ready.</p>
            {derivingAccount && <p className="muted-copy leading-7">Waiting for your wallet signature.</p>}
            {derivationError && <p className="text-sm text-[var(--error-red)]">{derivationError.message}</p>}
            <Button
              className="justify-center md:justify-start"
              disabled={derivingAccount}
              loading={derivingAccount}
              onClick={onCreateInvite}
            >
              Create private link
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default InvitePage;
