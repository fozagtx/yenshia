import { ArrowRightOnRectangleIcon, WalletIcon } from "@heroicons/react/24/solid";
import { Button } from "~~/components/ui/Button";
import { useStellarWallet } from "~~/sdk/stellar-wallet";

const shortenAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-6)}`;

export const StellarWalletButton = ({
  className,
  label = "Connect wallet",
  onConnected,
  showError = true,
}: {
  className?: string;
  label?: string;
  onConnected?: () => void | Promise<void>;
  showError?: boolean;
}) => {
  const { address, connect, disconnect, error, isConnecting, showProfile } = useStellarWallet();

  if (!address) {
    return (
      <div className={className}>
        <Button
          leftIcon={<WalletIcon className="h-5 w-5" />}
          loading={isConnecting}
          onClick={() => {
            void connect()
              .then(() => onConnected?.())
              .catch(() => undefined);
          }}
        >
          {label}
        </Button>
        {showError && error && <p className="mt-2 max-w-[18rem] text-xs text-[var(--error-red)]">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-end gap-2 ${className || ""}`}>
      <button
        className="rounded-2xl border border-[rgba(189,215,255,0.45)] bg-white px-3 py-2 font-mono text-xs font-semibold text-[var(--navy)] shadow-[var(--shadow-search)]"
        type="button"
        onClick={() => {
          void showProfile();
        }}
      >
        {shortenAddress(address)}
      </button>
      <Button
        aria-label="Disconnect Stellar wallet"
        color="secondary"
        leftIcon={<ArrowRightOnRectangleIcon className="h-5 w-5" />}
        onClick={() => {
          void disconnect();
        }}
      >
        Disconnect
      </Button>
    </div>
  );
};
