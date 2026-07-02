# Yenshia Product Requirements

## Users And Roles

- Link creator: connects a real Stellar wallet, enters a display name, creates a private location invite, and may start sharing their own browser location.
- Invited person: opens the invite link, connects a real Stellar wallet, enters a display name, and starts sharing their browser location.

## Routes

| Route                        | Purpose                                | Allowed                                      | Blocked                             | Data shown                                                       | Actions                                       | Failure behavior                                       |
| ---------------------------- | -------------------------------------- | -------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| `/`                          | Public landing and wallet entry        | Everyone                                     | None                                | Product copy, wallet button                                      | Connect wallet, continue pending invite       | Wallet errors stay visible                             |
| `/invite`                    | Create a location invite               | Connected wallet                             | No wallet                           | Creator display name, QR, invite link                            | Create link, copy link, share own location    | Browser location and wallet errors block action        |
| `/invite/[publicKey]`        | Accept invite                          | Valid invite key and connected wallet        | Invalid key, no wallet              | Inviter display name, invited person name field                  | Share location or decline                     | Invalid/no-wallet states block sharing                 |
| `/share/[publicKey]`         | Live private location map              | Valid invite key and connected wallet        | Invalid key, no wallet              | Real browser location, received peer location, participant names | Start/continue sharing, save a local snapshot | Missing wallet/location/relay data shows blocked state |
| `/api/stellar/prepare-proof` | Prepare real Stellar verifier call     | Valid server proof config and source address | Missing proof/config/source address | Unsigned real transaction XDR                                    | Prepare transaction                           | Returns error; no fake proof data                      |
| `/api/stellar/submit-proof`  | Submit signed real Stellar transaction | Signed transaction XDR                       | Missing/invalid XDR                 | Stellar RPC result                                               | Submit transaction                            | Returns error; no fake success                         |

## UI Component System

- Existing local components stay in use: `Button`, `CopyButton`, `QrCode`, `Layout`, `Header`, `MetaHeader`, and Leaflet map.
- Map markers represent real known positions only: own browser geolocation and peer location received through the encrypted relay.
- Participant names are user-entered display labels. They do not replace wallet identity or proof requirements.

## Required Flows

- Creator enters a name before creating the invite link.
- Invite link includes the creator name for the invited person screen and QR payload.
- Invited person sees "`Name` is inviting you to share location" and enters their own name before sharing.
- Each encrypted location payload includes the sender's display name.
- The map shows avatar-style markers for the current person and the received peer.
- A person may save the current visible location snapshot locally in their browser. This save is not sent to the relay, server, Stellar, or the other participant.

## No Fake Demo Rules

- No mock locations, generated wallets, fake proofs, fake transaction hashes, or simulated relay success.
- If browser geolocation, wallet signature, relay send, real proof artifacts, signed transaction XDR, or Stellar RPC config is missing, the relevant flow stays blocked and reports the missing requirement.

## Acceptance Criteria

- QR/link copy includes the creator name.
- Invite acceptance copy names the inviter.
- Both map markers use avatar chips instead of generic marker SVGs.
- The Yenshia header logo must render as crisp vector/HTML branding with no blur filters or scaled SVG text.
- App icons and favicons must be generated from the crisp vector mark, with large contexts using large raster or SVG assets instead of upscaling a 32px icon.
- Each participant visible in a session must have an obvious named marker directly on the map.
- The live map must show a compact under-map location strip with each visible participant's real latitude/longitude. If the peer coordinate has not arrived from the relay, it must show a waiting state instead of a guessed address or placeholder.
- The live map must include a compact save action that stores only the real current coordinate snapshot in the user's own browser storage and confirms the local save in the UI.
- Marker labels are based on user-entered names when available.
- Browser geolocation renders immediately after permission, while the private relay continues real Waku peer discovery and retries encrypted sends until a peer is available.
- A later browser position-update error must not replace an already received real position with a fatal sharing error.
- Unfinished proof/finish actions must not appear inside the live location map.
- Typecheck and production build pass.
