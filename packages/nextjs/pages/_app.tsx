import type { AppProps } from "next/app";
import Head from "next/head";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "leaflet/dist/leaflet.css";
import { Layout } from "~~/components/Layout";
import { useHasMounted } from "~~/hooks/useHasMounted";
import { DerivedAccountProvider } from "~~/sdk/crypto";
import { StellarWalletProvider } from "~~/sdk/stellar-wallet";
import "~~/styles/globals.css";

const queryClient = new QueryClient();

const YenshiaApp = ({ Component, pageProps }: AppProps) => {
  const hasMounted = useHasMounted();

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>
      {hasMounted ? (
        <StellarWalletProvider>
          <DerivedAccountProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </DerivedAccountProvider>
        </StellarWalletProvider>
      ) : (
        <div className="min-h-screen yenshia-app-bg" />
      )}
    </QueryClientProvider>
  );
};

export default YenshiaApp;
