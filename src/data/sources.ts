import type { SourceStatus } from '../types';

export const DATA_SOURCES: SourceStatus[] = [
  {
    id: 'imd-aws', name: 'IMD AWS (Automatic Weather Stations)', provider: 'IMD · MoES', kind: 'Station',
    status: 'degraded', latencyMs: 1420, lastSync: '14 min ago',
    detail: 'Real-time portal restricted (Oct 2025). District feed via MoU; ~1,008 AWS network mapped for pilot.',
  },
  {
    id: 'imd-arg', name: 'IMD ARG (Rain Gauges)', provider: 'IMD · MoES', kind: 'Station',
    status: 'fallback', latencyMs: 3600, lastSync: '1 h 10 min ago',
    detail: 'Gridded rainfall + Open-Meteo running as fallback while portal access is pending.',
  },
  {
    id: 'cwc-aff', name: 'CWC Flood Forecast (AFF)', provider: 'CWC', kind: 'Station',
    status: 'operational', latencyMs: 640, lastSync: '9 min ago',
    detail: '~338 forecast sites; Chandrapuri & Rudraprayag gauge levels ingested hourly.',
  },
  {
    id: 'india-wris', name: 'India-WRIS / NWIC Telemetry', provider: 'ISRO-NRSC · CWC', kind: 'Station',
    status: 'operational', latencyMs: 780, lastSync: '11 min ago',
    detail: 'Open hourly river telemetry — primary river-level feed for the pilot valley.',
  },
  {
    id: 'gpm-imerg', name: 'GPM IMERG Satellite Rainfall', provider: 'NASA', kind: 'Satellite',
    status: 'operational', latencyMs: 2100, lastSync: '6 min ago',
    detail: '30-min global rainfall estimates — primary independent confirmation source.',
  },
  {
    id: 'smap-l4', name: 'NASA SMAP L4 Soil Moisture', provider: 'NASA', kind: 'Satellite',
    status: 'operational', latencyMs: 5400, lastSync: '52 min ago',
    detail: '9 km soil moisture product; used where ESP32 probes are absent.',
  },
  {
    id: 'sentinel-1', name: 'Sentinel-1 SAR', provider: 'ESA Copernicus', kind: 'Satellite',
    status: 'operational', latencyMs: 9800, lastSync: '2 h ago',
    detail: 'Radar change detection for inundation extent after events.',
  },
  {
    id: 'cop-dem', name: 'Copernicus DEM 30 m', provider: 'ESA Copernicus', kind: 'Terrain',
    status: 'operational', latencyMs: 300, lastSync: 'cached',
    detail: 'Slope, micro-watershed delineation & susceptibility for all 24 villages.',
  },
  {
    id: 'gsi-bhukosh', name: 'GSI Bhukosh Landslide Inventory', provider: 'GSI', kind: 'Inventory',
    status: 'operational', latencyMs: 1200, lastSync: '1 d ago',
    detail: 'Historical landslide/flood labels feeding the risk model & history weight.',
  },
  {
    id: 'open-meteo', name: 'Open-Meteo Forecast API', provider: 'Open-Meteo', kind: 'Fallback',
    status: 'operational', latencyMs: 410, lastSync: '3 min ago',
    detail: 'Free weather API — nowcast cross-check and IMD fallback.',
  },
  {
    id: 'esp32-mqtt', name: 'ESP32 Nodes · MQTT (Mosquitto)', provider: 'JAL-DARPAAN IoT', kind: 'IoT',
    status: 'degraded', latencyMs: 90, lastSync: '4 s ago',
    detail: '14 nodes on-air; 1 offline (VN-2204 planned node pending install), 1 low battery. ₹1,500–2,800/node.',
  },
];
