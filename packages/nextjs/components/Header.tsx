import Link from "next/link";
import { YenshiaLogo } from "~~/components/YenshiaLogo";
import { useStellarWallet } from "~~/sdk/stellar-wallet";

const shortenAddress = (address: string) => `${address.slice(0, 5)}...${address.slice(-4)}`;

export const Header = () => {
  const { address } = useStellarWallet();

  return (
    <header className="sticky left-0 top-0 z-20 px-2 py-2 sm:px-3 sm:py-3">
      <div className="layout-container flex justify-center sm:justify-start">
        <div className="header-base inline-flex w-auto items-center gap-3 px-2 py-2 sm:px-4">
          <Link href="/" className="flex min-w-0 items-center" aria-label="Yenshia home">
            <YenshiaLogo className="h-10 w-[9rem] sm:h-11 sm:w-[10rem]" />
          </Link>

          {address ? (
            <Link
              href="/invite"
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-[rgba(189,215,255,0.45)] bg-white px-3 font-mono text-xs font-semibold text-[var(--navy)] shadow-[var(--shadow-search)] sm:h-11 sm:px-4"
            >
              {shortenAddress(address)}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
};
