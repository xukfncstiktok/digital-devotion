/**
 * Male CNS connectome data layer.
 *
 * Source: natverse/malecns (https://github.com/natverse/malecns) which indexes
 * the Janelia FlyEM male CNS volume, and the underlying neuPrint dataset
 * `male-cns:v1.0`. All cell types, classes, superclasses, predicted
 * neurotransmitters, soma coordinates and synaptic weights in
 * `src/data/malecns.json` were exported from that dataset - nothing is invented.
 */
import raw from "../data/malecns.json";

export type CellType = {
  type: string;
  count: number;
  class: string | null;
  superclass: string | null;
  nt: string | null;
  pre: number;
  post: number;
  soma: number[][];
};

export type Connection = { s: string; t: string; w: number };

export type ModuleId =
  | "circadian"
  | "vision"
  | "hearing"
  | "heading"
  | "grooming"
  | "locomotion"
  | "valuation"
  | "sleep"
  | "olfaction";

type RawData = {
  dataset: string;
  source: string;
  modules: Record<string, string[]>;
  types: Record<string, CellType>;
  connections: Connection[];
  cloud: [number, number, number, string][];
};

const data = raw as unknown as RawData;

export const DATASET = data.dataset;
export const SOURCE = data.source;
export const TYPES = data.types;
export const CONNECTIONS = data.connections;
export const CLOUD = data.cloud;
export const TYPE_NAMES = Object.keys(TYPES);

/** Fly circuit -> human-behaviour analogue used by the simulation. */
export const MODULES: Record<
  ModuleId,
  { label: string; flyRole: string; humanRole: string; color: string; types: string[] }
> = {
  circadian: {
    label: "Clock network",
    flyRole: "Circadian pacemaker neurons (LNv / LNd / DN1) driving daily rhythm",
    humanRole: "Tracks the time of day and raises the prayer-time priority signal",
    color: "#f5b942",
    types: data.modules["circadian"] ?? [],
  },
  vision: {
    label: "Visual system",
    flyRole: "Photoreceptors, lamina/medulla columns and lobula projection neurons",
    humanRole: "Reads the wall clock, the desk, the doorway and the prayer mat",
    color: "#59c3f0",
    types: data.modules["vision"] ?? [],
  },
  hearing: {
    label: "Auditory / mechanosensory",
    flyRole: "AMMC and wedge neurons receiving Johnston's-organ input",
    humanRole: "Hears the alarm and the adhan call to prayer",
    color: "#b58bf0",
    types: data.modules["hearing"] ?? [],
  },
  heading: {
    label: "Central complex heading",
    flyRole: "EPG compass, PEN/PEG shifters, Delta7 and PFL steering output",
    humanRole: "Holds a body-centred bearing: walking routes and facing the qibla",
    color: "#4fe0b0",
    types: data.modules["heading"] ?? [],
  },
  grooming: {
    label: "Grooming command",
    flyRole: "DNg12 descending grooming command neurons",
    humanRole: "Sequenced washing of hands, face, arms, head and feet (wudu)",
    color: "#7fd4ff",
    types: data.modules["grooming"] ?? [],
  },
  locomotion: {
    label: "Descending locomotor",
    flyRole: "DNa/DNp/DNg descending neurons and MDN stopping/backward command",
    humanRole: "Walking to the desk, the basin and the prayer mat; posture changes",
    color: "#ff8a5c",
    types: data.modules["locomotion"] ?? [],
  },
  valuation: {
    label: "Mushroom body valuation",
    flyRole: "Kenyon cells, MBON output and dopaminergic PAM/PPL neurons",
    humanRole: "Task focus, intention and switching priority away from work",
    color: "#ff6f9c",
    types: data.modules["valuation"] ?? [],
  },
  sleep: {
    label: "Sleep homeostat",
    flyRole: "ER5 ring neurons and fan-shaped body sleep-promoting cells",
    humanRole: "Accumulates fatigue, drives rest and night sleep",
    color: "#8f9bff",
    types: data.modules["sleep"] ?? [],
  },
  olfaction: {
    label: "Olfactory pathway",
    flyRole: "Olfactory receptor neurons and antennal-lobe projection neurons",
    humanRole: "Smell of food and water; meal motivation",
    color: "#c9e265",
    types: data.modules["olfaction"] ?? [],
  },
};

export const MODULE_IDS = Object.keys(MODULES) as ModuleId[];

export const MODULE_OF: Record<string, ModuleId> = (() => {
  const m: Record<string, ModuleId> = {};
  for (const id of MODULE_IDS) for (const t of MODULES[id].types) m[t] = id;
  return m;
})();

export const MAX_WEIGHT = CONNECTIONS.reduce((a, c) => Math.max(a, c.w), 1);
