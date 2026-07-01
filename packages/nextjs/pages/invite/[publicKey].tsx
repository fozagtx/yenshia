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
        <section className="soft-panel mx-auto max-w-xl space-y-4 p-6 text-center">
          <p className="status-pill mx-auto">Invite blocked</p>
          <h1 className="font-serif text-4xl text-[var(--navy)]">Invalid invite key</h1>
          <p className="muted-copy leading-7">This link does not contain a valid encrypted-session public key.</p>
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
        <section className="soft-panel mx-auto max-w-xl space-y-4 p-6 text-center">
          <p className="status-pill mx-auto">Start on Yenshia home</p>
          <h1 className="font-serif text-4xl text-[var(--navy)]">Open Yenshia home first.</h1>
        </section>
      </>
    );
  }

  const inviteLink = `${window.location.origin}/invite/${inviterPublicKey}`;

  return (
    <>
      <MetaHeader title="Yenshia | Join Location Session" />
      <section className="soft-panel mx-auto flex max-w-xl flex-col items-center gap-5 p-6 text-center">
        <p className="status-pill">
          <span className="status-dot" />
          Invite verified
        </p>
        <h1 className="font-serif text-4xl text-[var(--navy)]">Start location sharing</h1>
        <p className="w-full break-words rounded-xl border border-[rgba(189,215,255,0.28)] bg-white/80 p-4 font-mono text-sm text-[var(--navy)]">
          {inviteLink}
        </p>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <CopyButton text={inviteLink} color="secondary">
            Copy invite
          </CopyButton>
          <Link href="/">
            <Button color="secondary">Decline</Button>
          </Link>
        </div>
        <Link href={`/chat/${inviterPublicKey}`}>
          <Button className="min-w-[15rem]">Start</Button>
        </Link>
      </section>
    </>
  );
};

export default InvitePage;
