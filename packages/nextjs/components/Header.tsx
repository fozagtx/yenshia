import Link from "next/link";
import { StellarWalletButton } from "~~/components/StellarWalletButton";
import { YenshiaLogo } from "~~/components/YenshiaLogo";
import { useStellarWallet } from "~~/sdk/stellar-wallet";

export const Header = () => {
  const { address } = useStellarWallet();

  return (
    <header className="sticky left-0 top-0 z-20 px-2 py-2 sm:px-3 sm:py-3">
      <div className="layout-container">
        <div className="header-base flex w-full items-center justify-between gap-2 px-2 py-2 sm:gap-3 sm:px-4">
          <Link href="/" className="flex min-w-0 items-center" aria-label="Yenshia home">
            <YenshiaLogo className="h-10 w-[7.1rem] sm:h-11 sm:w-[7.8rem]" />
          </Link>

          {address ? (
            <Link
              href="/invite"
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/20 bg-[image:var(--cta-gradient)] px-3 text-sm font-semibold text-white sm:h-11 sm:px-5"
            >
              App
            </Link>
          ) : (
            <StellarWalletButton className="connect-shell header-connect shrink-0" label="Connect" showError={false} />
          )}
        </div>
      </div>
    </header>
  );
};
