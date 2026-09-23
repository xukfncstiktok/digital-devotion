/**
 * Simulation core: a daily human routine driven by activation spreading through
 * the real male-CNS cell types and synaptic connections loaded in malecns.ts.
 */
import {
  CONNECTIONS,
  MAX_WEIGHT,
  MODULES,
  MODULE_IDS,
  MODULE_OF,
  TYPES,
  TYPE_NAMES,
  type ModuleId,
} from "./malecns";

export type Phase =
  | "sleep"
  | "wake"
  | "work"
  | "break"
  | "meal"
  | "wudu"
  | "walk"
  | "pray"
  | "dhikr";

export type Posture = "lying" | "standing" | "walking" | "sitting" | "qiyam" | "ruku" | "sujud" | "jalsa";

export type Station = "bed" | "desk" | "basin" | "mat" | "kitchen";

export const STATIONS: Record<Station, [number, number]> = {
  bed: [-3.1, -2.4],
  desk: [2.35, -1.25],
  basin: [-3.2, 1.9],
  mat: [0.1, 1.5],
  kitchen: [3.2, 2.3],
};

/** Direction the agent faces when praying (qibla marker on the wall). */
export const QIBLA_YAW = -Math.PI * 0.62;

export type Prayer = { name: string; arabic: string; minute: number; rakat: number };

export const PRAYERS: Prayer[] = [
  { name: "Fajr", arabic: "الفجر", minute: 5 * 60 + 12, rakat: 2 },
  { name: "Dhuhr", arabic: "الظهر", minute: 12 * 60 + 20, rakat: 4 },
  { name: "Asr", arabic: "العصر", minute: 15 * 60 + 45, rakat: 4 },
  { name: "Maghrib", arabic: "المغرب", minute: 18 * 60 + 35, rakat: 3 },
  { name: "Isha", arabic: "العشاء", minute: 20 * 60 + 5, rakat: 4 },
];

const WORK_BLOCKS: [number, number][] = [
  [8 * 60, 12 * 60 + 10],
  [13 * 60 + 15, 17 * 60 + 30],
  [19 * 60 + 30, 20 * 60],
];
const MEALS = [7 * 60, 13 * 60 + 20, 19 * 60];
const BEDTIME = 22 * 60 + 30;

export type NeuralEvent = { t: number; text: string; module: ModuleId | "system" };

export type Snapshot = {
  minute: number;
  clock: string;
  day: number;
  phase: Phase;
  posture: Posture;
  activity: string;
  nextPrayer: Prayer;
  minutesToPrayer: number;
  activePrayer: Prayer | null;
  rakah: number;
  energy: number;
  focus: number;
  fatigue: number;
  prayersDone: number;
  activation: Record<string, number>;
  moduleActivity: Record<ModuleId, number>;
  events: NeuralEvent[];
  traffic: { s: string; t: string; w: number; flow: number }[];
  timeScale: number;
  paused: boolean;
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const damp = (cur: number, target: number, k: number, dt: number) =>
  target + (cur - target) * Math.exp(-k * dt);

function inWindow(min: number, blocks: [number, number][]) {
  return blocks.some(([a, b]) => min >= a && min < b);
}

export class Simulation {
  minute = 4 * 60 + 40;
  day = 1;
  timeScale = 30; // simulated minutes per real second
  paused = false;

  phase: Phase = "sleep";
  posture: Posture = "lying";
  activity = "Night sleep";
  station: Station = "bed";
  pos: [number, number] = [...STATIONS.bed] as [number, number];
  yaw = 0;
  moving = false;

  energy = 0.55;
  focus = 0.8;
  fatigue = 0.5;
  prayersDone = 0;

  rakah = 0;
  activePrayer: Prayer | null = null;
  private prayerDoneFlags = new Set<string>();
  private mealsDone = new Set<number>();
  private queue: { station: Station; phase: Phase; posture: Posture; label: string; until: number }[] = [];
  private stateUntil = 0; // simulated minute at which current activity ends
  private postureTimer = 0;
  private adhan = 0;

  activation: Record<string, number> = Object.fromEntries(TYPE_NAMES.map((t) => [t, 0.02]));
  moduleActivity = Object.fromEntries(MODULE_IDS.map((m) => [m, 0])) as Record<ModuleId, number>;
  events: NeuralEvent[] = [];
  traffic: { s: string; t: string; w: number; flow: number }[] = [];

  private fired = new Set<string>();

  get clock() {
    const h = Math.floor(this.minute / 60) % 24;
    const m = Math.floor(this.minute % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  nextPrayer(): { prayer: Prayer; delta: number } {
    for (const p of PRAYERS) if (p.minute > this.minute) return { prayer: p, delta: p.minute - this.minute };
    return { prayer: PRAYERS[0], delta: 24 * 60 - this.minute + PRAYERS[0].minute };
  }

  private log(text: string, module: ModuleId | "system") {
    this.events.unshift({ t: this.minute, text, module });
    if (this.events.length > 60) this.events.pop();
  }

  private beginPrayer(p: Prayer) {
    this.prayerDoneFlags.add(`${this.day}-${p.name}`);
    this.activePrayer = p;
    this.adhan = 1;
    this.log(`Adhan for ${p.name} detected - AMMC/WED auditory input`, "hearing");
    this.log(`Clock network raises priority: interrupt current task`, "circadian");
    this.queue = [
      { station: "basin", phase: "wudu", posture: "standing", label: `Wudu before ${p.name}`, until: 4 },
      { station: "mat", phase: "pray", posture: "qiyam", label: `Praying ${p.name} (${p.rakat} rakʿah)`, until: 2.2 * p.rakat },
      { station: "mat", phase: "dhikr", posture: "jalsa", label: "Dhikr after prayer", until: 3 },
    ];
    this.advanceQueue();
  }

  private advanceQueue() {
    const next = this.queue.shift();
    if (!next) {
      this.activePrayer = null;
      this.rakah = 0;
      this.prayersDone += 1;
      this.stateUntil = this.minute;
      this.phase = "walk";
      this.decideRoutine();
      return;
    }
    this.station = next.station;
    this.phase = "walk";
    this.posture = "walking";
    this.activity = `Walking: ${next.label}`;
    this.pendingArrival = next;
  }

  private pendingArrival:
    | { station: Station; phase: Phase; posture: Posture; label: string; until: number }
    | null = null;

  private decideRoutine() {
    const min = this.minute;
    if (min >= BEDTIME || min < 4 * 60 + 40) {
      this.setActivity("bed", "sleep", "lying", "Night sleep", 60);
      return;
    }
    const meal = MEALS.find((m) => min >= m && min < m + 30 && !this.mealsDone.has(m));
    if (meal !== undefined) {
      this.mealsDone.add(meal);
      this.setActivity("kitchen", "meal", "sitting", "Meal - refuelling", 20);
      return;
    }
    if (this.energy < 0.18) {
      this.setActivity("bed", "break", "lying", "Short rest - sleep pressure high", 25);
      return;
    }
    if (inWindow(min, WORK_BLOCKS)) {
      this.setActivity("desk", "work", "sitting", "Working at the desk", 25);
      return;
    }
    this.setActivity("desk", "break", "standing", "Off-task: resting, looking around", 15);
  }

  private setActivity(station: Station, phase: Phase, posture: Posture, label: string, dur: number) {
    if (this.station !== station) {
      this.phase = "walk";
      this.posture = "walking";
      this.activity = `Walking to ${station}`;
      this.station = station;
      this.pendingArrival = { station, phase, posture, label, until: dur };
    } else {
      this.phase = phase;
      this.posture = posture;
      this.activity = label;
      this.stateUntil = this.minute + dur;
      this.pendingArrival = null;
    }
  }

  step(dtReal: number) {
    if (this.paused) return;
    const dt = Math.min(dtReal, 0.1);
    const dMin = dt * this.timeScale;
    this.minute += dMin;
    if (this.minute >= 24 * 60) {
      this.minute -= 24 * 60;
      this.day += 1;
      this.mealsDone.clear();
    }

    // --- prayer interrupt --------------------------------------------------
    for (const p of PRAYERS) {
      const key = `${this.day}-${p.name}`;
      if (this.minute >= p.minute && this.minute < p.minute + 45 && !this.prayerDoneFlags.has(key)) {
        this.beginPrayer(p);
        break;
      }
    }

    // --- locomotion --------------------------------------------------------
    const target = STATIONS[this.station];
    const dx = target[0] - this.pos[0];
    const dz = target[1] - this.pos[1];
    const dist = Math.hypot(dx, dz);
    this.moving = dist > 0.12;
    if (this.moving) {
      const speed = 1.35;
      const step = Math.min(dist, speed * dt);
      this.pos[0] += (dx / dist) * step;
      this.pos[1] += (dz / dist) * step;
      const want = Math.atan2(dx, dz);
      let diff = ((want - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.yaw += diff * Math.min(1, dt * 6);
    } else if (this.pendingArrival) {
      const a = this.pendingArrival;
      this.pendingArrival = null;
      this.phase = a.phase;
      this.posture = a.posture;
      this.activity = a.label;
      this.stateUntil = this.minute + a.until;
      if (a.phase === "wudu") this.log("DNg12 grooming command sequence engaged (wudu)", "grooming");
      if (a.phase === "pray") {
        this.rakah = 1;
        this.postureTimer = 0;
        this.log("EPG compass locked to qibla bearing", "heading");
      }
    } else {
      // face a sensible direction while stationary
      const want =
        this.phase === "pray" || this.phase === "dhikr"
          ? QIBLA_YAW
          : this.station === "desk"
            ? Math.PI
            : this.station === "bed"
              ? Math.PI / 2
              : this.yaw;
      let diff = ((want - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.yaw += diff * Math.min(1, dt * 4);
    }

    // --- prayer posture cycle ---------------------------------------------
    if (this.phase === "pray" && !this.moving) {
      this.postureTimer += dMin;
      const cycle = 2.2; // simulated minutes per rakʿah
      const p = (this.postureTimer % cycle) / cycle;
      const prev = this.posture;
      this.posture = p < 0.4 ? "qiyam" : p < 0.55 ? "ruku" : p < 0.78 ? "sujud" : p < 0.9 ? "jalsa" : "sujud";
      this.rakah = Math.min((this.activePrayer?.rakat ?? 1), Math.floor(this.postureTimer / cycle) + 1);
      if (prev !== this.posture) {
        const names: Record<string, string> = {
          qiyam: "Qiyam - standing recitation",
          ruku: "Rukuʿ - bowing",
          sujud: "Sujud - prostration",
          jalsa: "Jalsa - sitting between prostrations",
        };
        this.log(`${names[this.posture]} (rakʿah ${this.rakah})`, "locomotion");
      }
    }

    // --- activity completion ----------------------------------------------
    if (!this.moving && !this.pendingArrival && this.minute >= this.stateUntil) {
      if (this.queue.length || this.activePrayer) this.advanceQueue();
      else this.decideRoutine();
    }

    // --- physiology ---------------------------------------------------------
    const working = this.phase === "work";
    const resting = this.phase === "sleep" || this.phase === "break";
    this.energy = clamp(
      this.energy + dt * (resting ? 0.035 : this.phase === "meal" ? 0.09 : working ? -0.016 : -0.008),
    );
    this.fatigue = clamp(1 - this.energy * 0.8 - (this.phase === "sleep" ? 0.2 : 0));
    this.focus = clamp(
      damp(this.focus, working ? 0.45 + this.energy * 0.5 : this.phase === "pray" ? 0.95 : 0.3, 0.6, dt),
    );

    this.adhan = Math.max(0, this.adhan - dt * 0.25);
    this.updateBrain(dt);
  }

  // ---------------------------------------------------------------------------
  private drive(): Record<ModuleId, number> {
    const ph = this.phase;
    const d: Record<ModuleId, number> = {
      circadian: 0.2 + 0.5 * this.adhan + (ph === "sleep" ? 0.35 : 0.1),
      vision: ph === "sleep" ? 0.03 : ph === "work" ? 0.75 : this.moving ? 0.6 : 0.4,
      hearing: 0.12 + 0.8 * this.adhan,
      heading: this.moving ? 0.8 : ph === "pray" || ph === "dhikr" ? 0.62 : 0.15,
      grooming: ph === "wudu" ? 0.95 : 0.05,
      locomotion: this.moving ? 0.9 : ph === "pray" ? (this.posture === "qiyam" ? 0.25 : 0.55) : 0.08,
      valuation: ph === "work" ? 0.55 + this.focus * 0.35 : ph === "pray" ? 0.7 : ph === "meal" ? 0.6 : 0.2,
      sleep: ph === "sleep" ? 0.9 : 0.1 + this.fatigue * 0.5,
      olfaction: ph === "meal" ? 0.85 : ph === "wudu" ? 0.45 : 0.08,
    };
    return d;
  }

  private updateBrain(dt: number) {
    const drive = this.drive();
    const act = this.activation;

    // one step of activation spread across the real synaptic connections
    const input: Record<string, number> = {};
    const traffic: { s: string; t: string; w: number; flow: number }[] = [];
    for (const c of CONNECTIONS) {
      const a = act[c.s] ?? 0;
      const w = c.w / MAX_WEIGHT;
      const flow = a * w;
      input[c.t] = (input[c.t] ?? 0) + flow;
      if (flow > 0.01) traffic.push({ ...c, flow });
    }
    traffic.sort((a, b) => b.flow - a.flow);
    this.traffic = traffic.slice(0, 24);

    const moduleSum = Object.fromEntries(MODULE_IDS.map((m) => [m, 0])) as Record<ModuleId, number>;
    const moduleN = Object.fromEntries(MODULE_IDS.map((m) => [m, 0])) as Record<ModuleId, number>;

    for (const name of TYPE_NAMES) {
      const mod = MODULE_OF[name];
      const base = drive[mod] ?? 0.05;
      const noise = (Math.random() - 0.5) * 0.14;
      const target = clamp(base * (0.75 + 0.5 * Math.random()) + (input[name] ?? 0) * 0.55 + noise);
      const prev = act[name];
      act[name] = damp(prev, target, 3.2, dt);
      if (prev < 0.62 && act[name] >= 0.62 && !this.fired.has(name)) {
        this.fired.add(name);
        const t = TYPES[name];
        this.log(
          `${name} firing (${t.count} cells, ${t.class ?? "?"}, ${t.nt ?? "nt n/a"})`,
          mod,
        );
        setTimeout(() => this.fired.delete(name), 4000);
      }
      moduleSum[mod] += act[name];
      moduleN[mod] += 1;
    }
    for (const m of MODULE_IDS) this.moduleActivity[m] = moduleSum[m] / Math.max(1, moduleN[m]);
  }

  snapshot(): Snapshot {
    const { prayer, delta } = this.nextPrayer();
    return {
      minute: this.minute,
      clock: this.clock,
      day: this.day,
      phase: this.phase,
      posture: this.posture,
      activity: this.activity,
      nextPrayer: prayer,
      minutesToPrayer: delta,
      activePrayer: this.activePrayer,
      rakah: this.rakah,
      energy: this.energy,
      focus: this.focus,
      fatigue: this.fatigue,
      prayersDone: this.prayersDone,
      activation: { ...this.activation },
      moduleActivity: { ...this.moduleActivity },
      events: this.events.slice(0, 40),
      traffic: this.traffic,
      timeScale: this.timeScale,
      paused: this.paused,
    };
  }
}

export const sim = new Simulation();

export const moduleColor = (m: ModuleId | "system") =>
  m === "system" ? "#94a3b8" : MODULES[m].color;

export function formatClock(minute: number) {
  const h = Math.floor(minute / 60) % 24;
  const m = Math.floor(minute % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
