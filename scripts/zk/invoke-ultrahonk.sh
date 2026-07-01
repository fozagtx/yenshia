#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 CONTRACT_ID" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTRACT_ID="$1"
NETWORK="${STELLAR_NETWORK_NAME:-testnet}"
SOURCE="${STELLAR_SOURCE_ACCOUNT:?Set STELLAR_SOURCE_ACCOUNT to a funded Stellar identity.}"
PROOF="$ROOT_DIR/circuits/yenshia_location/target/proof"
PUBLIC_INPUTS="$ROOT_DIR/circuits/yenshia_location/target/public_inputs"

if [[ ! -f "$PROOF" || ! -f "$PUBLIC_INPUTS" ]]; then
  echo "Missing proof artifacts. Run pnpm zk:prove with a real Prover.toml first." >&2
  exit 1
fi

stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SOURCE" \
  --network "$NETWORK" \
  --send yes \
  -- \
  verify_location_proof \
  --public_inputs-file-path "$PUBLIC_INPUTS" \
  --proof_bytes-file-path "$PROOF"
