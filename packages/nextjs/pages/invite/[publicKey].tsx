import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";
import { Button } from "~~/components/ui/Button";
import { CopyButton } from "~~/components/ui/CopyButton";
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
    return (
      <div className="my-14 flex justify-center text-sm font-semibold text-[var(--neutral-muted)]">
        Preparing wallet state
      </div>
    );
  }

  if (!isValidInviteKey) {
    return (
      <>
        <MetaHeader title="Yenshia | Invalid Invite" />
        <section className="soft-panel mx-auto max-w-xl space-y-4 p-5 text-center sm:p-6">
          <p className="status-pill mx-auto">Invite blocked</p>
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
          <p className="status-pill mx-auto">Start from home</p>
          <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">Open Yenshia home first.</h1>
        </section>
      </>
    );
  }

  const inviteLink = `${window.location.origin}/invite/${inviterPublicKey}`;

  return (
    <>
      <MetaHeader title="Yenshia | Join Location Session" />
      <section className="soft-panel mx-auto flex max-w-xl flex-col items-center gap-5 p-5 text-center sm:p-6">
        <p className="status-pill">
          <span className="status-dot" />
          Private link
        </p>
        <h1 className="font-serif text-3xl text-[var(--navy)] sm:text-4xl">Join location sharing</h1>
        <p className="w-full break-words rounded-xl border border-[rgba(189,215,255,0.28)] bg-white/80 p-4 font-mono text-sm text-[var(--navy)]">
          {inviteLink}
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <CopyButton text={inviteLink} color="secondary">
            Copy link
          </CopyButton>
          <Link href="/">
            <Button color="secondary">Decline</Button>
          </Link>
        </div>
        <Link href={`/chat/${inviterPublicKey}`}>
          <Button>Join</Button>
        </Link>
      </section>
    </>
  );
};

export default InvitePage;
