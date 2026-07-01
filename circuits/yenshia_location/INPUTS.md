# Yenshia Location Proof Inputs

Create a real `Prover.toml` in this directory when proving. Do not commit it.

Required values:

- `lat_a`, `lon_a`, `lat_b`, `lon_b`: private shifted integer coordinates.
  Store latitude as `(latitude + 90) * SCALE` and longitude as
  `(longitude + 180) * SCALE`, rounded to integers.
- `salt`: private field element chosen by the prover.
- `max_distance_sq`: public squared distance bound in the same shifted coordinate
  units.

The circuit returns a public Pedersen commitment over both private coordinates
and the private salt. The verifier sees the commitment and bound, not the raw
coordinates.
