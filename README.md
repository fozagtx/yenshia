# Yenshia

Yenshia is private location sharing with Stellar wallet-gated sessions and a
real ZK verifier path.

The repo includes the actual ZK path: a Noir location circuit, Barretenberg
UltraHonk proof artifacts, and a Soroban verifier contract that stores the
verification key and verifies proofs on Stellar.

## Current Scope

- Encrypted invitation links for private location sessions.
- Live geolocation sharing through the existing Waku message path.
- `/api/stellar/prepare-proof` for preparing the real Soroban verifier call.
- `/api/stellar/submit-proof` for submitting the wallet-signed verifier transaction.
- RPC polling for the actual Stellar transaction result.
- Noir circuit in `circuits/yenshia_location`.
- Soroban UltraHonk verifier in `contracts/yenshia_ultrahonk_verifier`.
- Yenshia design-system styling and bitmap UX illustration in the Next app.

## Required Stellar Configuration

Set these in `packages/nextjs/.env.local` or your deployment environment:

```bash
STELLAR_RPC_URL=
STELLAR_NETWORK_PASSPHRASE=
YENSHIA_VERIFIER_CONTRACT_ID=
YENSHIA_PUBLIC_INPUTS_BASE64=
YENSHIA_PROOF_BYTES_BASE64=
```

Optional:

```bash
STELLAR_SUBMIT_POLL_ATTEMPTS=
STELLAR_SUBMIT_POLL_INTERVAL_MS=
```

`YENSHIA_PUBLIC_INPUTS_BASE64` and `YENSHIA_PROOF_BYTES_BASE64` must come from a
real Noir prover run for the location circuit. If those artifacts are missing,
the app blocks the Stellar verification flow instead of creating substitute
proof data.

## Testnet Deployment

The Yenshia UltraHonk verifier is deployed on Stellar testnet:

```text
CCNO4DL455NC7LBP7BWGYKVSUNBVWJTPMTJ647664VEDRJX44QZFL3TO
```

Deployment metadata is recorded in `deployments/testnet.json`.

The app is deployed on Vercel production:

```text
https://yenshia.vercel.app
```

Vercel deployment metadata is recorded in `deployments/vercel.json`.

## Commands

```bash
corepack pnpm install
corepack pnpm start
corepack pnpm next:check-types
corepack pnpm next:build
corepack pnpm zk:compile
corepack pnpm zk:prove /path/to/real-Prover.toml
corepack pnpm contract:build
```

`zk:compile` compiles the Noir circuit and writes a real UltraHonk verification
key to `circuits/yenshia_location/target/vk`.

`zk:prove` requires a real `Prover.toml`; no sample private coordinates are
checked in. It writes `proof`, `public_inputs`, and verifies them locally with
`bb verify`.
