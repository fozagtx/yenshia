import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import type { NextPage } from "next";
import { useEffect, useState } from "react";
import { EnvelopeIcon, MapPinIcon, ShieldCheckIcon } from "@heroicons/react/24/solid";
import { MetaHeader } from "~~/components/MetaHeader";
import { StellarWalletButton } from "~~/components/StellarWalletButton";
import { useStellarWallet } from "~~/sdk/stellar-wallet";

const steps = [
  {
    title: "Send a private link",
    copy: "Create a private link for the person you want to share location with.",
    icon: EnvelopeIcon,
  },
  {
    title: "Share live location",
    copy: "Each person joins from their own phone and shares location privately.",
    icon: MapPinIcon,
  },
  {
    title: "Keep it private",
    copy: "Location details stay between the two phones.",
    icon: ShieldCheckIcon,
  },
];

const faqs = [
  {
    question: "Who is Yenshia for?",
    answer: "People who want private location sharing with one other person.",
  },
  {
    question: "How do I share location?",
    answer: "Create a private link, connect your wallet, and share location.",
  },
  {
    question: "What happens after I open the app?",
    answer: "You create or join a private link and follow the simple flow from there.",
  },
  {
    question: "Where do I start?",
    answer: "Use the main button here, then continue to sharing.",
  },
];

const HomePage: NextPage = () => {
  const router = useRouter();
  const { address } = useStellarWallet();
  const [continueAfterWallet, setContinueAfterWallet] = useState(false);
  const requestedNextPath =
    typeof router.query.next === "string" && router.query.next.startsWith("/") && !router.query.next.startsWith("//")
      ? router.query.next
      : "/invite";

  useEffect(() => {
    if (!continueAfterWallet || !address) return;

    setContinueAfterWallet(false);
    void router.push(requestedNextPath);
  }, [address, continueAfterWallet, requestedNextPath, router]);

  return (
    <>
      <MetaHeader title="Yenshia | Private Location Sharing" />

      <section className="grid items-center gap-6 overflow-hidden pb-10 pt-6 md:min-h-[calc(100vh-8.5rem)] md:grid-cols-[0.95fr_1.05fr] md:gap-8 md:pb-14 md:pt-10">
        <div className="relative z-10 space-y-5 md:space-y-6">
          <p className="status-pill w-fit">
            <span className="status-dot" />
            Private location sharing
          </p>
          <div className="space-y-4">
            <h1 className="font-serif text-[3.75rem] leading-[0.9] text-[var(--navy)] sm:text-[5rem] md:text-[7rem]">
              Yenshia
            </h1>
            <p className="max-w-[36rem] text-base leading-7 text-[var(--neutral-muted)] sm:text-lg sm:leading-8 md:text-xl md:leading-9">
              A private and safe way for two people to share location.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {address ? (
              <Link
                href="/invite"
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-white/20 bg-[image:var(--cta-gradient)] px-6 text-sm font-semibold text-white sm:w-auto"
              >
                Start sharing
              </Link>
            ) : (
              <StellarWalletButton
                className="connect-shell landing-connect"
                label="Connect wallet"
                onConnected={() => setContinueAfterWallet(true)}
                showError={false}
              />
            )}
            <Link
              href="#how"
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[rgba(0,37,97,0.08)] bg-white px-6 text-sm font-semibold text-[var(--blue-primary)] sm:w-auto"
            >
              How it works
            </Link>
          </div>
        </div>

        <div className="relative grid aspect-[1.16/1] w-full place-items-center overflow-hidden rounded-3xl bg-white/40 shadow-[var(--shadow-card)] md:aspect-[1.2/1]">
          <Image
            src="/illustrations/yenshia-illustration-location.png"
            alt="People sharing location with Yenshia"
            width={697}
            height={461}
            priority
            className="proof-illustration h-auto w-full max-w-[27rem] object-contain px-3 sm:max-w-[31rem] md:max-w-[34rem]"
          />
        </div>
      </section>

      <section id="how" className="space-y-5 py-10 md:space-y-6 md:py-12">
        <div className="max-w-[42rem] space-y-3">
          <p className="status-pill w-fit">How it works</p>
          <h2 className="font-serif text-3xl text-[var(--navy)] md:text-5xl">Built around private location sharing.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map(step => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="soft-card flex h-full flex-col gap-3 p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[var(--blue-primary)] shadow-[var(--shadow-search)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-semibold text-[var(--navy)]">{step.title}</h3>
                  </div>
                  <p className="leading-7 text-[var(--neutral-muted)]">{step.copy}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="faq" className="space-y-5 py-10 md:py-12">
        <div className="max-w-[42rem] space-y-3">
          <p className="status-pill w-fit">FAQ</p>
          <h2 className="font-serif text-3xl text-[var(--navy)] md:text-5xl">
            Simple answers before you open the app.
          </h2>
        </div>
        <div className="grid gap-3">
          {faqs.map(item => (
            <details key={item.question} className="soft-card group p-4">
              <summary className="cursor-pointer list-none text-lg font-semibold text-[var(--navy)]">
                {item.question}
              </summary>
              <p className="mt-3 leading-7 text-[var(--neutral-muted)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="flex flex-col items-start gap-3 border-t border-[rgba(189,215,255,0.3)] py-7 text-sm text-[var(--neutral-muted)] md:flex-row md:items-center md:justify-between">
        <p className="font-serif text-2xl text-[var(--navy)]">Yenshia</p>
        <p>Private location sharing for two people.</p>
      </footer>
    </>
  );
};

export default HomePage;
