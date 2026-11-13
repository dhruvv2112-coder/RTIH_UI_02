# Map platform comparison — Godavari Pushkaralu 2027

*Prepared 13 Nov 2026 for the RTIH 15 Nov submission. Prices change often — re-check the linked pages before committing.*

## What the three apps need from a map

| Need | Command (desktop) | Field (staff phone) | Yatra (pilgrim phone) |
|---|---|---|---|
| Live overlays: zones, crowd density, alerts, staff positions | Must | Must | Crowd only |
| 3D / immersive view of ghats and approaches | Strong want (situational awareness, VIP briefings) | Nice | Nice |
| Works when the network is congested or down | Should | **Must** (offline Zone A cache) | **Must** (QR + map offline) |
| Indian addresses, Telugu labels | Nice | Nice | **Must** |
| Privacy: radar-only bathing areas, no third-party tracking | Must | Must | Must |
| Cost at festival scale (millions of pilgrims over 12 days) | — | — | **Critical** |

## Options compared

| | **MapLibre GL JS + OpenFreeMap** *(built into the demo)* | **Google Maps Platform** (Maps JS 3D / Photorealistic 3D Tiles) | **Mapbox GL JS v3** (Standard style) | **Mappls / MapmyIndia** Web & Mobile SDKs | **Ola Maps** (Krutrim) |
|---|---|---|---|---|---|
| 3D | Extruded OSM buildings, custom 3D layers (crowd columns), terrain with a DEM source | Best-in-class photorealistic meshes — **but no 3D mesh coverage in India**: Rajamahendravaram renders flat imagery on terrain | 3D buildings, terrain, landmarks, dynamic lighting | 3D junction views / landmarks in its apps; less open 3D styling for developers | Vector tiles (MapLibre-compatible), no photoreal 3D |
| Key / account | **None** | API key + billing account | Access token, card on file | Key; free SDK for qualifying startups | Key; prepaid credits from 1 Sep 2026 |
| Free allowance | Unlimited (donation-funded, no SLA) | India: Photorealistic 3D Tiles 7,000/month then $3.30 per 1,000; Immersive Maps 35,000 then $2.10 per 1,000 | 50,000 web map loads/month, then ~$5 per 1,000 | Free for qualifying startups; otherwise contract | 100,000 events per API per month, then INR tiers |
| Offline | Self-host tiles (PMTiles) on the laptop or an edge server | Not permitted to cache beyond terms | Mobile SDK offline packs (licensed) | Offline packs in mobile SDK (licensed) | Limited |
| India data quality | OSM — good roads, weaker addresses | Excellent | Good (OSM + own) | **Best for Indian addresses, govt. footprint** | Good, India-focused |
| Licence | BSD-3 (MapLibre), ODbL data | Proprietary | Proprietary | Proprietary | Proprietary |
| Vendor lock-in | Lowest | High | Medium | Medium | Medium |

## Recommendation

1. **Demo / 15 Nov submission — MapLibre GL JS + OpenFreeMap (implemented).** No key, no billing, no registration, renders 3D buildings and our own 3D crowd columns, and the same code can later point at self-hosted tiles. The stylised 2D SVG map stays the default because it works with no internet at all.
2. **Production — MapLibre renderer + self-hosted vector tiles for the ghat area, with Mappls as the address/search/routing layer.** Self-hosted PMTiles of the Rajamahendravaram–Kovvur stretch keep the staff and pilgrim apps working when cellular networks saturate on peak bathing days, cost nothing per view, and keep pilgrim location data off third-party servers. Mappls fills the Indian-address gap and has an existing government track record.
3. **Google Photorealistic 3D** is worth revisiting only for a Command-Centre briefing view if Google adds 3D mesh coverage for the area; today it would show flat imagery for Rajamahendravaram while adding per-load billing.
4. **Mapbox Standard** gives the most polished 3D out of the box but its per-load pricing and proprietary licence are a poor fit for a free public pilgrim app at festival scale.

## How the 3D view is wired

* `shared/map3d.js` — loads MapLibre GL JS v5 from a CDN on first use (unpkg, then jsDelivr), uses the OpenFreeMap *Liberty* style, adds 3D buildings if the style lacks them, and draws GeoJSON overlays: zones, radar-only privacy areas, 3D crowd columns coloured by density, staff, facilities, alerts (pulsing markers), task route and pin.
* `shared/geo.js` — two control points tie the stylised map units to longitude/latitude with a similarity transform. **The control points are approximate.** Replace them with surveyed ghat coordinates from the district GIS cell and every overlay moves with them.
* Command: **Map** tab → **3D** button (top right). Live alerts and staff positions update in place; clicking an alert marker focuses it in the queue. Esc returns to 2D.
* Field app: **Map** tab → **3D** button in the map controls. Shows your position, the active task pin, walking line, crowd columns and facilities.
* No internet → a clear "3D map unavailable offline" message; the 2D map is untouched.

## Sources

* [Google Maps Platform pricing — India](https://developers.google.com/maps/billing-and-pricing/pricing-india)
* [3D Maps in Maps JavaScript — overview and coverage](https://developers.google.cn/maps/documentation/javascript/3d/overview?hl=en)
* [Mapbox pricing](https://www.mapbox.com/pricing/) · [Mapbox GL JS v3 migration (Standard style, 3D lighting)](https://docs.mapbox.com/mapbox-gl-js/guides/migrate.md)
* [Mappls APIs & SDKs — free SDK for qualifying startups](https://mapmyindia.in/api)
* [Ola Maps pricing](https://maps.olakrutrim.com/pricing) · [Ola Maps pricing update, Sept 2026](https://maps.olakrutrim.com/pricing/update-2026)
* [OpenFreeMap](https://openfreemap.org) · [MapLibre GL JS](https://maplibre.org/projects/gl-js/) · [MapLibre 3D buildings example](https://maplibre.org/maplibre-gl-js/docs/examples/3d-buildings/)
