import Link from "next/link";
import { YenshiaLogo } from "~~/components/YenshiaLogo";
import { useStellarWallet } from "~~/sdk/stellar-wallet";

const shortenAddress = (address: string) => `${address.slice(0, 5)}...${address.slice(-4)}`;

export const Header = () => {
  const { address } = useStellarWallet();

  return (
    <header className="sticky left-0 top-0 z-20 px-2 py-2">
      <div className="layout-container flex justify-center sm:justify-start">
        <div className="header-base inline-flex w-auto items-center gap-2 px-2 py-1.5 sm:px-3">
          <Link href="/" className="flex min-w-0 items-center" aria-label="Yenshia home">
            <YenshiaLogo className="h-9 w-[8.25rem] sm:h-10 sm:w-[9rem]" />
          </Link>

          {address ? (
            <Link
              href="/invite"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[rgba(189,215,255,0.45)] bg-white px-2.5 font-mono text-xs font-semibold text-[var(--navy)] shadow-[var(--shadow-search)] sm:h-10 sm:px-3"
            >
              {shortenAddress(address)}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
};
