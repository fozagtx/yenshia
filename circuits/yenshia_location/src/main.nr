fn main(
    lat_a: u64,
    lon_a: u64,
    lat_b: u64,
    lon_b: u64,
    salt: Field,
    max_distance_sq: pub u128,
) -> pub Field {
    let dlat_u64 = if lat_a > lat_b {
        lat_a - lat_b
    } else {
        lat_b - lat_a
    };

    let dlon_u64 = if lon_a > lon_b {
        lon_a - lon_b
    } else {
        lon_b - lon_a
    };

    let dlat = dlat_u64 as u128;
    let dlon = dlon_u64 as u128;
    let distance_sq = (dlat * dlat) + (dlon * dlon);

    assert(distance_sq <= max_distance_sq);

    std::hash::pedersen_hash([
        lat_a as Field,
        lon_a as Field,
        lat_b as Field,
        lon_b as Field,
        salt,
    ])
}
