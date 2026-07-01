#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NETWORK="${STELLAR_NETWORK_NAME:-testnet}"
SOURCE="${STELLAR_SOURCE_ACCOUNT:?Set STELLAR_SOURCE_ACCOUNT to a funded Stellar identity.}"
WASM="$ROOT_DIR/contracts/yenshia_ultrahonk_verifier/target/wasm32v1-none/release/yenshia_ultrahonk_verifier.wasm"
VK="$ROOT_DIR/circuits/yenshia_location/target/vk"

if [[ ! -f "$WASM" ]]; then
  echo "Missing contract WASM. Run pnpm contract:build first." >&2
  exit 1
fi

if [[ ! -f "$VK" ]]; then
  echo "Missing verification key. Run pnpm zk:compile first." >&2
  exit 1
fi

stellar contract deploy \
  --wasm "$WASM" \
  --source "$SOURCE" \
  --network "$NETWORK" \
  -- \
  --vk_bytes-file-path "$VK"
