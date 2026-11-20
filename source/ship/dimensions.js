// SHIP2666 — RMS Teutonic (1889) master dimensional specification
// All units in metres (m). Coordinate system:
//   X: aft (0) -> forward (length), Y: port(-) -> starboard(+), centreline Y=0
//   Z: keel baseline (0) -> up
// Origin: keel baseline at aft perpendicular (AP).
//
// Sources: Titanic Belfast Teutonic Fact File (verified, TEUTONIC-SPECIFIC/HIGH);
// remaining provisional values labelled. See docs/historical_configuration.md and
// docs/evidence_ledger.csv.

const FT = 0.3048;

export const dimensions = {
  // Identity
  officialNumber: 96334,
  builder: 'Harland & Wolff Ltd, Queen\'s Island, Belfast',
  yardNumber: 208,
  launched: '19 January 1889',
  designer: 'Alexander M. Carlisle',

  // Principal dimensions (m)
  // Length: Titanic Belfast lists 565.5 ft (treated as LBP). ~582 ft overall is
  // provisional and recorded separately; do not average the two conventions.
  lengthBetweenPerpendiculars: 565.5 * FT,   // 172.36 m (VERIFIED)
  lengthOverallProvisional: 582.0 * FT,      // 177.39 m (PROVISIONAL)
  beam: 57.8 * FT,                           // 17.62 m (VERIFIED)
  depth: 39.25 * FT,                         // 11.96 m (VERIFIED, to upper deck)
  grt: 9984.26,                              // (VERIFIED)

  // Derived working length for the hull model (use LBP)
  length: 565.5 * FT,

  // Structure
  decks: 4,
  masts: 3,
  bulkheads: 11,
  stern: 'elliptical',
  framework: 'steel (Siemens-Martin)',

  // Machinery
  engineType: '2 x triple-expansion inverted direct-acting surface-condensing',
  cylindersPerEngine: { hp: 43 * 0.0254, ip: 68 * 0.0254, lp: 110 * 0.0254 }, // m
  stroke: 60 * 0.0254, // 1.524 m
  nhp: 2400,
  boilers: 12,
  boilerPressurePsi: 180,
  propellers: 2,
  speedKnots: 20,

  // Deck elevations (m above keel) — inferred layout for 4-deck liner,
  // labelled INFERRED pending deck-plan evidence.
  deckElevations: [
    { name: 'Lower / tank-top', z: 2.6 },
    { name: 'Main deck', z: 5.6 },
    { name: 'Upper deck', z: 8.6 },
    { name: 'Boat deck', z: 11.4 },
  ],
  bridgeZ: 13.6,
  funnelBaseZ: 11.4,
  funnelHeight: 5.2,

  // Stationing: hull stations along X for lofting
  numStations: 24,
};

export function stationX(i, n) {
  // Cosine-spaced stations: finer at ends (bow/stern) where curvature is tightest.
  return (dimensions.length / 2) * (1 - Math.cos(Math.PI * i / (n - 1)));
}
