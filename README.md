# Yenshia

Yenshia is private location sharing with Stellar wallet-gated sessions and a
real ZK verifier path.

The repo includes the actual ZK path: a Noir location circuit, Barretenberg
UltraHonk proof artifacts, and a Soroban verifier contract that stores the
verification key and verifies proofs on Stellar.

## Current Scope

- Encrypted invitation links for private location sessions.
- Live geolocation sharing through the existing Waku message path.
- `/api/stellar/submit-proof` for submitting signed Stellar transaction XDR.
- RPC polling for the actual Stellar transaction result.
- Noir circuit in `circuits/yenshia_location`.
- Soroban UltraHonk verifier in `contracts/yenshia_ultrahonk_verifier`.
- Yenshia design-system styling and bitmap UX illustration in the Next app.

## Required Stellar Configuration

Set these in `packages/nextjs/.env.local` or your deployment environment:

```bash
STELLAR_RPC_URL=
STELLAR_NETWORK_PASSPHRASE=
```

Optional:

```bash
STELLAR_SUBMIT_POLL_ATTEMPTS=
STELLAR_SUBMIT_POLL_INTERVAL_MS=
```

The signed transaction XDR must invoke the deployed `verify_location_proof`
contract method with real `public_inputs` and `proof` artifacts from the Noir
prover.

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

## No Fake Proof Policy

- No mock proofs.
- No substitute proof data.
- No generated test wallets for live submissions.
- No simulated verifier success.
- No fake transaction hashes or explorer links.

If the real prover input, verifier contract, signed transaction XDR, or Stellar
RPC configuration is missing, the app blocks the proof submission flow and
reports the missing requirement.
