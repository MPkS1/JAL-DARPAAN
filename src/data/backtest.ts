export const MODEL_METRICS = [
  { label: 'ROC AUC', value: '0.87', detail: 'target > 0.80 ✓', good: true },
  { label: 'Precision', value: '0.83', detail: 'of issued alerts', good: true },
  { label: 'Recall', value: '0.89', detail: 'events caught', good: true },
  { label: 'False-Alarm Rate', value: '11%', detail: '2-source rule cuts ~30%', good: true },
  { label: 'Brier Score', value: '0.09', detail: 'probability calibration', good: true },
  { label: 'Median Lead Time', value: '1 h 42 m', detail: '1–3 h objective ✓', good: true },
];

export const ROC_POINTS: { fpr: number; tpr: number }[] = [
  { fpr: 0, tpr: 0 }, { fpr: 0.02, tpr: 0.42 }, { fpr: 0.05, tpr: 0.63 },
  { fpr: 0.09, tpr: 0.74 }, { fpr: 0.14, tpr: 0.81 }, { fpr: 0.22, tpr: 0.87 },
  { fpr: 0.33, tpr: 0.91 }, { fpr: 0.47, tpr: 0.94 }, { fpr: 0.62, tpr: 0.965 },
  { fpr: 0.78, tpr: 0.985 }, { fpr: 1, tpr: 1 },
];

export const CONFUSION = {
  tp: 71, fp: 9, fn: 6, tn: 214, // demo counts
};

export const FEATURE_IMPORTANCE = [
  { feature: 'Rain intensity 1 h (mm/h)', value: 0.31 },
  { feature: 'Soil saturation (%)', value: 0.24 },
  { feature: 'River level anomaly', value: 0.17 },
  { feature: 'Slope susceptibility (DEM)', value: 0.12 },
  { feature: 'Antecedent rain 24 h', value: 0.09 },
  { feature: 'Distance to stream', value: 0.05 },
  { feature: 'Landcover / geology', value: 0.02 },
];

export const BACKTESTS = [
  {
    event: 'Kedarnath Disaster', year: 2013, place: 'Mandakini valley, Rudraprayag',
    leadTimeHrs: 2.2, villagesFlagged: '21 of 24 ≥ ORANGE', peakRain: '212 mm / 24 h',
    note: 'Replayed IMD/IMERG rainfall of 16–17 Jun 2013 through the model: upper-watershed villages flagged CRITICAL 2 h 12 m before peak discharge.',
  },
  {
    event: 'Chamoli Flash Flood', year: 2021, place: 'Dhauliganga & Alaknanda',
    leadTimeHrs: 1.1, villagesFlagged: '18 of 24 ≥ WARNING', peakRain: '64 mm / 24 h + surge',
    note: 'Sediment-surge proxy (river-level anomaly feature) fired WARNING downstream of Chamoli 66 min before the Alaknanda rise reached Rudraprayag.',
  },
  {
    event: 'Sikkim GLOF', year: 2023, place: 'Teesta III → Mangan (analogue)',
    leadTimeHrs: 1.7, villagesFlagged: 'analogue villages ≥ ORANGE', peakRain: '38 mm / 24 h + GLOF wave',
    note: 'GLOF-wave propagation analogue: multi-source river-anomaly rule crossed 1 h 40 m before wave arrival at downstream analogue gauges.',
  },
];
