#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CIRCUIT_DIR="${1:-"$ROOT_DIR/circuits/yenshia_location"}"
PROJECT_NAME="yenshia_location"

export PATH="$HOME/.nargo/bin:$HOME/.bb/bin:$PATH"

command -v nargo >/dev/null 2>&1 || {
  echo "nargo is required. Install Noir 1.0.0-beta.9 with noirup." >&2
  exit 1
}

command -v bb >/dev/null 2>&1 || {
  echo "bb is required. Install Barretenberg 0.87.0 with bbup." >&2
  exit 1
}

cd "$CIRCUIT_DIR"
nargo compile

bb write_vk \
  --scheme ultra_honk \
  --oracle_hash keccak \
  --bytecode_path "target/${PROJECT_NAME}.json" \
  --output_path target \
  --output_format bytes_and_fields

if [[ -d target/vk && -f target/vk/vk ]]; then
  mv target/vk/vk target/vk.tmp
  rmdir target/vk
  mv target/vk.tmp target/vk
fi

if [[ -d target/vk_fields.json && -f target/vk_fields.json/vk_fields.json ]]; then
  mv target/vk_fields.json/vk_fields.json target/vk_fields.json.tmp
  rmdir target/vk_fields.json
  mv target/vk_fields.json.tmp target/vk_fields.json
fi
