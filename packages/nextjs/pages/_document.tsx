import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html data-theme="yenshia">
      <Head>
        <meta name="application-name" content="Yenshia" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Yenshia" />
        <meta name="description" content="Private location sharing with Stellar wallet-gated sessions" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/images/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#BDD7FF" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#BDD7FF" />

        <link rel="apple-touch-icon" href="/images/180.png?v=yenshia-2" />
        <link rel="apple-touch-icon" sizes="152x152" href="/images/152.png?v=yenshia-2" />
        <link rel="apple-touch-icon" sizes="167x167" href="/images/167.png?v=yenshia-2" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/180.png?v=yenshia-2" />

        <link rel="icon" href="/favicon.ico?v=yenshia-2" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/32.png?v=yenshia-2" />
        <link rel="icon" type="image/png" sizes="16x16" href="/16.png?v=yenshia-2" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/images/safari-pinned-tab.svg?v=yenshia-2" color="#002259" />
        <link rel="shortcut icon" type="image/png" href="/favicon.png?v=yenshia-2" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
