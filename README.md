# yenshia

private location sharing, stellar wallet sessions, zk location proof.

connect a stellar wallet, create a private location link, share live location with one other person, and keep the session gated by wallet-derived encryption. yenshia never holds your wallet secret key. location sharing uses real browser geolocation and encrypted client-side messages.

live at [yenshia.vercel.app](https://yenshia.vercel.app/)

## what it does

use a stellar wallet to open a private two-person location sharing session.

- connect a real stellar wallet
- create or open a private invitation link
- share browser geolocation after the browser asks for permission
- send encrypted location updates through the waku relay path
- show each person as a named marker on a leaflet/openstreetmap map
- show the real latitude/longitude for each visible participant under the map
- save a visible location snapshot locally in the current browser profile
- prepare and submit a real soroban verifier call when proof artifacts are provided
- require prover input, proof bytes, signed xdr, rpc config, and verifier contract config for proof submission

the current app flow targets private location sharing on stellar testnet with a deployed ultrahonk verifier contract.

## how it works

the app creates a private invite link from the connected stellar wallet session.

each person opens the link, connects a stellar wallet, enters a display name, and presses share location. the browser asks for geolocation permission. yenshia uses the real browser coordinate only after that permission is granted.

the wallet signature derives the private session encryption key in the browser. location payloads include the sender display name and coordinates, then get encrypted before they are published on the yenshia waku content topic.

the receiving browser listens on the same content topic, decrypts valid messages for the session, and renders the other person on the map. if the other person's coordinate has not arrived from the relay, the UI stays in a waiting state instead of inventing a location.

saved locations are local-only browser snapshots. they are written to `localStorage` on the current device and are not sent to the relay, stellar, vercel, or the other participant.

for the zk verifier path, the app prepares a stellar transaction that calls the deployed soroban verifier contract with real proof bytes and public inputs. the user still has to sign and submit the real transaction.

## zk math

the noir circuit proves this statement:

```text
i know two shifted integer locations:

lat_a, lon_a
lat_b, lon_b

and a private salt

such that:

(lat_a - lat_b)^2 + (lon_a - lon_b)^2 <= max_distance_sq
```

latitude and longitude are stored as shifted integer coordinates before proving:

```text
latitude  -> (latitude + 90) * SCALE
longitude -> (longitude + 180) * SCALE
```

the public bound is:

```text
max_distance_sq
```

the circuit returns a public pedersen commitment:

```text
location_commitment =
  pedersen_hash([
    lat_a,
    lon_a,
    lat_b,
    lon_b,
    salt
  ])
```

the private witness contains the two locations and salt. the verifier receives proof bytes and public inputs, not the raw private coordinate witness.

## contracts

`contracts/yenshia_ultrahonk_verifier`

soroban ultrahonk verifier wrapper. stores one verification key at deployment and exposes:

```text
verify_location_proof(public_inputs, proof_bytes)
```

the contract checks the proof length, loads the stored verification key, and verifies the proof bytes plus public inputs with the ultrahonk soroban verifier library.

## stack

next.js, react, typescript, tailwind, daisyui, local react components, heroicons, freighter api, stellar sdk, waku sdk, protobuf, leaflet, openstreetmap, react-geolocated, qrcode.

noir for the circuit. nargo for compile and witness execution. barretenberg `bb` for ultrahonk proving and local verification. soroban rust contracts on stellar testnet.

## testnet config

```text
network: stellar testnet
rpc: https://soroban-testnet.stellar.org
verifier contract: CCNO4DL455NC7LBP7BWGYKVSUNBVWJTPMTJ647664VEDRJX44QZFL3TO
verifier wasm hash: 53563fb1dbe8e8193dacaad4c00fecf9609c5397ce9ff6f2d1473d191472205e
verifier upload tx: eba246dd0eded4d75af0ed06fd44ed3ec57313378a93fdc29b29a03d215e5df7
verifier deploy tx: 7085a14af3cc0441fa06ad5e6fc83bfc5773921d825f863ce85a364aa31ee2ba
```

deployment metadata:

- [deployments/testnet.json](deployments/testnet.json)
- [deployments/vercel.json](deployments/vercel.json)

## local development

```bash
corepack pnpm install
corepack pnpm start
corepack pnpm next:check-types
corepack pnpm next:build
```

set the required stellar and proof configuration in `packages/nextjs/.env.local`:

```bash
STELLAR_RPC_URL=
STELLAR_NETWORK_PASSPHRASE=
YENSHIA_VERIFIER_CONTRACT_ID=
YENSHIA_PUBLIC_INPUTS_BASE64=
YENSHIA_PROOF_BYTES_BASE64=
```

optional polling controls:

```bash
STELLAR_SUBMIT_POLL_ATTEMPTS=
STELLAR_SUBMIT_POLL_INTERVAL_MS=
```

build the circuit:

```bash
corepack pnpm zk:compile
```

prove with a real local `Prover.toml`:

```bash
corepack pnpm zk:prove /path/to/real-Prover.toml
```

build and deploy the verifier contract:

```bash
corepack pnpm contract:build
corepack pnpm contract:deploy
```

`zk:prove` requires real private inputs. no sample private coordinates are checked in.

## docs

product requirements: [docs/PRD.md](docs/PRD.md)

contract notes: [contracts/README.md](contracts/README.md)

circuit inputs: [circuits/yenshia_location/INPUTS.md](circuits/yenshia_location/INPUTS.md)

## contributing

prs are welcome.

for partnerships or questions, reach out at ibrahimpima76@gmail.com.
