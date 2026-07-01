import { useEffect } from "react";
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

  return (
    <>
      <MetaHeader title="Yenshia | Share Location" />
      <section className="flex flex-col gap-y-4 items-center justify-center w-full py-10">
        <h1 className="w-full text-center font-serif text-3xl text-[var(--navy)] sm:text-4xl mb-2">
          Start to share your location
        </h1>
        <p className="muted-copy text-center max-w-md leading-7">
          You have been invited to a private location session. Share your live location or decline.
        </p>
        <div className="flex flex-col gap-y-4 items-center justify-center w-full mt-4">
          <Link href={`/chat/${inviterPublicKey}`}>
            <Button className="min-w-[15rem]">Start</Button>
          </Link>
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
