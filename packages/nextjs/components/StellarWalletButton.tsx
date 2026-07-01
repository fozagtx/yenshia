import { useState } from "react";
import { ArrowRightOnRectangleIcon, WalletIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { Button } from "~~/components/ui/Button";
import { useStellarWallet } from "~~/sdk/stellar-wallet";

const shortenAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-6)}`;

export const StellarWalletButton = ({
  className,
  label = "Continue",
  onConnected,
  showError = true,
}: {
  className?: string;
  label?: string;
  onConnected?: () => void | Promise<void>;
  showError?: boolean;
}) => {
  const { address, connect, disconnect, error, isConnecting, showProfile } = useStellarWallet();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const connectFreighter = () => {
    void connect()
      .then(() => {
        setIsWalletModalOpen(false);
        return onConnected?.();
      })
      .catch(() => undefined);
  };

  if (!address) {
    return (
      <div className={className}>
        <Button
          leftIcon={<WalletIcon className="h-5 w-5" />}
          loading={false}
          onClick={() => {
            setIsWalletModalOpen(true);
          }}
        >
          {label}
        </Button>
        {showError && error && <p className="mt-2 max-w-[18rem] text-xs text-[var(--error-red)]">{error}</p>}

        {isWalletModalOpen && (
          <div
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,34,89,0.24)] px-4"
            role="dialog"
          >
            <div className="soft-panel w-full max-w-md p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="font-serif text-3xl text-[var(--navy)]">Connect Stellar wallet</h2>
                  <p className="text-sm leading-6 text-[var(--neutral-muted)]">Choose your wallet to continue.</p>
                </div>
                <button
                  aria-label="Close wallet modal"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[rgba(189,215,255,0.45)] bg-white text-[var(--navy)] shadow-[var(--shadow-search)]"
                  type="button"
                  onClick={() => setIsWalletModalOpen(false)}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid gap-3">
                <button
                  className="flex w-full items-center gap-3 rounded-2xl border border-[rgba(189,215,255,0.45)] bg-white p-3 text-left shadow-[var(--shadow-search)]"
                  disabled={isConnecting}
                  type="button"
                  onClick={connectFreighter}
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--blue-pale)] text-[var(--navy)]">
                    <WalletIcon className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--navy)]">Freighter</span>
                    <span className="block text-xs leading-5 text-[var(--neutral-muted)]">
                      {isConnecting ? "Waiting for Freighter" : "Stellar browser wallet"}
                    </span>
                  </span>
                </button>
              </div>

              {error && <p className="mt-4 break-words text-sm text-[var(--error-red)]">{error}</p>}
            </div>
          </div>
        )}
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
