import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import { Layers, MapPin, Mountain, Satellite } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { VillageLive } from '../types';
import { VILLAGES } from '../data/villages';
import { BANDS } from '../lib/risk';

interface Props {
  live: Record<string, VillageLive>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Esri World Imagery — free, no API key, real satellite basemap. */
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics · Terrain: Mapzen/AWS · © MapLibre',
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'esri' }],
};

const BAND_CLASS: Record<VillageLive['band'], string> = {
  SAFE: 'is-green',
  WATCH: 'is-yellow',
  WARNING: 'is-orange',
  CRITICAL: 'is-red',
};

interface MarkerRefs {
  marker: maplibregl.Marker;
  el: HTMLDivElement;
  metric: HTMLElement;
}

export default function MapPanel({ live, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerRefs>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<'2d' | '3d'>('2d');

  // ---- init map + static markers -----------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: SATELLITE_STYLE,
      center: [79.05, 30.46],
      zoom: 9.55,
      attributionControl: { compact: false },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('load', () => {
      // Mapzen/AWS terrarium DEM — powers hillshade (2D) + real 3D terrain (no API key)
      map.addSource('terrain-dem', {
        type: 'raster-dem',
        encoding: 'terrarium',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 13,
      });
      map.addLayer({
        id: 'hillshade',
        type: 'hillshade',
        source: 'terrain-dem',
        paint: {
          'hillshade-exaggeration': 0.25,
          'hillshade-shadow-color': '#081120',
          'hillshade-highlight-color': '#e8f0fa',
        },
      });
      setLoaded(true);
    });

    for (const v of VILLAGES) {
      const el = document.createElement('div');
      el.className = 'vmarker';
      el.title = `${v.name} — click for drill-down`;

      const dotwrap = document.createElement('div');
      dotwrap.className = 'dotwrap';
      const pulse = document.createElement('div');
      pulse.className = 'pulse';
      const dot = document.createElement('div');
      dot.className = 'dot';
      dotwrap.append(pulse, dot);

      const label = document.createElement('div');
      label.className = 'label';
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = v.name;
      const metric = document.createElement('span');
      metric.className = 'metric';
      metric.textContent = '…';
      label.append(name, metric);

      el.append(dotwrap, label);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectRef.current(v.id);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([v.lng, v.lat])
        .addTo(map);
      markersRef.current.set(v.id, { marker, el, metric });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      setLoaded(false);
    };
  }, []);

  // ---- live marker refresh (band class + rain chip) -----------------------
  useEffect(() => {
    for (const [id, m] of markersRef.current) {
      const l = live[id];
      if (!l) continue;
      m.el.classList.remove('is-green', 'is-yellow', 'is-orange', 'is-red');
      m.el.classList.add(BAND_CLASS[l.band]);
      m.metric.textContent = `${l.rainMmHr.toFixed(1)} mm/h`;
    }
  }, [live]);

  // ---- selection highlight + gentle fly-to --------------------------------
  useEffect(() => {
    for (const [id, m] of markersRef.current) {
      m.el.classList.toggle('is-selected', id === selectedId);
    }
    const map = mapRef.current;
    if (!map || !loaded || !selectedId) return;
    const v = VILLAGES.find((x) => x.id === selectedId);
    if (v) {
      map.easeTo({ center: [v.lng, v.lat], zoom: Math.max(map.getZoom(), 10.4), duration: 900 });
    }
  }, [selectedId, loaded]);

  // ---- 2D ⇄ 3D terrain mode ----------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (mode === '3d') {
      map.setTerrain({ source: 'terrain-dem', exaggeration: 1.35 });
      map.setSky({
        'sky-color': '#0e1a2e',
        'horizon-color': '#2b4a6f',
        'fog-color': '#0b1626',
        'sky-horizon-blend': 0.6,
        'horizon-fog-blend': 0.7,
        'fog-ground-blend': 0.6,
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0, 10, 0.6, 12, 1],
      });
      map.easeTo({ pitch: 62, zoom: 10.35, duration: 1400 });
    } else {
      map.setTerrain(null);
      map.setSky({ 'atmosphere-blend': 0 });
      map.easeTo({ pitch: 0, zoom: 9.55, duration: 1200 });
    }
  }, [mode, loaded]);

  return (
    <div className="panel relative overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-aqua-300" />
          <h3 className="panel-title">Live risk map · Rudraprayag, Mandakini valley</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 font-mono text-[10.5px] text-emerald-300 sm:flex">
            <Satellite size={11} className="live-dot" /> Esri imagery + CDEM 30 m
          </span>
          <div className="flex overflow-hidden rounded-lg border border-white/12">
            <button
              onClick={() => setMode('2d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold transition ${
                mode === '2d' ? 'bg-aqua-500 text-ink-950' : 'bg-white/[0.04] text-fog-300 hover:bg-white/[0.09]'
              }`}
            >
              <Layers size={12} /> 2D
            </button>
            <button
              onClick={() => setMode('3d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold transition ${
                mode === '3d' ? 'bg-aqua-500 text-ink-950' : 'bg-white/[0.04] text-fog-300 hover:bg-white/[0.09]'
              }`}
            >
              <Mountain size={12} /> 3D terrain
            </button>
          </div>
        </div>
      </div>

      {/* map canvas */}
      <div ref={containerRef} className="relative h-[520px] w-full md:h-[560px]" />

      {/* legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-white/12 bg-ink-950/85 px-3 py-2 backdrop-blur-sm">
        {(['SAFE', 'WATCH', 'WARNING', 'CRITICAL'] as const).map((b) => (
          <span key={b} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-fog-300">
            <span className="h-2.5 w-2.5 rounded-full border border-white/60" style={{ background: BANDS[b].hex }} />
            {b}
          </span>
        ))}
        <span className="hidden items-center gap-1.5 text-[10px] text-fog-400 md:flex">
          <span className="live-dot text-red-400">●</span> pulse = WARNING+ · click a village to drill down
        </span>
      </div>
    </div>
  );
}
