# Historical configuration and measurement policy

**Provisional early passenger service, circa 1889–1892 — NOT COMPLETE.**

The unavailable company photograph prevents a definitive match to the company's version. This reconstruction uses the short, widely spaced funnels and open upper-deck arrangement in Royal Museums Greenwich G2542 (circa 1890), the three-deck plan facing printed p.105 of Maginnis (1900), and explicitly identified 1889 interior images. It excludes Spithead review guns, wartime changes and the later enclosed promenade. No assets from another reconstruction are imported.

## Inspected originals

- Maginnis, *The Atlantic Ferry*, third edition, **1900** (title page verified at PDF p.5). Teutonic description printed p.103 / PDF p.185; profile facing p.103 / PDF p.184; **three-deck plan facing p.105 / PDF p.188**; machinery printed p.181 / PDF p.299; stern and overlapping screws facing p.195 / PDF p.318; specification table PDF p.433.
- Maginnis, *The Atlantic Ferry*, **1892** scan, machinery chapter printed pp.189–198 / PDF pp.231–244, engine illustrations PDF pp.232, 233, 235; steering plate H at PDF p.249. Selected pages inspected, not every page of the book.
- Science Museum catalogue, **entry 856**, printed p.279 / PDF p.283: **Majestic**, a sister-ship proxy, not proof of identical fittings on Teutonic.
- Main, *The Progress of Marine Engineering* (1893), printed p.81 / PDF p.113: conflicting boiler and tonnage data retained.
- RMG G2542: original port profile photograph inspected. RMG BHC3657 is a painting of the 1889 review voyage; its armament is not transferred to ordinary service.
- *Ocean, Magazine of Travel*, September 1889, Teutonic staircase, smoking saloon, stateroom and dining-saloon illustrations as hosted by GG Archives: all four images inspected. A photograph's tonal values do not establish exact historic paint/fabric colours.
- Norway Heritage undated second-class plan: inspected, but too small for reliable transcription of every cabin number. Only the documented class arrangement and approximate circulation are used.

## Significant decisions / unresolved conflicts

1. **Length:** 582 ft overall = 177.3936 m; 566 ft B.P. = 172.5168 m from Maginnis' labelled table. Titanic Belfast's 565.5 ft is unspecified in measurement convention. It is not substituted for overall length or averaged with it.
2. **Beam:** 57.8 ft = 17.61744 m. Registered/moulded depth values are not automatically deck-to-keel measurements; the selected 39.2 ft is a dimensional reference, not proof of deck elevations.
3. **Boilers:** use **12 double-ended + 4 single-ended = 16 boilers**, 76 furnaces, following Maginnis 1892 printed p.194 and the 1900 Teutonic table. Main (1893) and Titanic Belfast report twelve. The model distinguishes the twelve main double-ended units from four smaller single-ended units. Their exact room grouping, diameter and length remain inferred.
4. **Screws:** three-bladed modified Griffiths screws, 19 ft 6 in diameter, 29 ft 6 in pitch; overlap 5 ft 6 in; **starboard screw 6 ft aft of port**. Outboard rotation. Do not substitute four blades, widely separated shafts or generic external brackets.
5. **Shaft spaces:** Maginnis explicitly says **no screw alley in the ordinary sense** (printed p.193). Model enclosed shaft chambers with refrigeration equipment alongside; do not claim conventional walk-through shaft alleys.
6. **Engines:** HP cylinders nearest boilers; three-point cast-steel supports; separate cylindrical condensers; common upper engine space above a centreline bulkhead. Slider-crank motion is exact for the model's stroke and inferred rod length. Stephenson gear is an intended construction detail; any simplified display motion must be labelled as such.
7. **Deck names:** the primary plate explicitly labels Upper, Main and Lower. Four registered decks are reported institutionally. The fourth low deck is provisionally called Orlop; tank top and boat-platform roof are auxiliary levels, **not six documented continuous passenger decks**.
8. **Circulation:** plan-derived two-deep cabin banks need transverse entry vestibules. Do not give outboard cabins imaginary doors directly onto a central corridor. Individual identifiers are reconstruction IDs, not invented archival cabin numbers.

## Inference register

Without builder's lines, full-resolution USM cabin plans or the company photograph, the hull station offsets, true hydrostatics, absolute deck elevations, bulkhead positions, frame spacing, exact room boundaries, most colours, individual cabin numbering and many service-room subdivisions are inferred. Each space records this explicitly even if its class/region is documented. The plans are not to a published engineering scale; proportions are normalized against overall length and beam, with rounding and estimated uncertainty.

The USM records 2648 / barcode 2000718 and 2651 / barcode 2000721 expose placeholder thumbnails, not inspectable full plans. They are catalog leads, **not evidence for room geometry**. Wikimedia downloads of two engineering books returned HTTP 429; the original Internet Archive copies were retrieved instead. The previous repository is accessible, but its specified `leonidas-ii` ref is absent (HTTP 404), so its evidence index was not inspected or reused.

## Coordinate convention

Metres; +X forward, +Y port, +Z up. Origin is the centre of overall length on the moulded baseline, not the ship's measured centre of gravity. Three.js uses an explicit coordinate conversion; never silently reinterpret centimetres as metres. The reference waterline is an **inferred 7.1 m** demonstrator datum, not a verified service draught or hydrostatic solution. See `source/ship/specification.json` and `references/evidence_ledger.csv`.
