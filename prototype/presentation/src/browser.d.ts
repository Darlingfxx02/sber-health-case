import type { DemoBridge } from "./core/adapter";
declare global {
  interface Window {
    caseBridge?: DemoBridge;
  }
}
export {};
