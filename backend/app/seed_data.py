"""Static dataset port of src/data/* — villages, users, sources, analytics.

The frontend data files are the contract (PLAN.md §6: frontend contract = future
API contract), so the backend seeds its DB from these identical values.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

# --- 24-village dataset (Rudraprayag, Mandakini valley) — port of data/villages.ts

VILLAGES: list[dict[str, Any]] = [
    {
        "id": "VN-2201", "code": "VN-2201", "name": "Kedarnath", "lat": 30.7346, "lng": 79.0669,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 3583, "slopeDeg": 30,
        "population": 650, "households": 180, "riverName": "Mandakini", "riverDistKm": 0.4,
        "watershed": "Mandakini", "dangerLevelM": 4.0, "nodeId": "ESP32-UK-001",
        "shelter": "Kedarnath Transition Shelter, 600 m SW of temple",
        "route": "Ridge path SW → Gaurikund helipad road; avoid river bank",
        "events": [{"year": 2013, "label": "Kedarnath disaster — shrine area devastated by flood & debris"}],
    },
    {
        "id": "VN-2202", "code": "VN-2202", "name": "Gaurikund", "lat": 30.6527, "lng": 79.0169,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1982, "slopeDeg": 26,
        "population": 1200, "households": 310, "riverName": "Mandakini", "riverDistKm": 0.3,
        "watershed": "Mandakini", "dangerLevelM": 4.2, "nodeId": "ESP32-UK-002",
        "shelter": "GMVN Tourist Rest House, 400 m uphill",
        "route": "Trek trail E to Sonprayag ridge; do not use valley road",
        "events": [{"year": 2013, "label": "Flash flood — 11 households washed away near hot spring"}],
    },
    {
        "id": "VN-2203", "code": "VN-2203", "name": "Sonprayag", "lat": 30.5908, "lng": 79.0503,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1730, "slopeDeg": 22,
        "population": 1500, "households": 380, "riverName": "Mandakini / Kali Ganga", "riverDistKm": 0.5,
        "watershed": "Mandakini", "dangerLevelM": 4.4, "nodeId": "ESP32-UK-003",
        "shelter": "Community Hall, upper Sonprayag (350 m)",
        "route": "Upper bazaar road E → Ukhimath highway",
        "events": [{"year": 2013, "label": "Confluence surge — market area submerged"}],
    },
    {
        "id": "VN-2204", "code": "VN-2204", "name": "Triyuginarayan", "lat": 30.6103, "lng": 79.0494,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1980, "slopeDeg": 24,
        "population": 420, "households": 95, "riverName": "Mandakini tributary", "riverDistKm": 1.6,
        "watershed": "Mandakini", "dangerLevelM": 3.8, "nodeId": None,
        "shelter": "Temple courtyard (stone, 250 m)",
        "route": "Village link road S → Sonprayag–Guptakashi road",
        "events": [{"year": 2023, "label": "Cloudburst runoff — village spring channel overflowed"}],
    },
    {
        "id": "VN-2205", "code": "VN-2205", "name": "Phata", "lat": 30.5319, "lng": 79.0872,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1440, "slopeDeg": 19,
        "population": 1600, "households": 400, "riverName": "Mandakini", "riverDistKm": 0.8,
        "watershed": "Mandakini", "dangerLevelM": 4.5, "nodeId": "ESP32-UK-004",
        "shelter": "Phata Helipad ground (700 m NE)",
        "route": "NH-107 NE toward Guptakashi; cross at flyover",
        "events": [{"year": 2013, "label": "Debris flow — 4 shops lost near highway"}],
    },
    {
        "id": "VN-2206", "code": "VN-2206", "name": "Guptakashi", "lat": 30.5297, "lng": 79.0692,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1319, "slopeDeg": 17,
        "population": 2100, "households": 520, "riverName": "Mandakini", "riverDistKm": 0.7,
        "watershed": "Mandakini", "dangerLevelM": 4.5, "nodeId": None,
        "shelter": "Inter College campus, upper town (500 m)",
        "route": "Upper Guptakashi bypass road W",
        "events": [{"year": 2013, "label": "Riverfront market flooded; bridge approach damaged"}],
    },
    {
        "id": "VN-2207", "code": "VN-2207", "name": "Kalimath", "lat": 30.5353, "lng": 79.1139,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1250, "slopeDeg": 16,
        "population": 1400, "households": 340, "riverName": "Kali Ganga", "riverDistKm": 0.6,
        "watershed": "Kali Ganga", "dangerLevelM": 4.2, "nodeId": "ESP32-UK-005",
        "shelter": "Kalimath temple complex (raised, 300 m)",
        "route": "Kalimath–Chandrapuri link road S",
        "events": [{"year": 2021, "label": "Monsoon surge — agricultural land scoured along Kali Ganga"}],
    },
    {
        "id": "VN-2208", "code": "VN-2208", "name": "Ukhimath", "lat": 30.5081, "lng": 79.0972,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1311, "slopeDeg": 15,
        "population": 3000, "households": 720, "riverName": "Madmaheshwar Ganga", "riverDistKm": 0.9,
        "watershed": "Madmaheshwar", "dangerLevelM": 4.4, "nodeId": "ESP32-UK-006",
        "shelter": "Tehsil Bhavan, Ukhimath (400 m)",
        "route": "Ukhimath–Chandrapuri road, western ridge",
        "events": [{"year": 2013, "label": "Winter seat relief camp — town cut off 3 days"}],
    },
    {
        "id": "VN-2209", "code": "VN-2209", "name": "Mayali", "lat": 30.4786, "lng": 79.0806,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1520, "slopeDeg": 21,
        "population": 900, "households": 220, "riverName": "Madmaheshwar Ganga", "riverDistKm": 1.8,
        "watershed": "Madmaheshwar", "dangerLevelM": 3.9, "nodeId": None,
        "shelter": "Primary School, upper Mayali (450 m)",
        "route": "Mayali–Ukhimath link road N",
        "events": [{"year": 2023, "label": "Landslide dam scare on tributary; 2 h evacuation"}],
    },
    {
        "id": "VN-2210", "code": "VN-2210", "name": "Chandrapuri", "lat": 30.4561, "lng": 79.1094,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1150, "slopeDeg": 14,
        "population": 2200, "households": 540, "riverName": "Madmaheshwar Ganga", "riverDistKm": 0.6,
        "watershed": "Madmaheshwar", "dangerLevelM": 4.6, "nodeId": "ESP32-UK-007",
        "shelter": "Community Health Centre complex (raised, 300 m)",
        "route": "NH-107 toward Ukhimath; use high bridge",
        "events": [{"year": 2021, "label": "River rose 1.8 m in 40 min — riverside homes evacuated"}],
    },
    {
        "id": "VN-2211", "code": "VN-2211", "name": "Bhanaj", "lat": 30.4269, "lng": 79.0664,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1280, "slopeDeg": 18,
        "population": 760, "households": 190, "riverName": "Mandakini", "riverDistKm": 2.1,
        "watershed": "Mandakini", "dangerLevelM": 3.9, "nodeId": None,
        "shelter": "Village Panchayat Bhavan (400 m)",
        "route": "Bhanaj–Agastyamuni road W",
        "events": [{"year": 2023, "label": "Slope failure above village after 72 h rain"}],
    },
    {
        "id": "VN-2212", "code": "VN-2212", "name": "Agastyamuni", "lat": 30.3864, "lng": 79.1064,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1000, "slopeDeg": 13,
        "population": 4800, "households": 1150, "riverName": "Mandakini", "riverDistKm": 0.5,
        "watershed": "Mandakini", "dangerLevelM": 4.7, "nodeId": "ESP32-UK-008",
        "shelter": "Govt. Inter College, Agastyamuni (1.2 km NE, raised)",
        "route": "NH-107 NE past market → college ridge road",
        "events": [
            {"year": 2013, "label": "Main bazaar flooded to 2 m; 40 shops lost"},
            {"year": 2021, "label": "River warning — market evacuated overnight"},
        ],
    },
    {
        "id": "VN-2213", "code": "VN-2213", "name": "Rampur", "lat": 30.4183, "lng": 79.0375,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1180, "slopeDeg": 17,
        "population": 1100, "households": 270, "riverName": "Mandakini", "riverDistKm": 1.2,
        "watershed": "Mandakini", "dangerLevelM": 4.1, "nodeId": None,
        "shelter": "Junior High School, upper Rampur (500 m)",
        "route": "Rampur–Tilwara ridge road S",
        "events": [{"year": 2023, "label": "Flash runoff — culvert washed out on link road"}],
    },
    {
        "id": "VN-2214", "code": "VN-2214", "name": "Tilwara", "lat": 30.3964, "lng": 79.0272,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 980, "slopeDeg": 15,
        "population": 1500, "households": 370, "riverName": "Mandakini", "riverDistKm": 0.4,
        "watershed": "Mandakini", "dangerLevelM": 4.4, "nodeId": "ESP32-UK-009",
        "shelter": "Tilwara Market upper block + school (600 m)",
        "route": "Tilwara–Agastyamuni road E; avoid old bridge in flood",
        "events": [
            {"year": 2013, "label": "Historic bridge washed out; market heavily damaged"},
            {"year": 2021, "label": "High river alert — bridge closed 6 h"},
        ],
    },
    {
        "id": "VN-2215", "code": "VN-2215", "name": "Bhiri", "lat": 30.3639, "lng": 79.0289,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1050, "slopeDeg": 14,
        "population": 980, "households": 240, "riverName": "Mandakini", "riverDistKm": 1.1,
        "watershed": "Mandakini", "dangerLevelM": 4.1, "nodeId": None,
        "shelter": "Community hall, Bhiri gaon (350 m)",
        "route": "Bhiri–Kunjethi road E",
        "events": [{"year": 2013, "label": "Riverbank erosion — 3 ha farmland lost"}],
    },
    {
        "id": "VN-2216", "code": "VN-2216", "name": "Kyark", "lat": 30.3333, "lng": 79.0833,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1450, "slopeDeg": 20,
        "population": 640, "households": 160, "riverName": "Madmaheshwar Ganga", "riverDistKm": 2.4,
        "watershed": "Madmaheshwar", "dangerLevelM": 3.8, "nodeId": "ESP32-UK-010",
        "shelter": "Forest rest house ridge (700 m)",
        "route": "Kyark–Ukhimath forest road N",
        "events": [{"year": 2021, "label": "Debris flow on forest slope after cloudburst"}],
    },
    {
        "id": "VN-2217", "code": "VN-2217", "name": "Chopta", "lat": 30.354, "lng": 79.2194,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 2900, "slopeDeg": 28,
        "population": 320, "households": 80, "riverName": "Mandakini headstreams", "riverDistKm": 3.5,
        "watershed": "Mandakini", "dangerLevelM": 3.5, "nodeId": None,
        "shelter": "GMVN Tourist Complex, Chopta meadow (300 m)",
        "route": "Chopta–Gopeshwar road W (all-weather)",
        "events": [{"year": 2023, "label": "Snowmelt + rain surge blocked trek route 12 h"}],
    },
    {
        "id": "VN-2218", "code": "VN-2218", "name": "Silli", "lat": 30.3422, "lng": 78.9947,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1240, "slopeDeg": 16,
        "population": 820, "households": 200, "riverName": "Alaknanda tributary", "riverDistKm": 1.9,
        "watershed": "Alaknanda", "dangerLevelM": 3.8, "nodeId": None,
        "shelter": "Silli Panchayat hall (400 m)",
        "route": "Silli–Kund road E",
        "events": [{"year": 2023, "label": "Cloudburst — 1 h rain, seasonal torrent flooded fields"}],
    },
    {
        "id": "VN-2219", "code": "VN-2219", "name": "Kunjethi", "lat": 30.3317, "lng": 79.0289,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1120, "slopeDeg": 15,
        "population": 700, "households": 175, "riverName": "Mandakini", "riverDistKm": 1.5,
        "watershed": "Mandakini", "dangerLevelM": 4.0, "nodeId": None,
        "shelter": "Kunjethi school campus (450 m)",
        "route": "Kunjethi–Bhiri road W",
        "events": [{"year": 2013, "label": "Market stream flooded; road cut 2 days"}],
    },
    {
        "id": "VN-2220", "code": "VN-2220", "name": "Chauras", "lat": 30.3122, "lng": 78.9775,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 820, "slopeDeg": 12,
        "population": 1900, "households": 460, "riverName": "Alaknanda", "riverDistKm": 0.8,
        "watershed": "Alaknanda", "dangerLevelM": 4.5, "nodeId": "ESP32-UK-011",
        "shelter": "Chauras Degree College ground (raised, 700 m)",
        "route": "Chauras–Rudraprayag highway N; use college ridge",
        "events": [{"year": 2021, "label": "Alaknanda high alert — riverside homes monitored"}],
    },
    {
        "id": "VN-2221", "code": "VN-2221", "name": "Rudraprayag (Ward 4)", "lat": 30.2842, "lng": 78.9828,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 660, "slopeDeg": 11,
        "population": 2400, "households": 560, "riverName": "Alaknanda–Mandakini", "riverDistKm": 0.2,
        "watershed": "Alaknanda", "dangerLevelM": 4.8, "nodeId": "ESP32-UK-012",
        "shelter": "Nagar Palika Community Hall + DM office (raised, 400 m)",
        "route": "NH-58 toward Jaggi; sangam viewpoint CLOSED in flood",
        "events": [
            {"year": 2013, "label": "Sangam confluence surge — riverside market destroyed"},
            {"year": 2021, "label": "High flood — sangam ghat submerged"},
        ],
    },
    {
        "id": "VN-2222", "code": "VN-2222", "name": "Jakholi", "lat": 30.2947, "lng": 78.9367,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 940, "slopeDeg": 13,
        "population": 2400, "households": 580, "riverName": "Mandakini (lower)", "riverDistKm": 2.8,
        "watershed": "Mandakini", "dangerLevelM": 4.0, "nodeId": None,
        "shelter": "Block office campus, Jakholi (500 m)",
        "route": "Jakholi–Rudraprayag road E",
        "events": [{"year": 2023, "label": "Hill torrent damaged irrigation channel"}],
    },
    {
        "id": "VN-2223", "code": "VN-2223", "name": "Koteshwar", "lat": 30.2743, "lng": 79.0169,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 700, "slopeDeg": 12,
        "population": 1150, "households": 290, "riverName": "Alaknanda", "riverDistKm": 0.9,
        "watershed": "Alaknanda", "dangerLevelM": 4.6, "nodeId": "ESP32-UK-013",
        "shelter": "Koteshwar temple ridge (raised, 600 m)",
        "route": "Koteshwar dam access road NE",
        "events": [{"year": 2021, "label": "Reservoir approach current — ghat closed"}],
    },
    {
        "id": "VN-2224", "code": "VN-2224", "name": "Syalsaur", "lat": 30.3222, "lng": 79.0725,
        "district": "Rudraprayag", "state": "Uttarakhand", "elevationM": 1050, "slopeDeg": 14,
        "population": 1050, "households": 260, "riverName": "Madmaheshwar Ganga", "riverDistKm": 1.3,
        "watershed": "Madmaheshwar", "dangerLevelM": 4.1, "nodeId": "ESP32-UK-014",
        "shelter": "Syalsaur market upper block (400 m)",
        "route": "Syalsaur–Ukhimath road N",
        "events": [{"year": 2013, "label": "Riverfront fields scoured; bridge closed"}],
    },
]

# --- 5 credentialed demo accounts (one per role) — port of data/users.ts

DEMO_USERS: list[dict[str, Any]] = [
    {
        "email": "national@jaldarpaan.in", "password": "Demo@1234", "name": "Arjun Mehta",
        "role": "national", "org": "NDRF HQ · National EOC", "posting": "National Command, New Delhi",
    },
    {
        "email": "state@jaldarpaan.in", "password": "Demo@1234", "name": "Meera Rawat, IAS",
        "role": "state", "org": "USDMA Uttarakhand", "posting": "State EOC, Dehradun",
        "scopeState": "Uttarakhand",
    },
    {
        "email": "district@jaldarpaan.in", "password": "Demo@1234", "name": "Col. S. Bisht (Retd.)",
        "role": "district", "org": "DDMA Rudraprayag", "posting": "District EOC, Rudraprayag",
        "scopeState": "Uttarakhand", "scopeDistrict": "Rudraprayag",
    },
    {
        "email": "field@jaldarpaan.in", "password": "Demo@1234", "name": "Ramesh Negi",
        "role": "field", "org": "SDRF Bat. 4", "posting": "Quick Response Team, Tilwara",
        "scopeState": "Uttarakhand", "scopeDistrict": "Rudraprayag",
    },
    {
        "email": "village@jaldarpaan.in", "password": "Demo@1234", "name": "Devki Devi",
        "role": "village", "org": "Gram Panchayat Chauras", "posting": "Village Pradhan",
        "scopeState": "Uttarakhand", "scopeDistrict": "Rudraprayag", "scopeVillageId": "VN-2220",
    },
]

# Extended directory shown on the Admin page (not login-enabled).
DIRECTORY_ONLY: list[dict[str, Any]] = [
    {"email": "ops.ndrf@jaldarpaan.in", "name": "Insp. K. Yadav", "role": "national", "org": "NDRF Bn-8", "posting": "Air Ops Cell, New Delhi"},
    {"email": "control.uk@jaldarpaan.in", "name": "S. Chauhan", "role": "state", "org": "USDMA", "posting": "State Ops Room, Dehradun"},
    {"email": "ddma.chamoli@jaldarpaan.in", "name": "H. Panwar", "role": "district", "org": "DDMA Chamoli", "posting": "District EOC, Gopeshwar"},
    {"email": "qrt.uk04@jaldarpaan.in", "name": "B. Tamta", "role": "field", "org": "SDRF Bat. 4", "posting": "QRT-2, Agastyamuni"},
    {"email": "pradhan.kalimath@jaldarpaan.in", "name": "M. Bhandari", "role": "village", "org": "GP Kalimath", "posting": "Village Pradhan"},
]

# --- 11 fused data-feed descriptors — port of data/sources.ts

DATA_SOURCES: list[dict[str, Any]] = [
    {"id": "imd-aws", "name": "IMD AWS (Automatic Weather Stations)", "provider": "IMD · MoES", "kind": "Station", "status": "degraded", "latencyMs": 1420, "lastSync": "14 min ago", "detail": "Real-time portal restricted (Oct 2025). District feed via MoU; ~1,008 AWS network mapped for pilot."},
    {"id": "imd-arg", "name": "IMD ARG (Rain Gauges)", "provider": "IMD · MoES", "kind": "Station", "status": "fallback", "latencyMs": 3600, "lastSync": "1 h 10 min ago", "detail": "Gridded rainfall + Open-Meteo running as fallback while portal access is pending."},
    {"id": "cwc-aff", "name": "CWC Flood Forecast (AFF)", "provider": "CWC", "kind": "Station", "status": "operational", "latencyMs": 640, "lastSync": "9 min ago", "detail": "~338 forecast sites; Chandrapuri & Rudraprayag gauge levels ingested hourly."},
    {"id": "india-wris", "name": "India-WRIS / NWIC Telemetry", "provider": "ISRO-NRSC · CWC", "kind": "Station", "status": "operational", "latencyMs": 780, "lastSync": "11 min ago", "detail": "Open hourly river telemetry — primary river-level feed for the pilot valley."},
    {"id": "gpm-imerg", "name": "GPM IMERG Satellite Rainfall", "provider": "NASA", "kind": "Satellite", "status": "operational", "latencyMs": 2100, "lastSync": "6 min ago", "detail": "30-min global rainfall estimates — primary independent confirmation source."},
    {"id": "smap-l4", "name": "NASA SMAP L4 Soil Moisture", "provider": "NASA", "kind": "Satellite", "status": "operational", "latencyMs": 5400, "lastSync": "52 min ago", "detail": "9 km soil moisture product; used where ESP32 probes are absent."},
    {"id": "sentinel-1", "name": "Sentinel-1 SAR", "provider": "ESA Copernicus", "kind": "Satellite", "status": "operational", "latencyMs": 9800, "lastSync": "2 h ago", "detail": "Radar change detection for inundation extent after events."},
    {"id": "cop-dem", "name": "Copernicus DEM 30 m", "provider": "ESA Copernicus", "kind": "Terrain", "status": "operational", "latencyMs": 300, "lastSync": "cached", "detail": "Slope, micro-watershed delineation & susceptibility for all 24 villages."},
    {"id": "gsi-bhukosh", "name": "GSI Bhukosh Landslide Inventory", "provider": "GSI", "kind": "Inventory", "status": "operational", "latencyMs": 1200, "lastSync": "1 d ago", "detail": "Historical landslide/flood labels feeding the risk model & history weight."},
    {"id": "open-meteo", "name": "Open-Meteo Forecast API", "provider": "Open-Meteo", "kind": "Fallback", "status": "operational", "latencyMs": 410, "lastSync": "3 min ago", "detail": "Free weather API — nowcast cross-check and IMD fallback."},
    {"id": "esp32-mqtt", "name": "ESP32 Nodes · MQTT (Mosquitto)", "provider": "JAL-DARPAAN IoT", "kind": "IoT", "status": "degraded", "latencyMs": 90, "lastSync": "4 s ago", "detail": "14 nodes on-air; 1 offline (VN-2204 planned node pending install), 1 low battery. ₹1,500–2,800/node."},
]

# --- Analytics / model metrics — port of data/backtest.ts

MODEL_METRICS: list[dict[str, Any]] = [
    {"label": "ROC AUC", "value": "0.87", "detail": "target > 0.80 ✓", "good": True},
    {"label": "Precision", "value": "0.83", "detail": "of issued alerts", "good": True},
    {"label": "Recall", "value": "0.89", "detail": "events caught", "good": True},
    {"label": "False-Alarm Rate", "value": "11%", "detail": "2-source rule cuts ~30%", "good": True},
    {"label": "Brier Score", "value": "0.09", "detail": "probability calibration", "good": True},
    {"label": "Median Lead Time", "value": "1 h 42 m", "detail": "1–3 h objective ✓", "good": True},
]

ROC_POINTS: list[dict[str, float]] = [
    {"fpr": 0, "tpr": 0}, {"fpr": 0.02, "tpr": 0.42}, {"fpr": 0.05, "tpr": 0.63},
    {"fpr": 0.09, "tpr": 0.74}, {"fpr": 0.14, "tpr": 0.81}, {"fpr": 0.22, "tpr": 0.87},
    {"fpr": 0.33, "tpr": 0.91}, {"fpr": 0.47, "tpr": 0.94}, {"fpr": 0.62, "tpr": 0.965},
    {"fpr": 0.78, "tpr": 0.985}, {"fpr": 1, "tpr": 1},
]

CONFUSION: dict[str, int] = {"tp": 71, "fp": 9, "fn": 6, "tn": 214}

FEATURE_IMPORTANCE: list[dict[str, Any]] = [
    {"feature": "Rain intensity 1 h (mm/h)", "value": 0.31},
    {"feature": "Soil saturation (%)", "value": 0.24},
    {"feature": "River level anomaly", "value": 0.17},
    {"feature": "Slope susceptibility (DEM)", "value": 0.12},
    {"feature": "Antecedent rain 24 h", "value": 0.09},
    {"feature": "Distance to stream", "value": 0.05},
    {"feature": "Landcover / geology", "value": 0.02},
]

BACKTESTS: list[dict[str, Any]] = [
    {
        "event": "Kedarnath Disaster", "year": 2013, "place": "Mandakini valley, Rudraprayag",
        "leadTimeHrs": 2.2, "villagesFlagged": "21 of 24 ≥ ORANGE", "peakRain": "212 mm / 24 h",
        "note": "Replayed IMD/IMERG rainfall of 16–17 Jun 2013 through the model: upper-watershed villages flagged CRITICAL 2 h 12 m before peak discharge.",
    },
    {
        "event": "Chamoli Flash Flood", "year": 2021, "place": "Dhauliganga & Alaknanda",
        "leadTimeHrs": 1.1, "villagesFlagged": "18 of 24 ≥ WARNING", "peakRain": "64 mm / 24 h + surge",
        "note": "Sediment-surge proxy (river-level anomaly feature) fired WARNING downstream of Chamoli 66 min before the Alaknanda rise reached Rudraprayag.",
    },
    {
        "event": "Sikkim GLOF", "year": 2023, "place": "Teesta III → Mangan (analogue)",
        "leadTimeHrs": 1.7, "villagesFlagged": "analogue villages ≥ ORANGE", "peakRain": "38 mm / 24 h + GLOF wave",
        "note": "GLOF-wave propagation analogue: multi-source river-anomaly rule crossed 1 h 40 m before wave arrival at downstream analogue gauges.",
    },
]

DISTRICT_CENTER = {"lng": 79.05, "lat": 30.46}

# Scenario metadata for the scenario drill UI
SCENARIO_META: dict[str, dict[str, str]] = {
    "normal": {"label": "Clear skies", "desc": "Dry-weather baseline · sensors nominal"},
    "monsoon": {"label": "Monsoon surge", "desc": "Sustained valley rainfall · WATCH/WARNING mix"},
    "cloudburst": {"label": "Cloudburst — Kedarnath-style", "desc": "Upper-watershed 60–90 mm/h burst · CRITICAL cascade"},
}
