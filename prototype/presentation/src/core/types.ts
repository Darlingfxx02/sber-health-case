export type Rect = { x: number; y: number; width: number; height: number };
export type Pose = "right" | "left" | "center" | "focus-top" | "focus-bottom";
export type Device = {
  id: string;
  label: string;
  kind?: string;
  shell?: { width: number; height: number; screen: Rect; radius: string };
  width: number;
  height: number;
  radius: number;
  frame?: string;
  inset?: number;
};
export type Action =
  | { type: "tap"; target: string }
  | { type: "swipe"; target: string; distance: number; duration?: number };
export type Scene = {
  id: string;
  title: string;
  body: string[];
  state: string;
  pose: Pose;
  zoom?: number;
  device: string;
  focus?: string[];
  action?: Action;
  after?: string;
  duration: number;
};
export type GestureFrame = { x: number; y: number; progress: number };
export type GestureEffect = {
  update(frame: GestureFrame): void;
  dispose(): void;
};
export type AppAdapter = {
  ready(signal: AbortSignal): Promise<void>;
  enter(state: string, signal: AbortSignal): Promise<void>;
  find(target: string, signal: AbortSignal): Promise<HTMLElement>;
  settled(anchor: string | undefined, signal: AbortSignal): Promise<void>;
  interact(action: Action, signal: AbortSignal): Promise<void>;
  swipe(
    target: HTMLElement,
    distance: number,
    duration: number,
    signal: AbortSignal,
    draw: (frame: GestureFrame) => void,
  ): Promise<void>;
  describe(): { title: string; body: string[] } | null;
};
export type Effects = {
  tap(target: HTMLElement, signal: AbortSignal): Promise<void>;
  swipe(target: HTMLElement): GestureEffect;
  focus(targets: HTMLElement[]): () => void;
};
export type Layout = (
  width: number,
  height: number,
  pose: Pose,
  device: Device,
  zoom?: number,
) => { text: Rect; device: Rect };
export type CaseConfig = {
  title: string;
  intro: string;
  appUrl: string;
  mobile: "prototype" | "presentation";
  devices: Device[];
  scenes: Scene[];
  motion: { camera: number; actionDelay: number };
  createAdapter: (frame: HTMLIFrameElement) => AppAdapter;
  effects: Effects;
  layout?: Layout;
};
