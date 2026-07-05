export interface System {
  sysid: string;        // 6 random uppercase letters, e.g. "QXMVPA"
  name?: string;        // optional; sysid used as display fallback
  x: number;            // 2 decimal places
  y: number;            // 2 decimal places
  z: number;            // 2 decimal places, stored for future 3D use
  color?: string;
  size?: number;
  faction?: string;
  type?: string;        // e.g. "Blue Giant", "Red Dwarf", "Yellow"
}

export interface TradeLine {
  id: string;
  from: string;         // sysid
  to: string;           // sysid
  color?: string;
  width?: number;
  dashed?: boolean;
  label?: string;
  volume?: 'low' | 'medium' | 'high';
}

export interface StarMapData {
  systems: System[];
  tradeLines: TradeLine[];
}

export interface ViewportState {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

/** Generate a random 6-character uppercase letter code (letters only). */
export function generateSysId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Round a number to 2 decimal places. */
export function to2dp(n: number): number {
  return Math.round(n * 100) / 100;
}
